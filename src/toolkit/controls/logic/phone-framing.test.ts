import { describe, expect, it } from 'vite-plus/test';
import { phoneFraming } from './phone-framing';

describe('held phone framing', () => {
  it('keeps its projected size and position across field of view and zoom', () => {
    const projected = (fov: number, zoom: number, aspect: number) => {
      const frame = phoneFraming(fov, zoom, aspect, aspect, 1);
      const halfHeight = (0.7 * Math.tan((fov * Math.PI) / 360)) / zoom;
      return {
        size: frame.scale / halfHeight,
        x: frame.x / (halfHeight * aspect),
        y: frame.y / halfHeight,
      };
    };
    for (const aspect of [16 / 9, 390 / 844]) {
      const reference = projected(68, 1, aspect);
      for (const [fov, zoom] of [
        [45, 1],
        [95, 1],
        [68, 2],
      ]) {
        const actual = projected(fov, zoom, aspect);
        expect(actual.size).toBeCloseTo(reference.size);
        expect(actual.x).toBeCloseTo(reference.x);
        expect(actual.y).toBeCloseTo(reference.y);
      }
    }
  });

  it('uses the viewport shape when a portrait game canvas is letterboxed', () => {
    const portrait = phoneFraming(68, 1, 4 / 3, 390 / 844, 1);
    const landscape = phoneFraming(68, 1, 4 / 3, 16 / 9, 1);
    expect(portrait.x).toBeGreaterThan(landscape.x);
    expect(portrait.y).toBeCloseTo(0);
    expect(landscape.y).toBeCloseTo(0);
  });
});
