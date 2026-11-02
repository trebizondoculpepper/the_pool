import { describe, expect, it } from 'vite-plus/test';
import {
  newPoolTemperatureControl,
  stepPoolTemperatureControl,
} from './pool-temperature-control';

const step = (
  overrides: Partial<Parameters<typeof stepPoolTemperatureControl>[1]> = {},
  state = newPoolTemperatureControl(30),
) =>
  stepPoolTemperatureControl(state, {
    poolTemperature: 29.95,
    circulationAvailable: true,
    primaryFlowIsolated: false,
    primaryReturnIsolated: false,
    dt: 60,
    ...overrides,
  });

describe('pool temperature controller and LTHW valve', () => {
  it('opens proportionally below setpoint and settles at the setpoint', () => {
    expect(step({ poolTemperature: 29.95 }).commandedPosition).toBeCloseTo(0.5);
    expect(step({ poolTemperature: 30 }).commandedPosition).toBe(0);
    expect(step({ poolTemperature: 30.2 }).commandedPosition).toBe(0);
  });

  it('moves the valve at a finite stroke rate', () => {
    const initial = { ...newPoolTemperatureControl(30), valvePosition: 0.2 };
    const result = step(
      { poolTemperature: 29, dt: 15, strokeSeconds: 60 },
      initial,
    );
    expect(result.commandedPosition).toBe(1);
    expect(result.state.valvePosition).toBe(0.45);
  });

  it('keeps the existing valve position on an actuator fault', () => {
    const initial = {
      ...newPoolTemperatureControl(30),
      valvePosition: 0.35,
      valveStuck: true,
    };
    expect(
      step({ poolTemperature: 29, dt: 60 }, initial).state.valvePosition,
    ).toBe(0.35);
  });

  it('uses the hand output while retaining filtration and isolation interlocks', () => {
    const hand = {
      ...newPoolTemperatureControl(30),
      mode: 'hand' as const,
      manualOutput: 0.7,
    };
    expect(step({ poolTemperature: 30, dt: 60 }, hand).commandedPosition).toBe(
      0.7,
    );
    expect(step({ circulationAvailable: false }, hand).interlock).toBe(
      'no-circulation',
    );
    expect(step({ primaryReturnIsolated: true }, hand).commandedPosition).toBe(
      0,
    );
  });

  it('exposes probe bias as a measured value and drives from it', () => {
    const state = {
      ...newPoolTemperatureControl(30),
      sensorFault: 'low' as const,
    };
    const result = step({ poolTemperature: 31 }, state);
    expect(result.measuredTemperature).toBe(26);
    expect(result.demand).toBe(1);
  });
});
