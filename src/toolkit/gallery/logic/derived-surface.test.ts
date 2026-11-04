import { describe, expect, test } from 'vite-plus/test';
import {
  deriveSurface,
  edgeSolids,
  planeSurface,
  surfaceAt,
  surfaceSupports,
} from './derived-surface';
import type { SurfaceSample } from './derived-surface';

const grid = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  n: number,
  y: (x: number, z: number) => number | null,
): SurfaceSample[] => {
  const out: SurfaceSample[] = [];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const x = minX + ((maxX - minX) * i) / n;
      const z = minZ + ((maxZ - minZ) * j) / n;
      out.push({ x, z, y: y(x, z) });
    }
  return out;
};
const opts = { tolerance: 0.01, step: 0.3, walkable: true };

describe('deriving a plane', () => {
  test('a flat desk top', () => {
    const s = deriveSurface(
      grid(-0.8, 0.8, -0.4, 0.4, 20, () => 0.75),
      opts,
    )!;
    expect(s.top).toBeCloseTo(0.75);
    expect([s.minX, s.maxX, s.minZ, s.maxZ]).toEqual([-0.8, 0.8, -0.4, 0.4]);
    expect(s.confidence).toBe('good');
  });

  test('a tank roof with proud flanges and a hatch: the roof, not the flanges, nor a tall cage beside it', () => {
    const samples = grid(-3.5, 3, -1.5, 1.5, 40, (x, z) => {
      if (x < -3) return z > 1 ? 3.4 : null; // the ladder cage beside the tank
      if (Math.abs(x % 1) < 0.05) return 2.31; // flanges
      if (x > 1 && x < 1.6 && z > -0.3 && z < 0.3) return 2.3; // hatch
      return 2.25;
    });
    const s = deriveSurface(samples, opts)!;
    expect(s.top).toBeCloseTo(2.25, 2);
    expect(s.minX).toBeGreaterThanOrEqual(-3);
    expect(s.maxX).toBeCloseTo(3);
  });

  test('little coverage is weak; nothing hit is no surface', () => {
    const sparse = grid(0, 1, 0, 1, 10, (x, z) =>
      x === 0 || z === 0 || x === 1 || z === 1 ? 1 : (x + z) * 3,
    );
    expect(deriveSurface(sparse, opts)!.confidence).toBe('weak');
    expect(
      deriveSurface(
        grid(0, 1, 0, 1, 4, () => null),
        opts,
      ),
    ).toBeNull();
  });
});

describe('the walker on a surface', () => {
  const roof = planeSurface(
    { minX: -3, maxX: 3, minZ: -1.5, maxZ: 1.5 },
    2.25,
    true,
  );

  test('stands on it when already up at it, never steps up from the floor', () => {
    expect(surfaceAt([roof], 0, 0, 2.3, 0.5)).toBe(2.25);
    expect(surfaceAt([roof], 0, 0, 0, 0.5)).toBeNull();
    expect(surfaceAt([roof], 4, 0, 2.25, 0.5)).toBeNull();
  });

  test('a supportable-only top bears objects, not the walker', () => {
    const desk = planeSurface(
      { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
      0.75,
      false,
    );
    expect(surfaceAt([desk], 0.5, 0.5, 0.75, 0.5)).toBeNull();
    expect(surfaceSupports([desk])).toEqual([
      { minX: 0, maxX: 1, minZ: 0, maxZ: 1, top: 0.75 },
    ]);
  });

  test('its edges stop the walker where the drop is over 1 m, and not where it is a step', () => {
    expect(edgeSolids(roof, 0, 1, 0.05)).toHaveLength(4);
    expect(
      edgeSolids(
        planeSurface({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, 0.4, true),
        0,
        1,
        0.05,
      ),
    ).toEqual([]);
  });
});
