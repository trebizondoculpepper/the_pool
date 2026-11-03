import { describe, expect, it } from 'vite-plus/test';
import {
  energised,
  limits,
  newActuatedValve,
  stepActuatedValve,
  strokeTime,
  target,
} from './actuated-valve';
import type { ActuatedValveState } from './actuated-valve';

const run = (s: ActuatedValveState, seconds: number, stroke = 6) => {
  let state = s;
  for (let t = 0; t < seconds * 10; t++)
    state = stepActuatedValve(state, 0.1, stroke);
  return state;
};

describe('a solenoid-operated valve', () => {
  it('opens on its command, over its stroke, its limit switch made at the end', () => {
    let s = { ...newActuatedValve(false), command: true };
    expect(energised(s)).toBe(true);
    s = run(s, 3);
    expect(s.position).toBeCloseTo(0.5, 6);
    expect(limits(s)).toEqual({ open: false, shut: false });
    s = run(s, 3.1);
    expect(limits(s).open).toBe(true);
  });

  it('fails safe: shut on losing its power, or its air', () => {
    expect(
      limits(run({ ...newActuatedValve(true), power: false }, 7)).shut,
    ).toBe(true);
    expect(limits(run({ ...newActuatedValve(true), air: false }, 7)).shut).toBe(
      true,
    );
  });

  it('opens by its manual override with its power gone, but not without air', () => {
    const dead = { ...newActuatedValve(false), power: false, override: true };
    expect(limits(run(dead, 7)).open).toBe(true);
    expect(limits(run({ ...dead, air: false }, 7)).shut).toBe(true);
  });

  it('strokes a big valve slower than a small one', () => {
    expect(strokeTime(0.355)).toBeGreaterThan(strokeTime(0.054));
  });
});

describe('a modulating valve', () => {
  const settled = (s: ActuatedValveState) =>
    Math.abs(s.position - target(s)) <= 1e-6;

  it('a part-open valve with its commanded position is settled, not perpetually travelling', () => {
    const s: ActuatedValveState = {
      ...newActuatedValve(false),
      position: 0.3,
      targetPosition: 0.3,
    };
    expect(target(s)).toBe(0.3);
    expect(settled(s)).toBe(true);
  });

  it('moves only on a command step, then settles', () => {
    const start: ActuatedValveState = {
      ...newActuatedValve(false),
      position: 0.3,
      targetPosition: 0.3,
    };
    const stepped: ActuatedValveState = {
      ...start,
      targetPosition: 0.4,
    };
    // A moment into the stroke it is travelling…
    const mid = stepActuatedValve(stepped, 0.1, 6);
    expect(settled(mid)).toBe(false);
    // …then it reaches the commanded position and holds there.
    const out = run(stepped, 7, 6);
    expect(out.position).toBeCloseTo(0.4, 6);
    expect(settled(out)).toBe(true);
  });

  it('an on/off valve is unchanged (no targetPosition)', () => {
    const s = { ...newActuatedValve(false), command: true };
    expect(target(s)).toBe(1);
    expect(settled(s)).toBe(false);
  });
});
