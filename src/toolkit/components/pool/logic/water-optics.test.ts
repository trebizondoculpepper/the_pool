import { describe, expect, it } from 'vite-plus/test';
import {
  ABSORPTION,
  CAUSTIC_FOCUS,
  causticFocus,
  SCATTER,
  SCATTER_PER_NTU,
  WATER_IOR,
  conditionOptics,
  greenBeam,
  poolBeer,
  snellsWindow,
  throughWater,
  transmittance,
  turbidityOptics,
  viewPath,
  visibility,
  waterFog,
  waterPathLength,
} from './water-optics';

describe('light through the pool’s water', () => {
  it('follows Beer–Lambert: each metre keeps the same fraction, red least', () => {
    const [r1, g1, b1] = transmittance(1);
    const [r2] = transmittance(2);
    expect(r1).toBeCloseTo(Math.exp(-ABSORPTION[0]), 12);
    expect(r2).toBeCloseTo(r1 * r1, 12);
    expect(r1).toBeLessThan(g1);
    expect(g1).toBeLessThan(b1);
  });

  it('lengthens the line of sight as the view flattens, bent by refraction', () => {
    expect(viewPath(1, -1)).toBeCloseTo(1, 12);
    expect(viewPath(1, -0.5)).toBeGreaterThan(1);
    // Refraction keeps even a grazing view's path finite.
    expect(viewPath(1, 0)).toBeLessThan(1.6);
  });

  it('turns white tile turquoise, then deeper blue-green, with depth', () => {
    const shallow = throughWater([1, 1, 1], 0.9, -0.7);
    const deep = throughWater([1, 1, 1], 2, -0.7);
    expect(shallow[0]).toBeLessThan(shallow[2]);
    expect(deep[0]).toBeLessThan(shallow[0]);
    expect(deep[1] + deep[2]).toBeLessThan(shallow[1] + shallow[2]);
  });

  it('focuses its caustics: none at the surface, brightest at the focal depth, fading beyond', () => {
    expect(causticFocus(0)).toBe(0);
    expect(causticFocus(CAUSTIC_FOCUS)).toBeCloseTo(1, 12);
    expect(causticFocus(0.2)).toBeLessThan(causticFocus(0.6));
    expect(causticFocus(2)).toBeLessThan(causticFocus(1));
  });

  it('measures the line of sight under the water plane across a crossing surface', () => {
    expect(waterPathLength([0, -1, 0], [0, 1, 0], 0)).toBeCloseTo(1, 12);
    expect(waterPathLength([0, -1, 0], [0, -2, 0], 0)).toBeCloseTo(1, 12);
    expect(waterPathLength([0, 1, 0], [0, 2, 0], 0)).toBe(0);
    // An oblique crossing, from below the surface to above it.
    expect(waterPathLength([0, -1, 0], [2, 1, 0], 0)).toBeCloseTo(
      Math.sqrt(2),
      12,
    );
  });

  it('fogs a colour by its underwater path, fading to the water’s glow', () => {
    expect(waterFog([1, 1, 1], 0)).toEqual([1, 1, 1]);
    const shallow = waterFog([1, 1, 1], 1);
    const deep = waterFog([1, 1, 1], 30);
    expect(shallow[0]).toBeLessThan(shallow[2]);
    expect(deep[0]).toBeLessThan(shallow[0]);
    expect(deep[0]).toBeCloseTo(SCATTER[0], 6);
  });

  it('opens Snell’s window to about 97° above the swimmer', () => {
    expect(snellsWindow()).toBeCloseTo(
      2 * Math.asin(1 / WATER_IOR) * (180 / Math.PI),
      12,
    );
    expect(snellsWindow()).toBeGreaterThan(90);
    expect(snellsWindow()).toBeLessThan(100);
  });

  it('keeps clean water exactly as today: no scattering, the base absorption', () => {
    const clean = turbidityOptics(0);
    expect(clean.scattering).toBe(0);
    expect(clean.absorption).toEqual(ABSORPTION);
    // The per-pool formula at zero scattering matches the plain fog.
    expect(poolBeer(ABSORPTION, 0, SCATTER, [1, 1, 1], 2)).toEqual(
      waterFog([1, 1, 1], 2),
    );
  });

  it('adds about 1 m⁻¹ of scattering per NTU (the research’s rule of thumb)', () => {
    expect(SCATTER_PER_NTU).toBe(1);
    expect(turbidityOptics(0.5).scattering).toBeCloseTo(0.5, 12);
    expect(turbidityOptics(2).scattering).toBeCloseTo(2, 12);
  });

  it('hides the deep floor as turbidity rises (PWTAG’s visual test)', () => {
    // clean 0.5 NTU: c(green) = 0.1 + 0.5, visibility ≈ 8 m — the deep floor shows.
    expect(visibility(greenBeam(0.5))).toBeCloseTo(4.8 / 0.6, 10);
    expect(visibility(greenBeam(0.5))).toBeGreaterThan(6);
    // 2 NTU: about 2.3 m of visibility — the deep floor goes.
    expect(visibility(greenBeam(2))).toBeCloseTo(4.8 / 2.1, 8);
    // 10 NTU: about half a metre.
    expect(visibility(greenBeam(10))).toBeCloseTo(4.8 / 10.1, 6);
  });

  it('tints polluted water and fogs it with its solids (the model today)', () => {
    const clean = conditionOptics({ solids: 0, organics: 0 });
    expect(clean.absorption).toEqual(ABSORPTION);
    const dirty = conditionOptics({ solids: 5, organics: 0.8 });
    expect(dirty.scattering).toBeCloseTo(5, 12);
    // Organics add a yellow-grey cast: red absorbs fastest.
    expect(dirty.absorption[0]).toBeGreaterThan(ABSORPTION[0]);
    expect(dirty.scattering).toBeGreaterThan(clean.scattering);
  });
});
