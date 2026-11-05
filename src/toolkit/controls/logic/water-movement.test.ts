import { describe, expect, test } from 'vite-plus/test';
import {
  mayCrossWaterEdge,
  swimmingEyeY,
  waterMode,
  type WaterSample,
} from './water-movement';

const pool = (depth: number, surface = 0, metre = 1): WaterSample => ({
  id: 'pool',
  floorY: (surface - depth) * metre,
  surfaceY: surface * metre,
});

describe('water movement', () => {
  test('local depth changes wading to swimming and drained water to dry', () => {
    expect(waterMode(pool(0.15), 1)).toBe('wading');
    expect(waterMode(pool(1.2), 1)).toBe('wading');
    expect(waterMode(pool(2), 1)).toBe('swimming');
    expect(waterMode(pool(0), 1)).toBe('dry');
    expect(waterMode(pool(2, 0, 9), 9)).toBe('swimming');
    expect(swimmingEyeY(pool(2, 0, 9), 9)).toBeCloseTo(1.08);
  });

  test('water permits ordinary deck entry and a shallow exit', () => {
    expect(mayCrossWaterEdge(null, pool(2), 0, -2, 1)).toBe(true);
    expect(mayCrossWaterEdge(pool(0.9), null, -0.9, 0, 1)).toBe(true);
    expect(mayCrossWaterEdge(pool(1, -1), null, -2, 0, 1)).toBe(true);
    expect(mayCrossWaterEdge(pool(2), null, -2, 0, 1)).toBe(false);
  });

  test('drained and partly drained deep edges prevent long drops', () => {
    expect(mayCrossWaterEdge(null, pool(0, -2), 0, -2, 1)).toBe(false);
    expect(mayCrossWaterEdge(null, pool(1, -1.2), 0, -2.2, 1)).toBe(false);
    expect(mayCrossWaterEdge(pool(0, -2), null, -2, 0, 1)).toBe(false);
    expect(mayCrossWaterEdge(null, pool(1, -1.2), 0, -2.2, 1, true)).toBe(true);
  });

  test('the same edge rule works at non-unit scene scale', () => {
    expect(mayCrossWaterEdge(null, pool(2, -0.2, 9), 0, -19.8, 9)).toBe(true);
    expect(mayCrossWaterEdge(null, pool(2, -1.2, 9), 0, -28.8, 9)).toBe(false);
  });
});
