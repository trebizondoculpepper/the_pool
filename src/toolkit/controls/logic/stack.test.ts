import { describe, expect, it } from 'vite-plus/test';
import { stackPose } from './stack';

describe('the stack placement (mission 212)', () => {
  it('allows a smaller upper on a larger lower, centred with a small offset', () => {
    const p = stackPose(
      { width: 0.2, depth: 0.1 },
      { width: 0.3, depth: 0.2 },
      () => 0.5,
    );
    expect(p.ok).toBe(true);
    // Offsets are small: a few % of the smaller dimension.
    expect(Math.abs(p.x)).toBeLessThan(0.02 * 1.5);
    expect(Math.abs(p.z)).toBeLessThan(0.01 * 1.5);
  });

  it('allows an upper up to 105% of the lower’s area', () => {
    // upper 0.22 × 0.12 = 0.0264; lower 0.3 × 0.1 = 0.03 → 88%, allowed.
    expect(
      stackPose(
        { width: 0.22, depth: 0.12 },
        { width: 0.3, depth: 0.1 },
        () => 0.5,
      ).ok,
    ).toBe(true);
    // exactly 105%
    expect(
      stackPose(
        { width: 0.35, depth: 0.09 },
        { width: 0.3, depth: 0.1 },
        () => 0.5,
      ).ok,
    ).toBe(true);
    // 106%
    expect(
      stackPose(
        { width: 0.36, depth: 0.09 },
        { width: 0.3, depth: 0.1 },
        () => 0.5,
      ).ok,
    ).toBe(false);
  });

  it('scales its offsets with 5% of the smaller item on each axis', () => {
    // A constant 0.5 source gives a fixed gaussian draw; the offset scales.
    const small = stackPose(
      { width: 0.1, depth: 0.1 },
      { width: 0.3, depth: 0.2 },
      () => 0.5,
    );
    const big = stackPose(
      { width: 0.28, depth: 0.19 },
      { width: 0.3, depth: 0.2 },
      () => 0.5,
    );
    expect(big.ok && small.ok).toBe(true);
    if (!big.ok || !small.ok) return;
    // A wider upper ⇒ a larger SD on x (5% of the smaller of the two).
    expect(Math.abs(big.x)).toBeGreaterThan(Math.abs(small.x));
  });
});
