import { describe, expect, it } from 'vite-plus/test';
import {
  bandFromDial,
  controllerOutput,
  newModulatingValve,
  stepController,
  stepModulatingValve,
  temperatureOutput,
  valveError,
} from './modulating-control';

describe('the ideal modulating controller', () => {
  it('asks full output a band below the set point, none at or above it', () => {
    // Band 2 K, set 28 °C.
    expect(temperatureOutput(25, 28, 2)).toBe(1); // 3 K under: full.
    expect(temperatureOutput(27, 28, 2)).toBe(0.5); // 1 K under: half.
    expect(temperatureOutput(28, 28, 2)).toBe(0); // at set: none.
    expect(temperatureOutput(29, 28, 2)).toBe(0); // above: none.
  });

  it('clamps the output to 0..1', () => {
    expect(controllerOutput(20, 28, 2)).toBe(1);
    expect(controllerOutput(30, 28, 2)).toBe(0);
  });

  it('the band dial is 1 to 10 kelvin, 1 aggressive', () => {
    // The dial reads the band directly; 1 K below set point at dial 1 is
    // full output, at dial 10 is a tenth.
    expect(bandFromDial(1)).toBe(1);
    expect(bandFromDial(4)).toBe(4);
    expect(bandFromDial(10)).toBe(10);
    expect(bandFromDial(0)).toBe(1); // clamped
    expect(bandFromDial(99)).toBe(10); // clamped
    // The owner's example: 0.8 K under set at dial 4 → 20% open.
    expect(temperatureOutput(27.2, 28, bandFromDial(4))).toBeCloseTo(0.2, 5);
    // Dial 1: 0.8 K under → 80% open (aggressive).
    expect(temperatureOutput(27.2, 28, bandFromDial(1))).toBeCloseTo(0.8, 5);
  });

  it('AUTO runs the law, HAND holds the output, OFF closes it', () => {
    const base = {
      measured: 27.2,
      setpoint: 28,
      band: 4,
      output: 0.5,
      mode: 'auto' as const,
    };
    expect(stepController(base).output).toBeCloseTo(0.2, 5);
    expect(stepController({ ...base, mode: 'hand', output: 0.7 }).output).toBe(
      0.7,
    );
    expect(stepController({ ...base, mode: 'off' }).output).toBe(0);
  });

  it('a modulating valve moves to its command over a finite stroke', () => {
    let s = newModulatingValve(10);
    expect(s.position).toBe(0);
    s = { ...s, command: 1 };
    s = stepModulatingValve(s, 2);
    expect(s.position).toBeCloseTo(0.2, 5);
    for (let i = 0; i < 50 && valveError(s) > 1e-6; i++)
      s = stepModulatingValve(s, 2);
    expect(s.position).toBeCloseTo(1, 5);
  });

  it('a modulating valve holds its place without power', () => {
    let s = newModulatingValve(10);
    s = { ...s, command: 1, powered: false };
    s = stepModulatingValve(s, 5);
    expect(s.position).toBe(0);
  });
});
