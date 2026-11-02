import { THERMAL } from './thermal';

/** The local controller and modulating LTHW valve for a pool exchanger. */
export interface PoolTemperatureControlState {
  setpoint: number;
  mode: 'auto' | 'hand';
  /** Local manual output, 0–1; ignored in AUTO. */
  manualOutput: number;
  /** Actual valve opening, 0–1. */
  valvePosition: number;
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
}

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
  mode: 'auto',
  manualOutput: 0,
  valvePosition: 0,
  valveStuck: false,
  sensorFault: 'none',
  flowIsolatorOpen: true,
  returnIsolatorOpen: true,
});

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

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
  const demand =
    state.mode === 'auto'
      ? clampUnit((state.setpoint - measuredTemperature) / THERMAL.band)
      : clampUnit(state.manualOutput);
  const interlock = !input.circulationAvailable
    ? 'no-circulation'
    : input.primaryFlowIsolated || input.primaryReturnIsolated
      ? 'primary-isolated'
      : 'none';
  const commandedPosition = interlock === 'none' ? demand : 0;
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
  };
  return {
    state: nextState,
    measuredTemperature,
    demand,
    commandedPosition,
    interlock,
  };
}
