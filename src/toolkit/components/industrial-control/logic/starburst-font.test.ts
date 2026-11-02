import { describe, expect, it } from 'vite-plus/test';
import {
  SEGMENTS,
  STARBURST_CHARACTERS,
  canDraw,
  segmentStroke,
  starburst,
  undrawable,
} from './starburst-font';
import type { Segment } from './starburst-font';

const lit = (c: string) => [...(starburst(c) ?? [])].sort().join(' ');
const has = (c: string, ...s: Segment[]) =>
  s.every((x) => starburst(c)?.has(x));

describe('the starburst character set', () => {
  it('draws A to Z, 0 to 9, space and the punctuation the game shows', () => {
    const wanted =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ' + "-+/\\*<>_'.,=()%?!";
    expect(undrawable(wanted)).toEqual([]);
    expect(canDraw(wanted)).toBe(true);
  });

  it('cannot draw a colon: times take a dash instead', () => {
    expect(starburst(':')).toBe(null);
    expect(canDraw('02:30')).toBe(false);
    expect(canDraw('02-30')).toBe(true);
    expect(undrawable('12:00 é')).toEqual([':', 'é']);
  });

  it('folds lower case to upper case, as the period’s decoders did', () => {
    expect(lit('h')).toBe(lit('H'));
    expect(lit('m')).toBe(lit('M'));
    expect(canDraw('IN 3h05 m3 120s')).toBe(true);
  });

  it('leaves a space blank and lights something of every other character', () => {
    expect(starburst(' ')?.size).toBe(0);
    for (const c of STARBURST_CHARACTERS.replace(' ', ''))
      expect(starburst(c)!.size, c).toBeGreaterThan(0);
  });

  it('gives every letter and digit a glyph of its own', () => {
    const seen = new Map<string, string>();
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
      const key = lit(c);
      expect(seen.get(key), `${c} looks like ${seen.get(key)}`).toBeUndefined();
      seen.set(key, c);
    }
  });

  it('draws M, W, K, X, V, N and Z on their diagonals, as they read', () => {
    // M: both sides, both upper diagonals meeting in the middle.
    expect(has('M', 'B', 'C', 'E', 'F', 'H', 'K')).toBe(true);
    expect(has('M', 'L') || has('M', 'N')).toBe(false);
    // W: M upside down.
    expect(has('W', 'B', 'C', 'E', 'F', 'L', 'N')).toBe(true);
    expect(has('W', 'H') || has('W', 'K')).toBe(false);
    // N: both sides and the falling diagonal, top left to bottom right.
    expect(has('N', 'B', 'C', 'E', 'F', 'H', 'L')).toBe(true);
    // K: the left side, its middle stub, an arm up and a leg down.
    expect(has('K', 'E', 'F', 'G1', 'K', 'L')).toBe(true);
    expect(has('K', 'B') || has('K', 'C')).toBe(false);
    // X: the four diagonals and nothing else.
    expect(lit('X')).toBe('H K L N');
    // V: the left side and the two diagonals meeting at the foot.
    expect(has('V', 'E', 'F', 'K', 'N')).toBe(true);
    // Z: top, bottom and the rising diagonal through the middle.
    expect(lit('Z')).toBe('A D K N');
  });

  it('places every segment in its cell as a separate bar', () => {
    for (const s of SEGMENTS) {
      const [x0, y0, x1, y1] = segmentStroke(s);
      if (s === 'DP') {
        expect(x0).toBeGreaterThan(1);
        continue;
      }
      for (const v of [x0, y0, x1, y1]) {
        expect(v, s).toBeGreaterThanOrEqual(0);
        expect(v, s).toBeLessThanOrEqual(1);
      }
      expect(Math.hypot(x1 - x0, y1 - y0), s).toBeGreaterThan(0.2);
    }
    // No two segments' ends meet: a gap at every node.
    const ends = SEGMENTS.filter((s) => s !== 'DP').flatMap((s) => {
      const [x0, y0, x1, y1] = segmentStroke(s);
      return [
        { s, x: x0, y: y0 },
        { s, x: x1, y: y1 },
      ];
    });
    for (const a of ends)
      for (const b of ends)
        if (a.s !== b.s)
          expect(
            Math.hypot(a.x - b.x, a.y - b.y),
            `${a.s} and ${b.s}`,
          ).toBeGreaterThan(0.08);
  });
});
