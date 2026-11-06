import { describe, expect, it } from 'vite-plus/test';
import { isPile, stackPose, STACK_PILE_MAX_RATIO } from './stack';

describe('the stack placement (mission 212)', () => {
  it('allows a similar-sized upper on a slightly larger lower, centred with a small offset', () => {
    const p = stackPose(
      { width: 0.2, depth: 0.1 },
      { width: 0.3, depth: 0.15 },
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
      { width: 0.15, depth: 0.12 },
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

  it('only perilous offsets on a similar-sized lower: book on desk is placement, book on book is a pile (issue #11 ruling, 2026-11-06)', () => {
    // A box on a desk: the desk's top is far bigger, so it is not a lethal
    // pile — the resolver puts it down ordinarily, with 210's exact aimed
    // spot; `stackPose` refuses so the caller does not centre it.
    const onDesk = stackPose(
      { width: 0.2, depth: 0.12 },
      { width: 1.6, depth: 0.8 },
      () => 0.9, // a large uniform draw, that would give a big offset
    );
    expect(onDesk.ok).toBe(false);
    // A box on a similar box: within the pile band, offsets apply.
    const onBook = stackPose(
      { width: 0.2, depth: 0.12 },
      { width: 0.22, depth: 0.13 },
      () => 0.9,
    );
    expect(onBook.ok).toBe(true);
    expect(onBook.x).not.toBe(0);
    // The area rule still gates placement on any top.
    expect(
      stackPose({ width: 2, depth: 2 }, { width: 1.6, depth: 0.8 }, () => 0.5)
        .ok,
    ).toBe(false);
  });

  it('isPile is true only within the pile band', () => {
    // A book on a book: similar, a pile.
    expect(
      isPile({ width: 0.2, depth: 0.12 }, { width: 0.22, depth: 0.13 }),
    ).toBe(true);
    // A book on a desk: the width ratio is far over the band — not a pile.
    expect(
      isPile({ width: 0.2, depth: 0.12 }, { width: 1.6, depth: 0.8 }),
    ).toBe(false);
    // Just inside and just outside the band edge.
    expect(
      isPile(
        { width: 0.2, depth: 0.2 },
        { width: 0.2 * STACK_PILE_MAX_RATIO, depth: 0.2 },
      ),
    ).toBe(true);
    expect(
      isPile(
        { width: 0.2, depth: 0.2 },
        { width: 0.2 * STACK_PILE_MAX_RATIO + 0.001, depth: 0.2 },
      ),
    ).toBe(false);
  });
});
