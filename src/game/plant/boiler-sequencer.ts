/**
 * The boiler house's sequencer (mission 121; `doc/research/boiler-house-
 * control.md` §2.3–2.7 and §3.3): the cascade manager above the six
 * boilers' own controllers. It reads the common flow header, holds a fixed
 * primary set point (a pool plant's primary is not weather compensated),
 * turns the header's error into the plant's firing demand with a PI term,
 * and stages the boilers in series, lead first: the lead takes the load
 * and modulates up; when every boiler it has called is proven firing,
 * near full fire, and the header still short of its set point for the
 * stage-up delay, it calls the next in the rota; when the last one in the
 * rota sits at minimum fire with the header over its set point for the
 * stage-down delay, it releases it. Each boiler keeps a minimum run and a
 * minimum off time, and successive changes a staging interval, so one
 * boiler lights, then another a while later, never several at once.
 *
 * The lead rotates by hours run (the available boiler with fewest becomes
 * lead at each rotation) or stays where it is set; an unavailable lead
 * (switched off, locked out, without gas, power, combustion air or flow)
 * is skipped and the next in the rota promoted. With no load calling, all
 * are released. With the plant disabled, frost protection runs the pumps
 * below 3 °C outside and fires the lead below 5 °C at the header.
 *
 * The delays are game-paced: tens of seconds where real plant takes
 * minutes, the order and the staging still plain to see. Pure: the
 * boilers' own controllers (`boiler-house.ts`) are stepped by the world
 * with what this asks of them (`sequencerTargets`).
 */

/** The PLANT ENABLE selector on the boiler house's panel (local only). */
export type PlantEnable = 'off' | 'auto' | 'hand';
export const PLANT_ENABLES: readonly PlantEnable[] = ['off', 'auto', 'hand'];

/** How the lead is chosen: by hours run at each rotation, or fixed where it is set. */
export type LeadRotation = 'hours' | 'fixed';

/** The sequencer's alarms, each shown on its panel and the boards. */
export const SEQUENCER_ALARMS = [
  'lockout',
  'header-low',
  'none-available',
] as const;
export type SequencerAlarm = (typeof SEQUENCER_ALARMS)[number];
/** An alarm lamp: dark, flashing (new, not accepted) or steady (accepted, still in). */
export type AlarmLamp = 'off' | 'flashing' | 'steady';

export const SEQUENCER = {
  /** The boilers it sequences (B-501 to B-506). */
  boilers: 6,
  /** The primary flow set point, °C, fixed (research §2.2). */
  setpoint: 80,
  /** The PI term: plant demand (a share of all six boilers) per K of header error, and its integral time, s. */
  kp: 0.1,
  ti: 480,
  /** A boiler's minimum fire, a share of its output (5:1 turndown). */
  minFire: 0.2,
  /** Near full fire: the called boilers' share at or above which another may be wanted. */
  saturated: 0.95,
  /** The share the boilers left would run at, at most, for the last to be released though the header is not over. */
  shed: 0.8,
  /** The header below the set point by this much, K, for the stage-up delay, s, calls the next boiler. */
  upDifferential: 0.5,
  stageUpDelay: 30,
  /** Above it by this much, K, for the stage-down delay, s, with the last at minimum fire, releases it. */
  downDifferential: 1,
  stageDownDelay: 60,
  /** The least time between successive stage changes, s. */
  stageInterval: 45,
  /** Each boiler's minimum run once called, and minimum off once released, s. */
  minRun: 120,
  minOff: 60,
  /** With no load calling for this long, s, the plant is released (the loads' calling overrun). */
  loadOverrun: 60,
  /** World hours between lead rotations by hours run. */
  rotationHours: 6,
  /** Frost protection: the pumps run below this outside, °C; the lead fires below the header's first and stops above its second. */
  frostOutside: 3,
  frostHeader: 5,
  frostClear: 10,
  /** HEADER LOW: the header this far below its set point, K, while heat is wanted. */
  headerLow: 10,
} as const;

export interface BoilerSequencerState {
  /** The PLANT ENABLE selector: OFF, AUTO (the control room's START and STOP), HAND (run regardless). */
  enable: PlantEnable;
  /** In AUTO, the plant started from the control room (START) or stopped (STOP). */
  run: boolean;
  /** The header's set point, °C. */
  setpoint: number;
  /** The stage-up and stage-down delays and each boiler's minimum run, s: the operator's settings. */
  stageUp: number;
  stageDown: number;
  minRun: number;
  rotation: LeadRotation;
  /** The lead boiler's index (0 is B-501). */
  lead: number;
  /** The boilers it calls to fire, in rota order from the lead (the order they take the load). */
  called: number[];
  /** The plant's firing demand, a share of all six boilers, 0–1 (the PI term's output). */
  demand: number;
  /** The PI term's integral, the same units. */
  integral: number;
  /** Seconds since the last stage change. */
  stageTimer: number;
  /** Seconds the stage-up and stage-down conditions have held. */
  upTimer: number;
  downTimer: number;
  /** Each boiler's seconds since it was last called or released. */
  sinceChange: number[];
  /** Each boiler's hours firing, and its starts (calls). */
  hoursRun: number[];
  starts: number[];
  /** Seconds since the lead last rotated. */
  sinceRotation: number;
  /** Seconds since a load last called for heat. */
  sinceLoad: number;
  /** Whether heat is wanted: the plant enabled and (in AUTO) a load calling, or within the overrun since one did. */
  wanted: boolean;
  /** Frost protection: firing the lead, and running the pumps. */
  frost: boolean;
  frostPumps: boolean;
  /** Its alarm lamps (ACCEPT turns flashing to steady). */
  alarms: Record<SequencerAlarm, AlarmLamp>;
}

/** What the sequencer reads each step. */
export interface SequencerInputs {
  /** The common flow header, °C. */
  flow: number;
  /** Outside air, °C. */
  outside: number;
  /** Whether any load is calling for heat. */
  loadCalling: boolean;
  /** Each boiler able to fire: on, not locked out, with gas, power, combustion air and flow. */
  available: readonly boolean[];
  /** Each boiler's flame proven (its code 3). */
  firing: readonly boolean[];
  /** Each boiler locked out. */
  lockedOut: readonly boolean[];
}

const each = <T>(f: (i: number) => T) =>
  Array.from({ length: SEQUENCER.boilers }, (_, i) => f(i));

export function newBoilerSequencer(): BoilerSequencerState {
  return {
    enable: 'auto',
    run: true,
    setpoint: SEQUENCER.setpoint,
    stageUp: SEQUENCER.stageUpDelay,
    stageDown: SEQUENCER.stageDownDelay,
    minRun: SEQUENCER.minRun,
    rotation: 'hours',
    lead: 0,
    called: [],
    demand: 0,
    integral: 0,
    stageTimer: SEQUENCER.stageInterval,
    upTimer: 0,
    downTimer: 0,
    sinceChange: each(() => SEQUENCER.minOff),
    hoursRun: each(() => 0),
    starts: each(() => 0),
    sinceRotation: 0,
    sinceLoad: 0,
    wanted: true,
    frost: false,
    frostPumps: false,
    alarms: { lockout: 'off', 'header-low': 'off', 'none-available': 'off' },
  };
}

/** The boilers in rota order: the lead, then each after it in turn. */
export const rotaOf = (lead: number, n = SEQUENCER.boilers) =>
  Array.from({ length: n }, (_, k) => (lead + k) % n);

/** Whether the plant is enabled: HAND, or AUTO and started. */
export const plantEnabled = (s: Pick<BoilerSequencerState, 'enable' | 'run'>) =>
  s.enable === 'hand' || (s.enable === 'auto' && s.run);

/** The plant's demand in boilers' worth (0 to 6). */
const worth = (demand: number) => demand * SEQUENCER.boilers;

/**
 * Each boiler's firing-rate target, 0–1 (0 for one not called): the
 * demand filled in rota order, each called boiler at least at its minimum
 * fire (below it, the last one sits at minimum fire and the header rises
 * until it is released: it cycles).
 */
export function sequencerTargets(s: BoilerSequencerState): number[] {
  const out = each(() => 0);
  const want = worth(s.demand);
  s.called.forEach((i, k) => {
    out[i] = Math.max(SEQUENCER.minFire, Math.min(1, want - k));
  });
  return out;
}

/** Which boilers are called, each true or false. */
export const calledBoilers = (s: BoilerSequencerState) =>
  each((i) => s.called.includes(i));

/** The lead after an unavailable one is skipped: the next available in the rota, or it stays. */
function promote(lead: number, available: readonly boolean[]) {
  return rotaOf(lead).find((i) => available[i]) ?? lead;
}

/** The available boiler with fewest hours run, from the lead on (ties go to the earlier in the rota). */
function fewestHours(s: BoilerSequencerState, available: readonly boolean[]) {
  let best = -1;
  for (const i of rotaOf(s.lead))
    if (available[i] && (best < 0 || s.hoursRun[i] < s.hoursRun[best]))
      best = i;
  return best < 0 ? s.lead : best;
}

/** The alarm lamps after sensing what is present. */
function senseLamps(
  lamps: Record<SequencerAlarm, AlarmLamp>,
  present: Record<SequencerAlarm, boolean>,
): Record<SequencerAlarm, AlarmLamp> {
  let changed = false;
  const out = { ...lamps };
  for (const id of SEQUENCER_ALARMS) {
    const was = lamps[id];
    // New: flashing. Cleared once accepted: dark. Cleared before: it flashes on until accepted.
    const next = present[id]
      ? was === 'off'
        ? 'flashing'
        : was
      : was === 'steady'
        ? 'off'
        : was;
    if (next !== was) {
      out[id] = next;
      changed = true;
    }
  }
  return changed ? out : lamps;
}

/** ACCEPT: flashing lamps steady; one whose alarm has cleared goes dark at the next step. */
export function acceptSequencerAlarms(
  s: BoilerSequencerState,
): BoilerSequencerState {
  if (!SEQUENCER_ALARMS.some((id) => s.alarms[id] === 'flashing')) return s;
  const alarms = { ...s.alarms };
  for (const id of SEQUENCER_ALARMS)
    if (alarms[id] === 'flashing') alarms[id] = 'steady';
  return { ...s, alarms };
}

/** Which of its alarms are present. */
export function sequencerAlarmsPresent(
  s: BoilerSequencerState,
  inputs: Pick<SequencerInputs, 'flow' | 'available' | 'lockedOut'>,
): Record<SequencerAlarm, boolean> {
  return {
    lockout: inputs.lockedOut.some(Boolean),
    'header-low': s.wanted && inputs.flow < s.setpoint - SEQUENCER.headerLow,
    'none-available': (s.wanted || s.frost) && !inputs.available.some(Boolean),
  };
}

/** The sequencer `dt` seconds on. */
export function stepBoilerSequencer(
  s: BoilerSequencerState,
  inputs: SequencerInputs,
  dt: number,
): BoilerSequencerState {
  const { flow, available, firing } = inputs;
  const C = SEQUENCER;
  const sinceChange = s.sinceChange.map((t) => t + dt);
  const hoursRun = s.hoursRun.map((h, i) => h + (firing[i] ? dt / 3600 : 0));
  const starts = [...s.starts];
  const enabled = plantEnabled(s);
  // No load calling releases the plant once it has lasted the overrun.
  const sinceLoad = inputs.loadCalling ? 0 : s.sinceLoad + dt;
  const wanted = enabled && (s.enable === 'hand' || sinceLoad < C.loadOverrun);

  // The lead: rotated by hours run at its interval; promoted past an unavailable one.
  let lead = s.lead;
  let sinceRotation = s.sinceRotation + dt;
  if (s.rotation === 'hours' && sinceRotation >= C.rotationHours * 3600) {
    lead = fewestHours({ ...s, hoursRun }, available);
    sinceRotation = 0;
  }
  if (!available[lead]) lead = promote(lead, available);
  const rota = rotaOf(lead);
  const byRota = (list: readonly number[]) =>
    [...list].sort((a, b) => rota.indexOf(a) - rota.indexOf(b));

  // An unavailable boiler is released at once; with no heat wanted, all.
  let called = byRota(s.called.filter((i) => available[i]));
  const release = (i: number) => {
    sinceChange[i] = 0;
  };
  for (const i of s.called) if (!called.includes(i)) release(i);

  // Frost protection, while the plant is not wanted.
  const frostPumps = !wanted && inputs.outside < C.frostOutside;
  const frost =
    !wanted &&
    (flow < C.frostHeader || (s.frost && flow < C.frostClear)) &&
    available[lead];

  let stageTimer = s.stageTimer + dt;
  let upTimer = 0;
  let downTimer = 0;
  let integral = s.integral;
  let demand: number;
  const call = (i: number) => {
    called = byRota([...called, i]);
    sinceChange[i] = 0;
    starts[i] += 1;
    stageTimer = 0;
  };

  if (!wanted) {
    for (const i of called) if (!(frost && i === lead)) release(i);
    called = frost && available[lead] ? [lead] : [];
    if (frost && !s.called.includes(lead)) {
      sinceChange[lead] = 0;
      starts[lead] += 1;
    }
    integral = 0;
    demand = frost ? C.minFire / C.boilers : 0;
  } else {
    // The PI term on the header's error, held within what is called.
    const error = s.setpoint - flow;
    const most = called.length / C.boilers;
    integral = Math.max(
      0,
      Math.min(most, integral + (C.kp / C.ti) * error * dt),
    );
    demand = Math.max(0, Math.min(most, C.kp * error + integral));
    const n = called.length;
    const want = worth(demand);
    const low = flow < s.setpoint - C.upDifferential;
    const high = flow > s.setpoint + C.downDifferential;
    const next = rota.find(
      (i) => available[i] && !called.includes(i) && sinceChange[i] >= C.minOff,
    );
    if (n === 0) {
      // The lead, once the header falls below its set point.
      if (low && next !== undefined) call(next);
    } else {
      // Up: every called boiler proven and near full fire, the header short.
      const allFiring = called.every((i) => firing[i]);
      if (allFiring && want >= C.saturated * n && low) upTimer = s.upTimer + dt;
      // Down: the last at minimum fire with the header over, or the rest
      // able to carry its share below their shed point.
      const spare = want + C.minFire <= C.shed * (n - 1);
      if ((want - (n - 1) <= C.minFire && high) || spare)
        downTimer = s.downTimer + dt;
      // A new lead not yet called (rotated in while others fire) is handed the load.
      const handover =
        !called.includes(lead) &&
        available[lead] &&
        sinceChange[lead] >= C.minOff &&
        stageTimer >= C.stageInterval;
      const last = called[n - 1];
      if (handover) {
        call(lead);
        upTimer = 0;
      } else if (
        upTimer >= s.stageUp &&
        stageTimer >= C.stageInterval &&
        next !== undefined
      ) {
        call(next);
        upTimer = 0;
      } else if (
        downTimer >= s.stageDown &&
        stageTimer >= C.stageInterval &&
        sinceChange[last] >= s.minRun
      ) {
        called = called.slice(0, -1);
        release(last);
        stageTimer = 0;
        downTimer = 0;
        const less = called.length / C.boilers;
        integral = Math.min(integral, less);
        demand = Math.min(demand, less);
      }
    }
  }

  const next: BoilerSequencerState = {
    ...s,
    lead,
    called,
    demand,
    integral,
    stageTimer,
    upTimer,
    downTimer,
    sinceChange,
    hoursRun,
    starts,
    sinceRotation,
    sinceLoad,
    wanted,
    frost,
    frostPumps,
  };
  next.alarms = senseLamps(s.alarms, sequencerAlarmsPresent(next, inputs));
  return next;
}

/** Turn the PLANT ENABLE selector. */
export const setPlantEnable = (
  s: BoilerSequencerState,
  enable: PlantEnable,
): BoilerSequencerState => (s.enable === enable ? s : { ...s, enable });

/** START or STOP the plant (the control room's, in AUTO). */
export const setPlantRun = (
  s: BoilerSequencerState,
  run: boolean,
): BoilerSequencerState => (s.run === run ? s : { ...s, run });

/** The operator's numeric settings, their ranges and steps (the cascade manager's own limits). */
export const SEQUENCER_SETTINGS = {
  setpoint: { min: 50, max: 85, step: 1 },
  stageUp: { min: 30, max: 900, step: 30 },
  stageDown: { min: 30, max: 900, step: 30 },
  minRun: { min: 60, max: 1200, step: 30 },
} as const;
export type SequencerSetting = keyof typeof SEQUENCER_SETTINGS;

/** A setting changed, held within its range and rounded to its step from its least. */
export function setSequencerSetting(
  s: BoilerSequencerState,
  setting: SequencerSetting,
  value: number,
): BoilerSequencerState {
  if (!Number.isFinite(value)) return s;
  const { min, max, step } = SEQUENCER_SETTINGS[setting];
  const held = Math.max(min, Math.min(max, value));
  const v = min + Math.round((held - min) / step) * step;
  return s[setting] === v ? s : { ...s, [setting]: v };
}
