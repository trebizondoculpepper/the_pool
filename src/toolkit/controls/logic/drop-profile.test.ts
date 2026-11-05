import { describe, expect, it } from 'vite-plus/test';
import { boxRestAngle } from './drop-profile';

describe('boxRestAngle', () => {
  it('settles a box on its flat face, either way up, never an edge', () => {
    expect(boxRestAngle(0.3)).toBe(0);
    expect(boxRestAngle(Math.PI / 2 + 0.01)).toBeCloseTo(Math.PI);
    expect(boxRestAngle(Math.PI / 2 - 0.01)).toBe(0);
    expect(boxRestAngle(-2.9)).toBeCloseTo(-Math.PI);
  });
});
