/** The local controller and modulating LTHW valve for a pool exchanger. */
export interface PoolTemperatureControlState {
  setpoint: number;
  /** Proportional band selected at the controller, kelvin. */
  band: number;
  mode: 'auto' | 'off' | 'hand';
  /** Local manual output, 0–1; ignored in AUTO. */
  manualOutput: number;
  /** Actual valve opening, 0–1. */
  valvePosition: number;
  /** The controller's commanded valve position (the quantised demand), 0–1. */
  commandedPosition: number;
  /**
   * Its integral (reset) action's share of the output, −1 to 1 (PI control: the
   * proportional band alone would leave the pool short of its set point by
   * however much output its load needs).
   */
  integral: number;
  /** An actuator fault leaves the valve at its last position. */
  valveStuck: boolean;
  /** Probe fault biases the measured value; none is the normal reading. */
  sensorFault: 'none' | 'low' | 'high';
  flowIsolatorOpen: boolean;
  returnIsolatorOpen: boolean;
}

export interface PoolTemperatureControlInputs {
  poolTemperature: number;
  circulationAvailable: boolean;
  primaryFlowIsolated: boolean;
  primaryReturnIsolated: boolean;
  dt: number;
  /** Seconds for full actuator travel, open or closed. */
  strokeSeconds?: number;
  /** Sensor fault offset, °C. */
  sensorFaultOffset?: number;
  /**
   * The controller's output step, 0–1 (the owner, 2026-11-03): the valve
   * command moves in steps of this size, so the valve is not driven
   * continuously. 0.1 by default, matching the controller's ten-segment
   * output bar; 0 for an unstepped command.
   */
  quantization?: number;
  /** Its integral time, seconds: how fast reset action builds. 600 by default. */
  integralSeconds?: number;
}

/** The controller's integral time by default, seconds: ten minutes, for a slow process such as a pool. */
export const INTEGRAL_SECONDS = 600;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));
/** −1 to 1: the integral may stand below zero, so HAND can hand over a low output bumplessly. */
const clampSigned = (value: number) => Math.min(1, Math.max(-1, value));

/** The controller's output step by default: its ten-segment output bar. */
export const OUTPUT_STEP = 0.1;

/** `value` (0–1) to the nearest `step`; 0 leaves it as it is. */
export const quantize = (value: number, step: number) =>
  step > 0
    ? // Rounded again so 7 × 0.1 is 0.7, not 0.7000000000000001.
      clampUnit(Math.round(Math.round(value / step) * step * 1e9) / 1e9)
    : clampUnit(value);

export interface PoolTemperatureControlResult {
  state: PoolTemperatureControlState;
  measuredTemperature: number;
  demand: number;
  commandedPosition: number;
  interlock: 'none' | 'no-circulation' | 'primary-isolated';
}

export const newPoolTemperatureControl = (
  setpoint: number,
): PoolTemperatureControlState => ({
  setpoint,
  band: 2,
  mode: 'auto',
  manualOutput: 0,
  valvePosition: 0,
  commandedPosition: 0,
  integral: 0,
  valveStuck: false,
  sensorFault: 'none',
  flowIsolatorOpen: true,
  returnIsolatorOpen: true,
});

/** Advance the local temperature controller and finite-stroke valve. Pure. */
export function stepPoolTemperatureControl(
  state: PoolTemperatureControlState,
  input: PoolTemperatureControlInputs,
): PoolTemperatureControlResult {
  const sensorOffset = input.sensorFaultOffset ?? 5;
  const measuredTemperature =
    input.poolTemperature +
    (state.sensorFault === 'low'
      ? -sensorOffset
      : state.sensorFault === 'high'
        ? sensorOffset
        : 0);
  const interlock = !input.circulationAvailable
    ? 'no-circulation'
    : input.primaryFlowIsolated || input.primaryReturnIsolated
      ? 'primary-isolated'
      : 'none';
  // PI control: the proportional term, full output a band below set point,
  // plus the integral built while the pool stays off its set point.
  const band = Math.max(0.01, state.band);
  const proportional = (state.setpoint - measuredTemperature) / band;
  const integral = Number.isFinite(state.integral) ? state.integral : 0;
  const demand =
    state.mode === 'off'
      ? 0
      : state.mode === 'auto'
        ? clampUnit(proportional + integral)
        : clampUnit(state.manualOutput);
  // The integral builds only in AUTO with nothing holding the valve shut,
  // and not further into a saturated output (anti-windup); in HAND it
  // tracks the manual output, so going back to AUTO is bumpless.
  const raw = proportional + integral;
  const integrating =
    state.mode === 'auto' &&
    interlock === 'none' &&
    !(raw >= 1 && proportional > 0) &&
    !(raw <= 0 && proportional < 0);
  const nextIntegral =
    state.mode === 'hand'
      ? clampSigned(clampUnit(state.manualOutput) - proportional)
      : integrating
        ? clampSigned(
            integral +
              (proportional * Math.max(0, input.dt)) /
                Math.max(1, input.integralSeconds ?? INTEGRAL_SECONDS),
          )
        : integral;
  const commandedPosition =
    interlock === 'none'
      ? quantize(demand, input.quantization ?? OUTPUT_STEP)
      : 0;
  const strokeSeconds = Math.max(0.001, input.strokeSeconds ?? 60);
  const travel = Math.max(0, input.dt) / strokeSeconds;
  const valvePosition = state.valveStuck
    ? clampUnit(state.valvePosition)
    : state.valvePosition +
      Math.min(travel, Math.abs(commandedPosition - state.valvePosition)) *
        Math.sign(commandedPosition - state.valvePosition);
  const nextState = {
    ...state,
    manualOutput: clampUnit(state.manualOutput),
    valvePosition: clampUnit(valvePosition),
    commandedPosition,
    integral: nextIntegral,
  };
  return {
    state: nextState,
    measuredTemperature,
    demand,
    commandedPosition,
    interlock,
  };
}
