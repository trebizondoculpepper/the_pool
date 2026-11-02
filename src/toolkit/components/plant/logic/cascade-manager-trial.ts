import type {
  CascadeBoilerState,
  CascadeEdit,
  CascadeManagerView,
  CascadeRotation,
  PlantEnable,
} from './cascade-manager';

/**
 * A stand-in sequencer for the development rooms (mission 122): six
 * boilers under a common header, a load that wanders, a PI loop on the
 * header making a firing demand, boilers staged on and off after their
 * delays, each running its burner's sequence (called, purge, ignition,
 * firing, pump overrun). Only so dev0 and dev39 can show the Hamwarmy
 * CM6 working before the boiler house's own sequencer (mission 121) is
 * bound to it; it is not the plant's model. Pure.
 */

export interface TrialBoiler {
  state: CascadeBoilerState;
  /** Seconds in this state. */
  for: number;
  rate: number;
  flowC: number;
  hours: number;
  starts: number;
  /** Seconds since its burner last lit. */
  ran: number;
  tripped: boolean;
}

export interface CascadeTrial {
  time: number;
  enable: PlantEnable;
  running: boolean;
  headerC: number;
  setpointC: number;
  demand: number;
  /** The PI loop's integral term, 0 to 1. */
  integral: number;
  rotation: CascadeRotation;
  fixedLead: number;
  lead: number;
  stageUpS: number;
  stageDownS: number;
  minRunS: number;
  /** Seconds since the last boiler was staged on or off. */
  sinceStage: number;
  boilers: TrialBoiler[];
  trend: number[];
  sinceSample: number;
}

/** The trend's sampling: a reading every 20 s, 108 of them, 36 minutes. */
export const TRIAL_SAMPLE_S = 20;
export const TRIAL_SAMPLES = 108;

const CALL_S = 3;
const PURGE_S = 8;
const IGNITION_S = 4;
const OVERRUN_S = 30;

export function newCascadeTrial(boilers = 6): CascadeTrial {
  return {
    time: 8 * 3600,
    enable: 'auto',
    running: true,
    headerC: 72,
    setpointC: 80,
    demand: 0.3,
    integral: 0.3,
    rotation: 'hours',
    fixedLead: 0,
    lead: 0,
    stageUpS: 120,
    stageDownS: 180,
    minRunS: 300,
    sinceStage: 0,
    boilers: Array.from({ length: boilers }, (_, i) => ({
      state: 'standby',
      for: 0,
      rate: 0,
      flowC: 60,
      hours: 11800 + ((i * 2731) % 1900),
      starts: 3400 + ((i * 577) % 800),
      ran: 0,
      tripped: false,
    })),
    trend: Array.from({ length: TRIAL_SAMPLES }, (_, k) => 66 + k * 0.08),
    sinceSample: 0,
  };
}

/** The heat the buildings take, 0 to 1 of the plant's output, wandering. */
const load = (t: number) =>
  0.42 + 0.22 * Math.sin(t / 900) + 0.08 * Math.sin(t / 131);

const lit = (b: TrialBoiler) => b.state === 'firing';
const inService = (b: TrialBoiler) =>
  b.state === 'called' ||
  b.state === 'purge' ||
  b.state === 'ignition' ||
  b.state === 'firing';

/** The order boilers are brought on in: the lead first, then round. */
function order(s: CascadeTrial) {
  const n = s.boilers.length;
  return Array.from({ length: n }, (_, k) => (s.lead + k) % n);
}

function chooseLead(s: CascadeTrial) {
  const n = s.boilers.length;
  const ok = (i: number) =>
    !s.boilers[i].tripped && s.boilers[i].state !== 'off';
  let lead = s.lead;
  if (s.rotation === 'fixed') lead = s.fixedLead;
  else {
    let best = -1;
    s.boilers.forEach((b, i) => {
      if (ok(i) && (best < 0 || b.hours < s.boilers[best].hours)) best = i;
    });
    if (best >= 0) lead = best;
  }
  // A locked-out lead is passed over, the next promoted.
  for (let k = 0; k < n && !ok(lead); k++) lead = (lead + 1) % n;
  s.lead = lead;
}

/** One step of `dt` seconds. */
export function stepCascadeTrial(s: CascadeTrial, dt: number): CascadeTrial {
  const n = s.boilers.length;
  const t = { ...s, boilers: s.boilers.map((b) => ({ ...b })) };
  t.time += dt;
  t.sinceStage += dt;
  const enabled = t.enable === 'hand' || (t.enable === 'auto' && t.running);
  if (!t.boilers.some(inService)) chooseLead(t);
  // The PI loop on the header: the demand rises while it is below its set point.
  const error = t.setpointC - t.headerC;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  t.integral = enabled ? clamp(t.integral + dt * error * 0.0004) : 0;
  t.demand = enabled ? clamp(t.integral + error * 0.04) : 0;
  const wanted = t.enable === 'hand' ? n : Math.ceil(t.demand * n - 0.15);
  const active = order(t).filter((i) => inService(t.boilers[i]));
  if (enabled && wanted > active.length && t.sinceStage >= t.stageUpS) {
    const next = order(t).find(
      (i) => t.boilers[i].state === 'standby' && !t.boilers[i].tripped,
    );
    if (next !== undefined) {
      t.boilers[next].state = 'called';
      t.boilers[next].for = 0;
      t.sinceStage = 0;
    }
  } else if (
    active.length &&
    (!enabled || (wanted < active.length && t.sinceStage >= t.stageDownS))
  ) {
    const last = active[active.length - 1];
    const b = t.boilers[last];
    if (!enabled || b.ran >= t.minRunS) {
      for (const i of enabled ? [last] : active) {
        t.boilers[i].state = 'overrun';
        t.boilers[i].for = 0;
        t.boilers[i].rate = 0;
      }
      t.sinceStage = 0;
    }
  }
  // Each burner's own sequence.
  let heat = 0;
  for (const b of t.boilers) {
    b.for += dt;
    if (b.tripped && b.state !== 'lockout') {
      b.state = 'lockout';
      b.for = 0;
      b.rate = 0;
    }
    switch (b.state) {
      case 'called':
        if (b.for >= CALL_S) [b.state, b.for] = ['purge', 0];
        break;
      case 'purge':
        if (b.for >= PURGE_S) [b.state, b.for] = ['ignition', 0];
        break;
      case 'ignition':
        if (b.for >= IGNITION_S) {
          [b.state, b.for] = ['firing', 0];
          b.starts += 1;
          b.ran = 0;
        }
        break;
      case 'firing': {
        b.ran += dt;
        b.hours += dt / 3600;
        // Series fill: each burner in rota order takes the load up to
        // full fire before the next, with a 20 % minimum fire.
        const k = order(t)
          .filter((i) => lit(t.boilers[i]))
          .indexOf(t.boilers.indexOf(b));
        b.rate = Math.max(0.2, Math.min(1, t.demand * n - k));
        heat += b.rate / n;
        break;
      }
      case 'overrun':
        if (b.for >= OVERRUN_S) [b.state, b.for] = ['standby', 0];
        break;
      case 'lockout':
        if (!b.tripped) [b.state, b.for] = ['standby', 0];
        break;
      default:
        break;
    }
    const target = b.state === 'firing' ? t.setpointC + 2 + b.rate * 4 : 55;
    b.flowC += (target - b.flowC) * Math.min(1, dt / 60);
  }
  // The header: heated by the burners, cooled by the load.
  t.headerC +=
    dt * (heat - load(t.time)) * 0.06 - dt * (t.headerC - 15) * 0.0002;
  t.headerC = Math.max(10, Math.min(95, t.headerC));
  t.sinceSample += dt;
  if (t.sinceSample >= TRIAL_SAMPLE_S) {
    t.sinceSample -= TRIAL_SAMPLE_S;
    t.trend = [...t.trend.slice(-(TRIAL_SAMPLES - 1)), t.headerC];
  }
  return t;
}

/** A confirmed edit from the unit, applied. */
export function editCascadeTrial(
  s: CascadeTrial,
  e: CascadeEdit,
): CascadeTrial {
  switch (e.setting) {
    case 'setpoint':
      return { ...s, setpointC: e.value };
    case 'stageUp':
      return { ...s, stageUpS: e.value };
    case 'stageDown':
      return { ...s, stageDownS: e.value };
    case 'minRun':
      return { ...s, minRunS: e.value };
    case 'rotation':
      return { ...s, rotation: e.value };
    case 'lead':
      return { ...s, fixedLead: e.value, lead: e.value };
  }
}

/** A boiler tripped (locked out) or reset, for the trial's own buttons. */
export function tripTrialBoiler(s: CascadeTrial, i: number, tripped: boolean) {
  return {
    ...s,
    boilers: s.boilers.map((b, k) => (k === i ? { ...b, tripped } : b)),
  };
}

/** What the trial shows the unit. */
export function trialView(s: CascadeTrial, powered = true): CascadeManagerView {
  return {
    powered,
    enable: s.enable,
    running: s.running,
    headerC: s.headerC,
    setpointC: s.setpointC,
    trend: s.trend,
    trendMinutes: (TRIAL_SAMPLES * TRIAL_SAMPLE_S) / 60,
    demand: s.demand,
    lead: s.lead,
    rotation: s.rotation,
    stageUpS: s.stageUpS,
    stageDownS: s.stageDownS,
    minRunS: s.minRunS,
    boilers: s.boilers.map((b) => ({
      state: b.state,
      rate: b.rate,
      flowC: b.flowC,
      hours: b.hours,
      starts: b.starts,
      code:
        b.state === 'lockout' ? 'E02' : b.state === 'firing' ? '3' : undefined,
    })),
    alarm: null,
    clock: s.time,
  };
}
