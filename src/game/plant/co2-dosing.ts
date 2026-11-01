import type { ChannelFeedback } from './aqualis-types';

/**
 * A plant room's CO₂ valve controller (CO₂ dosing, the owner, 2026-10-31;
 * `doc/plans/co2-system.md`): the dosing panel on the wall beside the
 * room's CO₂ wall port, which lets the gas into the circulation's
 * injection point as the room's Dr Aqualis Trio asks. Pure.
 *
 * After the packaged pool CO₂ dosing panels (Blue-White's, Neptune
 * Benson's and Chemtrol's CO₂ feed systems; the Lutz-Jesco and ProMinent
 * gas dosing panels): an inlet pressure switch and the panel's own
 * second-stage regulator, a dosing valve, a flow meter, a non-return valve,
 * and the gas line to the injection point. Two kinds, a bit of everything:
 *
 * - **'solenoid'** (the Lounge, the period's panel): a normally closed
 *   solenoid valve, a glass-tube rotameter with a needle valve setting the
 *   flow while it is open, and a limit contact on the rotameter's float
 *   proving the flow. The 4–20 mA demand is turned into time-proportional
 *   opening: open for demand × `cycle` seconds in each cycle, so the
 *   average is demand × the needle valve's setting (its `most`).
 * - **'mass-flow'** (the Olympic, the modern panel): a thermal mass flow
 *   controller (after Bronkhorst's EL-FLOW, Brooks's SLA5850 and Alicat's
 *   MC; `doc/plans/co2-system.md`, "The mass flow controller"), its
 *   proportional valve and its meter in one body, holding the flow at
 *   demand × its range whatever the inlet pressure, while it can. On its
 *   own face: a HAND · AUTO toggle (AUTO is REMOTE, HAND is MANUAL at its
 *   local set point) and a guarded valve OVERRIDE, CLOSE · NORMAL · OPEN,
 *   as the real ones' valve override input (Brooks's VOR, Alicat's valve
 *   hold and exhaust): forced shut, or fully open whatever the set point
 *   says, but still shut by every interlock (`command`).
 *
 * Its local selector is REMOTE · MANUAL · OFF (`ChannelFeedback.mode`): in
 * REMOTE it doses as the Trio's 4–20 mA asks while the Trio's release
 * contact is closed; in MANUAL at its own manual rate, ignoring the Trio;
 * in OFF, nothing. It shuts its valve, and opens its error relay with the
 * fault named, on: the room's gas alarm (the detector's interlock), its
 * inlet pressure low (no supply), no water flowing at the injection point
 * (the booster's flow switch), a broken 4–20 mA loop in REMOTE (below
 * 3.6 mA, NAMUR NE 43), and two latched faults it finds itself, reset at
 * the panel: flow not proved (asked to dose and the meter shows too little
 * for `PROVE_AFTER`), and valve stuck (shut and the meter still shows
 * flow). Its valve may be stuck by a fault injected for the game, shut or
 * open: stuck open, it doses whatever it is told, until the wall port is
 * shut.
 *
 * What it delivers each step, grams, goes into its pool's
 * `Additions.co2`; the same grams are its draw on its wall port
 * (`co2-distribution.ts`).
 */

export type Co2DoserKind = 'solenoid' | 'mass-flow';

export interface Co2DoserSpec {
  kind: Co2DoserKind;
  /** The most it can dose, g/h of CO₂: the needle valve's setting (solenoid) or the mass flow controller's range. */
  most: number;
  /** The time-proportional cycle, s (solenoid only). */
  cycle: number;
}

/**
 * The two rooms' panels, sized against the Trio's pH channel: its full
 * scale asks for `ACID_G_PER_M3` (1.5 g of HCl an hour for every m³) times
 * `CO2_PER_HCL` (1.21 g of CO₂ for a gram of HCl), CO₂ first, acid for the
 * rest. The Lounge (139 m³ and its tank, about 150): 270 g/h at full
 * scale, so a 300 g/h rotameter takes all of it, as the rig's ideal valve
 * does. The Olympic (2,500 m³): about 4.9 kg/h at full scale, but some
 * 15 kg a day (0.6 kg/h) on average (mission 109's estimate), so a 2 kg/h
 * mass flow controller carries the base load three times over and acid
 * trims the peaks, as the Trio's sharing intends.
 */
export const CO2_DOSERS = {
  plant_pool_01: { kind: 'solenoid', most: 300, cycle: 60 },
  plant_pool_02: { kind: 'mass-flow', most: 2000, cycle: 60 },
} as const satisfies Record<string, Co2DoserSpec>;

/** The panel's pressures, bar gauge, and its proving. */
export const CO2_PANEL = {
  /** Its second-stage regulator's outlet: the dosing valve's working pressure. */
  working: 2,
  /** The regulator needs this much above its outlet to hold it. */
  margin: 0.3,
  /** The injection point's back pressure (the booster line's water). */
  back: 1,
  /**
   * The inlet pressure switch: below this, NO SUPPLY PRESSURE. Set where
   * the valve still passes most of its flow, so a falling supply is called
   * as what it is before the flow fails to prove.
   */
  lowInlet: 2,
  /** Flow is proved at this share of what is asked… */
  proveShare: 0.5,
  /** …within this long, s, or FLOW NOT PROVED latches. */
  proveAfter: 30,
  /** Flow above this share of its most with the valve shut, this long, latches VALVE STUCK. */
  stuckShare: 0.05,
  /** A 4–20 mA loop below this, mA, is broken (NAMUR NE 43). */
  brokenLoop: 3.6,
} as const;

export type Co2Fault =
  | 'gas-alarm'
  | 'no-supply-pressure'
  | 'no-water-flow'
  | 'signal-lost'
  | 'flow-not-proved'
  | 'valve-stuck';

/** Each fault as its error relay names it, for the Trio's pump status screen and the panel's display. */
export const CO2_FAULT_TEXT: Record<Co2Fault, string> = {
  'gas-alarm': 'CO₂ GAS ALARM',
  'no-supply-pressure': 'NO SUPPLY PRESSURE',
  'no-water-flow': 'NO WATER FLOW',
  'signal-lost': 'SIGNAL LOST',
  'flow-not-proved': 'FLOW NOT PROVED',
  'valve-stuck': 'VALVE STUCK',
};

/**
 * A mass flow controller's valve override (`doc/plans/co2-system.md`):
 * NORMAL, its valve follows its set point; CLOSE, held shut (Alicat's
 * "hold valve closed", Brooks's VOR below 0.3 V); OPEN, driven fully open
 * (Alicat's exhaust, Brooks's VOR above 4.8 V), whatever its set point.
 */
export type Co2Override = 'close' | 'normal' | 'open';

/** The override's positions, as engraved down its switch: OPEN at the top. */
export const CO2_OVERRIDES: readonly Co2Override[] = [
  'close',
  'normal',
  'open',
];

/**
 * The mass flow controller's own figures. `purge`: what its valve passes
 * fully open, a share of its range at working pressure (a real one's valve
 * is sized with headroom over its range; Alicat's meter reads to 128 % of
 * full scale, so its meter still shows it). `driveAtRange`: its valve drive
 * at full scale on working pressure, %.
 */
export const CO2_MFC = { purge: 1.25, driveAtRange: 60 } as const;

/** The faults it latches until RESET at the panel. */
const LATCHING: readonly Co2Fault[] = ['flow-not-proved', 'valve-stuck'];

export type Co2DoserMode = ChannelFeedback['mode'];

export interface Co2Doser {
  spec: Co2DoserSpec;
  mode: Co2DoserMode;
  /**
   * The mass flow controller's HAND · AUTO toggle at HAND (MANUAL) or AUTO
   * (REMOTE): where it stands, kept while the panel is switched OFF so
   * switching on brings back the mode it shows. For the solenoid panel it
   * follows its selector.
   */
  hand: boolean;
  /** The mass flow controller's valve override (NORMAL on the solenoid panel). */
  override: Co2Override;
  /** Its totaliser: grams it has dosed, ever. */
  totalG: number;
  /** MANUAL's rate, g/h (0 to its most). */
  manualRate: number;
  powered: boolean;
  /** An injected fault: its valve stuck shut or open. */
  stuck: 'shut' | 'open' | null;
  /** A latched fault, until RESET. */
  latched: Co2Fault | null;
  /** The fault its error relay names now, if any. */
  fault: Co2Fault | null;
  /** Seconds asked to dose with the flow short; seconds shut with flow showing. */
  unproved: number;
  unwanted: number;
  /** Seconds into its time-proportional cycle (solenoid). */
  phase: number;
  /** Its valve open at the end of the last step (the solenoid's coil, the controller's valve off its seat). */
  open: boolean;
  /** What its meter shows: g/h, averaged over the last step. */
  delivering: number;
  /** What it was asked for last step, g/h. */
  asked: number;
}

export function newCo2Doser(spec: Co2DoserSpec): Co2Doser {
  return {
    spec,
    mode: 'remote',
    hand: false,
    override: 'normal',
    totalG: 0,
    manualRate: spec.most / 2,
    powered: true,
    stuck: null,
    latched: null,
    fault: null,
    unproved: 0,
    unwanted: 0,
    phase: 0,
    open: false,
    delivering: 0,
    asked: 0,
  };
}

/** What it is given each step. */
export interface Co2DoserInputs {
  /** The Trio's analogue output on its CO₂ port, mA (4 is nothing, 20 its most; 0 unplugged). */
  ma: number;
  /** The Trio's release contact closed: dosing permitted. */
  release: boolean;
  /** Its wall port's pressure, bar gauge (`portPressure`). */
  inletBar: number;
  /** Water flowing at the injection point (the booster running, its flow switch made). */
  waterFlowing: boolean;
  /** The room's CO₂ detector's interlock (`co2-detection.ts` `dosingInterlock`). */
  gasAlarm: boolean;
}

export interface Co2DoserStep {
  state: Co2Doser;
  /** CO₂ delivered this step, g: into the pool's `Additions.co2`, and drawn from its wall port. */
  grams: number;
}

// ---- The Trio's port: 4–20 mA and release -----------------------------------

/** A 0-to-1 demand as 4–20 mA. */
export const demandToMa = (demand: number) =>
  4 + 16 * Math.max(0, Math.min(1, demand || 0));

/** 4–20 mA as a 0-to-1 demand (under 4 is nothing). */
export const maToDemand = (ma: number) =>
  Math.max(0, Math.min(1, (ma - 4) / 16));

/**
 * What the Trio's CO₂ control port puts on the cable: its demand as 4–20 mA,
 * and its release contact, closed while it asks for anything. A cable not
 * connected carries nothing (0 mA, open).
 */
export function trioSignal(
  demand: number,
  connected = true,
): { ma: number; release: boolean } {
  if (!connected) return { ma: 0, release: false };
  return { ma: demandToMa(demand), release: demand > 0 };
}

/**
 * The panel's feedback to the Trio's port, exactly as `ChannelFeedback`
 * defines it (its mode, power, whether its valve is open and flowing, its
 * error relay's fault, and its meter's flow and its most in g/h); null when
 * its control cable is not connected.
 */
export function co2Feedback(
  d: Co2Doser,
  connected = true,
): ChannelFeedback | null {
  if (!connected) return null;
  return {
    mode: d.mode,
    powered: d.powered,
    running: d.delivering > 0,
    fault: d.fault ? CO2_FAULT_TEXT[d.fault] : null,
    delivering: d.delivering,
    most: d.spec.most,
    ...(d.spec.kind === 'solenoid' ? { pulsed: true } : {}),
  };
}

// ---- Its step -------------------------------------------------------------------

/** Share of its most it can pass at `inletBar`: the panel's regulator holding its working pressure while it can. */
export function pressureShare(inletBar: number): number {
  const p = CO2_PANEL;
  const outlet = Math.min(p.working, Math.max(0, inletBar - p.margin));
  return Math.max(0, Math.min(1, (outlet - p.back) / (p.working - p.back)));
}

/** Seconds a time-proportional valve is open in [phase, phase + dt], open `on` s at the start of each `cycle`. */
export function openSeconds(
  phase: number,
  dt: number,
  on: number,
  cycle: number,
): number {
  if (on <= 0) return 0;
  if (on >= cycle) return dt;
  const whole = Math.floor(dt / cycle);
  let open = whole * on;
  let t = phase % cycle;
  let left = dt - whole * cycle;
  while (left > 1e-9) {
    const seg = Math.min(left, cycle - t);
    open += Math.max(0, Math.min(t + seg, on) - t);
    t = (t + seg) % cycle;
    left -= seg;
  }
  return open;
}

/**
 * What it is told to dose, g/h, and the fault stopping it, if any. The
 * override acts on the valve in place of its set point, as a real mass
 * flow controller's valve override input does: it bypasses the set point
 * (the Trio's 4–20 mA and release, HAND's rate, and so SIGNAL LOST, which
 * is only about the set point), but not the panel: unpowered, OFF, the gas
 * alarm's interlock, no supply, no water flowing at the injection point
 * and a latched fault all still shut it, OPEN or not. Upstream, a shut
 * wall port or master valve leaves it nothing to pass.
 */
function command(
  d: Co2Doser,
  i: Co2DoserInputs,
): { rate: number; fault: Co2Fault | null } {
  if (!d.powered) return { rate: 0, fault: null };
  const forced = d.override !== 'normal';
  const blocked: Co2Fault | null = i.gasAlarm
    ? 'gas-alarm'
    : d.latched
      ? d.latched
      : i.inletBar < CO2_PANEL.lowInlet
        ? 'no-supply-pressure'
        : !i.waterFlowing
          ? 'no-water-flow'
          : d.mode === 'remote' && !forced && i.ma < CO2_PANEL.brokenLoop
            ? 'signal-lost'
            : null;
  if (blocked) return { rate: 0, fault: blocked };
  const most = d.spec.most;
  if (d.mode === 'off') return { rate: 0, fault: null };
  if (d.override === 'close') return { rate: 0, fault: null };
  if (d.override === 'open') return { rate: most * CO2_MFC.purge, fault: null };
  if (d.mode === 'manual')
    return { rate: Math.max(0, Math.min(most, d.manualRate)), fault: null };
  return { rate: i.release ? maToDemand(i.ma) * most : 0, fault: null };
}

/** The panel `dt` seconds on. */
export function stepCo2Doser(
  d: Co2Doser,
  i: Co2DoserInputs,
  dt: number,
): Co2DoserStep {
  if (!(dt > 0)) return { state: d, grams: 0 };
  const { spec } = d;
  const { rate, fault: blocked } = command(d, i);
  const share = pressureShare(i.inletBar);

  // Its valve: how long open (or how far), and the flow through it.
  // `expected` is what a sound valve at full pressure would pass this step,
  // g/h: the mass flow controller's set point, or the solenoid's needle
  // valve setting for the share of the step it is open.
  let expected: number;
  let open: boolean;
  let phase = d.phase;
  if (spec.kind === 'mass-flow') {
    expected = rate;
    open = rate > 0;
  } else {
    const on = spec.most > 0 ? (rate / spec.most) * spec.cycle : 0;
    expected = (spec.most * openSeconds(phase, dt, on, spec.cycle)) / dt;
    phase = (phase + dt) % spec.cycle;
    open = rate > 0 && phase < on;
  }
  // Its valve's most: its range (its purge, driven fully open), less as
  // the inlet falls.
  const most = spec.most * (d.override === 'open' ? CO2_MFC.purge : 1);
  let flow =
    d.stuck === 'shut'
      ? 0
      : d.stuck === 'open'
        ? spec.most * share
        : Math.min(expected, most * share);
  if (d.stuck === 'shut') open = false;
  if (d.stuck === 'open') open = true;
  if (flow < 1e-9) flow = 0;

  // Proving: open and short (only the time it should be flowing counts);
  // or flowing beyond what it was told. Not while its valve is overridden:
  // its controller knows the valve is forced, as a real one's alarms do.
  const proving = d.override === 'normal';
  const short =
    proving && expected > 0 && flow < CO2_PANEL.proveShare * expected;
  const unproved = short
    ? d.unproved + dt
    : proving && rate > 0 && expected <= 0
      ? d.unproved
      : 0;
  const flowingShut =
    proving && flow > expected + CO2_PANEL.stuckShare * spec.most;
  const unwanted = flowingShut && d.powered ? d.unwanted + dt : 0;
  let latched = d.latched;
  if (!latched && d.powered) {
    if (unwanted >= CO2_PANEL.proveAfter) latched = 'valve-stuck';
    else if (unproved >= CO2_PANEL.proveAfter) latched = 'flow-not-proved';
  }
  const fault =
    blocked && !LATCHING.includes(blocked) ? blocked : (latched ?? blocked);

  return {
    state: {
      ...d,
      latched,
      fault: d.powered ? fault : null,
      unproved,
      unwanted,
      phase,
      open,
      delivering: flow,
      asked: rate,
      totalG: d.totalG + (flow * dt) / 3600,
    },
    grams: (flow * dt) / 3600,
  };
}

/**
 * The flow it would draw from its wall port, g/h, at `inletBar`: what
 * `stepCo2Doser` will deliver, to be asked of the distribution before the
 * panel is stepped (`stepCo2Distribution`'s draws).
 */
export const co2Draw = (d: Co2Doser, i: Co2DoserInputs, dt: number) =>
  dt > 0 ? (stepCo2Doser(d, i, dt).grams * 3600) / dt : 0;

// ---- What can be done to it ------------------------------------------------------

/** Its selector turned: REMOTE or MANUAL also set the HAND · AUTO toggle's position. */
export const setCo2Mode = (d: Co2Doser, mode: Co2DoserMode): Co2Doser =>
  d.mode === mode
    ? d
    : { ...d, mode, hand: mode === 'off' ? d.hand : mode === 'manual' };

/**
 * The mass flow controller's HAND · AUTO toggle: HAND is MANUAL, at its
 * local set point (▲ ▼); AUTO is REMOTE, following the Trio's 4–20 mA.
 * With the panel switched OFF it only moves the toggle.
 */
export const setCo2Hand = (d: Co2Doser, hand: boolean): Co2Doser =>
  d.hand === hand
    ? d
    : {
        ...d,
        hand,
        mode: d.mode === 'off' ? 'off' : hand ? 'manual' : 'remote',
      };

/**
 * The mass flow controller panel's ON · OFF switch (its control box's, in
 * place of the solenoid panel's three-way selector's OFF): on, it doses in
 * the mode its HAND · AUTO toggle shows.
 */
export const setCo2On = (d: Co2Doser, on: boolean): Co2Doser =>
  setCo2Mode(d, on ? (d.hand ? 'manual' : 'remote') : 'off');

/** The mass flow controller's valve override (the solenoid panel has none). */
export const setCo2Override = (d: Co2Doser, override: Co2Override): Co2Doser =>
  d.spec.kind !== 'mass-flow' || d.override === override
    ? d
    : { ...d, override };

/**
 * The mass flow controller's valve drive, %, as its display shows it: 0
 * shut, 100 driven fully open (OVERRIDE OPEN, or straining against a
 * falling inlet), else in proportion to its flow, `driveAtRange` at full
 * scale on working pressure.
 */
export function co2ValveDrive(d: Co2Doser, inletBar: number): number {
  if (!d.powered || !d.open) return 0;
  if (d.override === 'open') return 100;
  const share = pressureShare(inletBar);
  if (share <= 0) return 100;
  return Math.min(
    100,
    (CO2_MFC.driveAtRange * d.asked) / (d.spec.most * share),
  );
}

/** MANUAL's rate, g/h, clamped to 0 and its most. */
export const setCo2ManualRate = (d: Co2Doser, rate: number): Co2Doser => ({
  ...d,
  manualRate: Math.max(0, Math.min(d.spec.most, rate)),
});

/** Its supply switched on or off (an isolator in its plant room's distribution board). */
export const setCo2Power = (d: Co2Doser, powered: boolean): Co2Doser =>
  d.powered === powered ? d : { ...d, powered };

/** The needle valve turned (solenoid): the rotameter's flow while open, g/h. */
export const setCo2Needle = (d: Co2Doser, most: number): Co2Doser =>
  d.spec.kind === 'solenoid'
    ? { ...d, spec: { ...d.spec, most: Math.max(0, most) } }
    : d;

/** A fault injected: its valve stuck shut or open, or freed with null. */
export const setCo2Stuck = (
  d: Co2Doser,
  stuck: Co2Doser['stuck'],
): Co2Doser => ({ ...d, stuck });

/** RESET at the panel: clears a latched fault (it latches again if its cause is still there). */
export const resetCo2Doser = (d: Co2Doser): Co2Doser =>
  d.latched
    ? { ...d, latched: null, fault: null, unproved: 0, unwanted: 0 }
    : d;

/** What can be done at a panel itself (its local controls), as one world action. */
export type Co2PanelAction =
  | { kind: 'mode'; mode: Co2DoserMode }
  | { kind: 'hand'; hand: boolean }
  | { kind: 'on'; on: boolean }
  | { kind: 'override'; override: Co2Override }
  | { kind: 'rate'; gh: number }
  | { kind: 'reset' };

/** A panel's local control worked. */
export function actOnCo2Doser(d: Co2Doser, a: Co2PanelAction): Co2Doser {
  switch (a.kind) {
    case 'mode':
      return setCo2Mode(d, a.mode);
    case 'hand':
      return setCo2Hand(d, a.hand);
    case 'on':
      return setCo2On(d, a.on);
    case 'override':
      return setCo2Override(d, a.override);
    case 'rate':
      return setCo2ManualRate(d, a.gh);
    case 'reset':
      return resetCo2Doser(d);
  }
}
