import { expect, test } from 'vite-plus/test';
import {
  HAND_MOVE_SECONDS,
  easeInOut,
  footprintOn,
  handMove,
} from './hand-move';

test('a move eases in and out over about half a second', () => {
  expect(HAND_MOVE_SECONDS).toBeCloseTo(0.5);
  expect(easeInOut(0)).toBe(0);
  expect(easeInOut(1)).toBe(1);
  expect(easeInOut(0.5)).toBeCloseTo(0.5);
  // Slow at both ends: less than linear early, more than linear late.
  expect(easeInOut(0.1)).toBeLessThan(0.1);
  expect(easeInOut(0.9)).toBeGreaterThan(0.9);
  expect(handMove(0.25)).toEqual({ k: 0.5, done: false });
  expect(handMove(0.6).done).toBe(true);
  expect(handMove(0.6).k).toBe(1);
});

test('a footprint must lie wholly on its top, no corner overhanging', () => {
  const desk = { minX: 0, maxX: 1.6, minZ: 0, maxZ: 0.8 };
  expect(
    footprintOn({ minX: 0.2, maxX: 0.5, minZ: 0.1, maxZ: 0.3 }, desk),
  ).toBe(true);
  expect(
    footprintOn({ minX: 1.4, maxX: 1.7, minZ: 0.1, maxZ: 0.3 }, desk),
  ).toBe(false);
  expect(
    footprintOn({ minX: 0.2, maxX: 0.5, minZ: -0.05, maxZ: 0.2 }, desk),
  ).toBe(false);
});
