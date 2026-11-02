import { describe, expect, it } from 'vite-plus/test';
import { CAD_GRID, GRAPH_PAPER, gridLinePixels, gridOffset } from './cad-views';

describe('the CAD grid', () => {
  it('puts tile edges on whole world metres', () => {
    for (const start of [-3.4, -2, 0, 0.25, 1.75]) {
      const off = gridOffset(start);
      expect(off).toBeGreaterThanOrEqual(0);
      expect(off).toBeLessThan(1);
      // Texture coordinate at world x is (x - start) + off: whole at whole x.
      const at = (x: number) => x - start + off;
      expect(Math.abs(at(1) - Math.round(at(1)))).toBeLessThan(1e-9);
    }
  });

  it('rules ten minor lines a metre, graph paper a hundred', () => {
    expect(CAD_GRID.levels.map((l) => l.perMetre)).toEqual([10, 1]);
    expect(GRAPH_PAPER.levels.map((l) => l.perMetre)).toEqual([100, 10, 1]);
    expect(gridLinePixels(512, 10)).toHaveLength(10);
    expect(gridLinePixels(2000, 100)[1]).toBe(20);
  });
});
