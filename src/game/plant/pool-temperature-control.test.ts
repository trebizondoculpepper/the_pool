import { describe, expect, it } from 'vite-plus/test';
import {
  OUTPUT_STEP,
  newPoolTemperatureControl,
  quantize,
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
  it('hands over from HAND bumplessly even well below set point', () => {
    // P = 0.8 (1.6 K under a 2 K band) with HAND at 0: the integral goes to
    // -0.8, so AUTO starts where HAND left off rather than jumping to 0.8.
    const hand = step(
      { poolTemperature: 28.4 },
      { ...newPoolTemperatureControl(30), mode: 'hand', manualOutput: 0 },
    );
    expect(hand.state.integral).toBeCloseTo(-0.8);
    const back = step(
      { poolTemperature: 28.4 },
      { ...hand.state, mode: 'auto' },
    );
    expect(back.demand).toBeCloseTo(0);
  });
  it('integral action removes the proportional offset (PI control)', () => {
    // A load needing 0.45 of the valve: P alone settles 0.9 K short on a
    // 2 K band; the integral builds until the pool is back on set point.
    let state = newPoolTemperatureControl(30);
    let pool = 30;
    for (let t = 0; t < 4 * 3600; t += 10) {
      const r = step({ poolTemperature: pool, dt: 10, quantization: 0 }, state);
      state = r.state;
      pool += (state.valvePosition - 0.45) * 0.002 * 10;
    }
    expect(pool).toBeCloseTo(30, 1);
    expect(state.integral).toBeCloseTo(0.45, 1);
  });

  it('holds its integral while OFF or interlocked, and tracks HAND for a bumpless return', () => {
    const wound = { ...newPoolTemperatureControl(30), integral: 0.6 };
    expect(
      step({ poolTemperature: 29 }, { ...wound, mode: 'off' }).state.integral,
    ).toBe(0.6);
    expect(
      step({ poolTemperature: 29, primaryFlowIsolated: true }, wound).state
        .integral,
    ).toBe(0.6);
    const hand = step(
      { poolTemperature: 30 },
      { ...wound, mode: 'hand', manualOutput: 0.3 },
    );
    expect(hand.state.integral).toBeCloseTo(0.3);
    // Back to AUTO at set point: the same output, no bump.
    const back = step({ poolTemperature: 30 }, { ...hand.state, mode: 'auto' });
    expect(back.demand).toBeCloseTo(0.3);
  });
  it('steps its valve command by the output step, 0.1 by default', () => {
    expect(OUTPUT_STEP).toBe(0.1);
    // 0.76 K under a 2 K band asks 0.38: commanded as the nearest step.
    const asked = step({ poolTemperature: 29.24 });
    expect(asked.demand).toBeCloseTo(0.38);
    expect(asked.commandedPosition).toBe(0.4);
    // A finer step, or none.
    expect(
      step({ poolTemperature: 29.24, quantization: 0.05 }).commandedPosition,
    ).toBe(0.4);
    expect(
      step({ poolTemperature: 29.31, quantization: 0 }).commandedPosition,
    ).toBeCloseTo(0.345);
  });

  it('saves the commanded position into the state the world keeps', () => {
    expect(newPoolTemperatureControl(30).commandedPosition).toBe(0);
    const r = step({ poolTemperature: 29.24 });
    expect(r.state.commandedPosition).toBe(0.4);
  });

  it('holds the valve still while the demand stays within one step', () => {
    let state = { ...newPoolTemperatureControl(30), valvePosition: 0.4 };
    for (const t of [29.2, 29.18, 29.22, 29.16]) {
      const r = step({ poolTemperature: t, dt: 5 }, state);
      expect(r.commandedPosition).toBeCloseTo(0.4);
      expect(r.state.valvePosition).toBeCloseTo(0.4);
      state = r.state;
    }
  });

  it('rounds to the nearest step within 0 to 1', () => {
    expect(quantize(0.04, 0.1)).toBe(0);
    expect(quantize(0.06, 0.1)).toBeCloseTo(0.1);
    expect(quantize(0.96, 0.1)).toBe(1);
    expect(quantize(1.3, 0.1)).toBe(1);
    expect(quantize(-0.2, 0.1)).toBe(0);
    expect(quantize(0.333, 0)).toBeCloseTo(0.333);
  });
  it('opens proportionally below setpoint and settles at the setpoint', () => {
    expect(step({ poolTemperature: 29 }).commandedPosition).toBeCloseTo(0.5);
    expect(step({ poolTemperature: 30 }).commandedPosition).toBe(0);
    expect(step({ poolTemperature: 30.2 }).commandedPosition).toBe(0);
  });

  it('moves the valve at a finite stroke rate', () => {
    const initial = { ...newPoolTemperatureControl(30), valvePosition: 0.2 };
    const result = step(
      { poolTemperature: 27, dt: 15, strokeSeconds: 60 },
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

  it('closes a moving valve in OFF and restores demand in AUTO', () => {
    const off = {
      ...newPoolTemperatureControl(30),
      mode: 'off' as const,
      manualOutput: 0.8,
      valvePosition: 1,
    };
    const stopped = step({ poolTemperature: 28, dt: 30 }, off);
    expect(stopped.demand).toBe(0);
    expect(stopped.commandedPosition).toBe(0);
    expect(stopped.state.valvePosition).toBe(0.5);
    const resumed = step(
      { poolTemperature: 28, dt: 60 },
      { ...stopped.state, mode: 'auto' },
    );
    expect(resumed.commandedPosition).toBe(1);
    expect(resumed.state.valvePosition).toBe(1);
  });

  it('uses the selected proportional band in AUTO', () => {
    const narrow = { ...newPoolTemperatureControl(30), band: 1 };
    const wide = { ...narrow, band: 10 };
    expect(step({ poolTemperature: 29 }, narrow).commandedPosition).toBe(1);
    expect(step({ poolTemperature: 29 }, wide).commandedPosition).toBe(0.1);
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
