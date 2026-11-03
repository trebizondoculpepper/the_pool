/**
 * The ideal modulating controller and its placeholders (2026-11-03). This
 * is the design the Water Margin TC-1's screen will work against: a
 * feedback system intended to regulate a value.
 *
 * A controller takes a measured value, holds a set point and a band, and
 * outputs a command. A temperature controller is one sub-type. The valve
 * is a separate machine that turns the command (0 to 1) into an actual
 * position over a finite stroke, so a change can be observed.
 *
 * The valve here is a *placeholder*, its geometry plain, to be replaced by
 * a proper 2-port globe control valve with a linear actuator. The probe is
 * a placeholder too. Both are real working parts (the owner, 2026-11-03:
 * placeholders to trial the loop before the finished valve and probe).
 */

// ---- The ideal controller ------------------------------------------------------

/** What a controller holds and shows. */
export interface ControllerModel {
  /** The value it measures, in its own units (e.g. °C). */
  measured: number;
  /** Where it tries to hold the value. */
  setpoint: number;
  /** Its proportional band: this far below set point it asks full output. */
  band: number;
  /** Its output command, 0 to 1 (clamped). */
  output: number;
  /** Its mode: AUTO runs the law, HAND drives the output as set, OFF closes. */
  mode: 'auto' | 'hand' | 'off';
}

/**
 * A proportional controller's output for a measured value: 1 at or more
 * than one band below the set point, falling to 0 at the set point, with
 * a real band (some kelvin, so a pool heats smoothly rather than by
 * slamming a valve).
 */
export function controllerOutput(
  measured: number,
  setpoint: number,
  band: number,
): number {
  if (band <= 0) return setpoint <= measured ? 0 : 1;
  return Math.max(0, Math.min(1, (setpoint - measured) / band));
}

/** A temperature controller, the common sub-type: °C and a band in kelvin. */
export function temperatureOutput(
  measuredC: number,
  setpointC: number,
  bandK = 2,
): number {
  return controllerOutput(measuredC, setpointC, bandK);
}

/**
 * The band dial, 1 to 10, 1 aggressive (the owner, 2026-11-03: "bands_K
 * set from 1 to 10 with 1 as aggressive"). The dial reads the band in
 * kelvin directly: `dial` is clamped to 1..10, and 1 K below set point
 * at dial 1 asks full output, at dial 10 asks 10%.
 */
export function bandFromDial(dial: number): number {
  return Math.max(1, Math.min(10, Math.round(dial)));
}

/**
 * Step a controller against its measured value: in AUTO the proportional
 * law sets its output; in HAND the output stays as it was set; OFF closes
 * it. Returns a new model. Pure.
 */
export function stepController(model: ControllerModel): ControllerModel {
  if (model.mode === 'off') return { ...model, output: 0 };
  if (model.mode === 'hand') return model;
  return {
    ...model,
    output: controllerOutput(model.measured, model.setpoint, model.band),
  };
}

/** A controller held at its set point, just above it and just below, to show the band. */
export function temperatureController() {
  return {
    measured: 27,
    setpoint: 28,
    band: 2,
    output: 0.5,
    mode: 'auto',
  } satisfies ControllerModel;
}

// ---- The modulating valve -------------------------------------------------------

/** A modulating control valve's state: the command it is asked for, and where it actually is. */
export interface ModulatingValveState {
  /** Commanded opening, 0 to 1. */
  command: number;
  /** Actual opening, 0 to 1. */
  position: number;
  /** Full stroke's time, seconds. */
  strokeSeconds: number;
  /** Power: without it, the valve holds its place. */
  powered: boolean;
}

export function newModulatingValve(strokeSeconds = 30): ModulatingValveState {
  return {
    command: 0,
    position: 0,
    strokeSeconds: Math.max(0.001, strokeSeconds),
    powered: true,
  };
}

/** Advance the valve's stroke toward its command, a finite travel per second. Pure. */
export function stepModulatingValve(
  state: ModulatingValveState,
  dt: number,
): ModulatingValveState {
  if (!state.powered || !(dt > 0)) return state;
  const travel = Math.min(1, Math.max(0, dt) / state.strokeSeconds);
  const delta =
    Math.min(travel, Math.abs(state.command - state.position)) *
    Math.sign(state.command - state.position);
  return {
    ...state,
    position: Math.max(0, Math.min(1, state.position + delta)),
  };
}

/** How far its command and its actual position differ, 0 at rest. */
export const valveError = (s: ModulatingValveState) =>
  Math.abs(s.command - s.position);
