import { describe, expect, it } from 'vite-plus/test';
import {
  CAD_GRID,
  CAD_MARGIN,
  CAD_VIEWS,
  GRAPH_PAPER,
  cadCacheKey,
  dimensionsMm,
  fingerprint,
  gridLinePixels,
  gridOffset,
  isFresh,
  orthoFrame,
  perspectivePose,
  scaleBar,
  sheetScale,
  viewDimensions,
} from './cad-views';
import type { Bounds } from './cad-views';

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

const box = (w: number, h: number, d: number, y = 0): Bounds => ({
  min: { x: -w / 2, y, z: -d / 2 },
  max: { x: w / 2, y: y + h, z: d / 2 },
});
const view = (name: string) => CAD_VIEWS.find((v) => v.name === name)!;

describe('the CAD views', () => {
  it('lays out TOP, FRONT, SIDE and PERSPECTIVE, front at +z', () => {
    expect(CAD_VIEWS.map((v) => v.label)).toEqual([
      'TOP',
      'FRONT',
      'SIDE',
      'PERSPECTIVE',
    ]);
    expect(view('front').from).toEqual([0, 0, 1]);
    // Top view: the front (+z) is at the bottom, so up on the sheet is -z.
    expect(view('top').up).toEqual([0, 0, -1]);
  });

  it('gives the three flat views one scale, fitting the biggest size in the margin', () => {
    const boiler = box(1.6, 1.9, 0.7);
    const px = 480;
    const s = sheetScale(boiler, px);
    expect(s * 1.9).toBeCloseTo(px * (1 - 2 * CAD_MARGIN));
    const halves = ['top', 'front', 'side'].map(
      (n) => orthoFrame(boiler, view(n), px).half,
    );
    expect(new Set(halves).size).toBe(1);
    expect(halves[0] * 2 * s).toBeCloseTo(px);
  });

  it('frames a small item as well as a large one', () => {
    const terminal = box(0.76, 0.05, 0.04, 1.2);
    const f = orthoFrame(terminal, view('front'), 480);
    expect(f.target).toEqual([0, 1.225, 0]);
    expect(f.position[2]).toBeGreaterThan(terminal.max.z);
    expect(0.76 * sheetScale(terminal, 480)).toBeCloseTo(480 * 0.76);
  });

  it('sizes the item in millimetres, each view its own pair', () => {
    const d = dimensionsMm(box(0.27, 0.16, 0.04));
    expect(d).toEqual({ w: 270, d: 40, h: 160 });
    expect(viewDimensions('front', d)?.words).toBe('270 × 160 mm');
    expect(viewDimensions('top', d)?.words).toBe('270 × 40 mm');
    expect(viewDimensions('side', d)?.words).toBe('40 × 160 mm');
    expect(viewDimensions('perspective', d)).toBeNull();
  });

  it('picks a round scale bar that fits', () => {
    expect(scaleBar(1000, 120)).toMatchObject({ mm: 100, label: '100 mm' });
    expect(scaleBar(200, 250)).toMatchObject({ mm: 1000, label: '1 m' });
    expect(scaleBar(200, 250).pixels).toBeCloseTo(200);
    expect(scaleBar(5000, 30).mm).toBe(5);
  });

  it('stands the perspective camera off the front right corner, above', () => {
    const p = perspectivePose(box(1, 1, 1), 30);
    const [x, y, z] = p.position;
    expect(x).toBeGreaterThan(0.5);
    expect(z).toBeGreaterThan(0.5);
    expect(y).toBeGreaterThan(0.5);
  });
});

describe('the CAD views cache', () => {
  const key = {
    kind: 'boiler-cascade',
    variant: 'default',
    version: '0.13.4',
    build: 'abc',
    builder: fingerprint(['mesh', 24, 1.5]),
  };

  it('remakes views when the builder changes what it builds', () => {
    const before = cadCacheKey(key);
    const changed = cadCacheKey({
      ...key,
      builder: fingerprint(['mesh', 24, 1.6]),
    });
    expect(changed).not.toBe(before);
    expect(isFresh({ key: before }, changed)).toBe(false);
    expect(isFresh({ key: before }, before)).toBe(true);
    expect(isFresh(null, before)).toBe(false);
  });

  it('remakes views for a new build or version', () => {
    const before = cadCacheKey(key);
    expect(cadCacheKey({ ...key, build: 'abd' })).not.toBe(before);
    expect(cadCacheKey({ ...key, version: '0.13.5' })).not.toBe(before);
    expect(cadCacheKey({ ...key, variant: 'low' })).not.toBe(before);
  });

  it('hashes the same input the same way', () => {
    expect(fingerprint(['a', 1])).toBe(fingerprint(['a', 1]));
    expect(fingerprint(['a', 1])).toMatch(/^[0-9a-f]{8}$/);
  });
});
