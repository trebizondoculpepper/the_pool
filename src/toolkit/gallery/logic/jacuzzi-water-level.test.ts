import { expect, test } from 'vite-plus/test';
import {
  JACUZZI_FLOOR_Y,
  JACUZZI_FULL_SURFACE_Y,
  jacuzziFloorAt,
} from './jacuzzi-water-level';

test('the raised Jacuzzi has a central floor and a shallow seat', () => {
  expect(jacuzziFloorAt(0, 0)).toBe(JACUZZI_FLOOR_Y);
  expect(jacuzziFloorAt(1, 0)).toBeCloseTo(JACUZZI_FULL_SURFACE_Y - 0.45);
  expect(jacuzziFloorAt(1.2, 0)).toBeNull();
});
