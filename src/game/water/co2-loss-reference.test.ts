import { describe, expect, it } from 'vite-plus/test';
import {
  acidFor,
  co2Equilibrium,
  co2LossConstant,
  readings,
  stepChemistry,
  waterFrom,
} from './pool-chemistry';
import type { ChemistryInputs } from './pool-chemistry';
import { JACUZZI_AERATION } from '../plant/water-treatment';

/**
 * Carbon dioxide's loss tethered to reality (mission 118's first step,
 * `doc/plans/aqualis-advice-verification.md`, "CO₂ loss reference cases"):
 * Wojtowicz's own measurements, the range he fitted on, and the transfer
 * velocities measured at calm and stirred water surfaces. The numbers here
 * are the plan doc's, worked by hand from his general equation, not by
 * the model.
 */

/** Wojtowicz's test pool: 6,800 gal (25.74 m³), 3.57 ft deep (SVR 0.28 ft⁻¹ = 0.919 m⁻¹), 82 °F. */
const SVR = 0.28 / 0.3048;
const WOJ_V = 25.74;
const wojPool = (turnovers: number): ChemistryInputs => ({
  volume: WOJ_V,
  surface: WOJ_V * SVR,
  circulation: (turnovers * WOJ_V) / 24,
  temperature: 27.8,
});

/** The pools, as `plant/pools.ts` sizes them, and the bench's textbook 25 m pool. */
const POOLS: Record<
  string,
  ChemistryInputs & { alkalinity: number; k: number; acid: number }
> = {
  // k: his general equation, turnovers held at 7.41; acid: g HCl/m³/day holding pH 7.3.
  lounge: {
    volume: 138.9,
    surface: 153.8,
    circulation: 90,
    temperature: 30,
    alkalinity: 120,
    k: 0.2426,
    acid: 14.5,
  },
  olympic: {
    volume: 2500,
    surface: 1250,
    circulation: 620,
    temperature: 28,
    alkalinity: 120,
    k: 0.0793,
    acid: 4.9,
  },
  '25 m': {
    volume: 470,
    surface: 312.5,
    circulation: 500 / 3,
    temperature: 28,
    alkalinity: 120,
    k: 0.1379,
    acid: 8.5,
  },
  jacuzzi: {
    volume: 2.83,
    surface: 4.52,
    circulation: 8,
    temperature: 37,
    alkalinity: 100,
    k: 0.4221,
    acid: 15.6,
  },
  footbath: {
    volume: 0.9,
    surface: 6,
    circulation: 6,
    temperature: 34,
    alkalinity: 100,
    k: 1.627,
    acid: 61.4,
  },
};

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

/** A pool's water at pH 7.3 and its alkalinity, in an 800 ppm hall. */
const waterOf = (p: (typeof POOLS)[string]) =>
  waterFrom({
    ph: 7.3,
    alkalinity: p.alkalinity,
    hardness: 250,
    tds: 800,
    temperature: p.temperature,
    freeChlorine: 0,
  });

/** The acid that holds the pH, g HCl per m³ a day: ten minutes' loss, then the acid that takes it back. */
function holdingAcid(p: (typeof POOLS)[string]): number {
  const w0 = waterOf(p);
  let w = w0;
  for (let s = 0; s < 60; s++)
    w = stepChemistry(w, { ...p, airCo2: 800 }, 10).water;
  return (acidFor(w, w0.ph, p.volume, p.temperature) / p.volume) * 144;
}

describe('reference: Wojtowicz’s measured CO₂ loss constants, at his pool’s conditions', () => {
  // Table 3 (observed): pump off, 8 h a day, 24 h a day at 35 gpm.
  for (const [tr, k] of [
    [0, 0.034],
    [2.47, 0.066],
    [7.41, 0.19],
  ])
    it(`${tr} turnovers a day: k = ${k} (ppm·day)⁻¹ (±10 %)`, () => {
      expect(rel(co2LossConstant(wojPool(tr)), k)).toBeLessThan(0.1);
    });
});

describe('reference: his general equation within his range, held at its edge beyond it', () => {
  for (const [name, p] of Object.entries(POOLS))
    it(`${name}: k = ${p.k} (±3 %)`, () => {
      expect(rel(co2LossConstant(p), p.k)).toBeLessThan(0.03);
    });
  it('k rises with the turnovers to his 7.41 and no further, continuously', () => {
    const at = (tr: number) => co2LossConstant(wojPool(tr));
    for (let tr = 0; tr < 7.4; tr += 0.1)
      expect(at(tr + 0.1)).toBeGreaterThan(at(tr));
    expect(at(7.41 + 1e-6) - at(7.41 - 1e-6)).toBeLessThan(1e-6);
    expect(at(160)).toBeCloseTo(at(7.41), 9);
  });
});

describe('reference: the acid that holds the pH at 7.3 (g HCl/m³ a day, ±15 %)', () => {
  for (const [name, p] of Object.entries(POOLS))
    it(`${name}, alkalinity ${p.alkalinity}: ${p.acid}`, () => {
      expect(rel(holdingAcid(p), p.acid)).toBeLessThan(0.15);
    });
});

describe('reference: transfer velocity within what calm and stirred surfaces show', () => {
  // Apparent K_L = loss / (excess × surface/volume): calm water about 0.6
  // cm/h (k600, Tellus B 66:23795, 2014), Wojtowicz's fully pumped outdoor
  // pool 5 to 9 cm/h at an excess of 5 to 9 mg/l; nothing without jets or air above it.
  for (const [name, p] of Object.entries(POOLS))
    it(`${name}: 0.5 to 9 cm/h`, () => {
      const w = waterOf(p);
      const e =
        readings(w, p.temperature).co2 - co2Equilibrium(800, p.temperature);
      const perDay = co2LossConstant(p) * e; // a day⁻¹
      const cmH = ((perDay * (p.volume / p.surface)) / 24) * 100;
      expect(cmH).toBeGreaterThan(0.5);
      expect(cmH).toBeLessThan(9);
    });
});

describe('reference: Wojtowicz’s pH drift (Table 2), his pool, 24 h pump, no acid for 7 days', () => {
  // Carbonate alkalinity 79, pH 7.39 → 8.03 (and 54: 7.33 → 7.82; 96: 7.33 → 8.03).
  // His pool carried 69 ppm cyanuric acid, whose buffer the model leaves out,
  // so the model's rise may run a little further: ±0.15.
  for (const [alk, ph0, ph7] of [
    [54, 7.33, 7.82],
    [79, 7.39, 8.03],
    [96, 7.33, 8.03],
  ])
    it(`alkalinity ${alk}: ${ph0} → ${ph7} (±0.15)`, () => {
      let w = waterFrom({
        ph: ph0,
        alkalinity: alk,
        hardness: 440,
        tds: 1000,
        temperature: 27.8,
        freeChlorine: 1.1,
      });
      // 1990s air, his 0.45 ppm at equilibrium.
      for (let h = 0; h < 7 * 24; h++)
        w = stepChemistry(w, { ...wojPool(7.41), airCo2: 360 }, 3600).water;
      expect(Math.abs(w.ph - ph7)).toBeLessThan(0.15);
    });
});

describe('reference: a still hot tub drifts slowly; its jets and air drive it', () => {
  // A hot tub at alkalinity 100 and 37 °C, jets and air off: only its
  // surface, held at Wojtowicz's most-mixed constant (no faster than a day).
  it('jets and air off: pH 7.6 → 8.0 takes more than 12 h', () => {
    const p = POOLS.jacuzzi;
    let w = waterFrom({
      ph: 7.6,
      alkalinity: 100,
      hardness: 250,
      tds: 800,
      temperature: 37,
      freeChlorine: 3,
    });
    for (let m = 0; m < 12 * 60; m++)
      w = stepChemistry(w, { ...p, airCo2: 420 }, 60).water;
    expect(w.ph).toBeLessThan(8);
  });
  // TroubleFreePool's community: 7.6 to over 8 within 2 to 4 h of jets, alkalinity 80–120.
  for (const [alk, lo, hi] of [
    [80, 2, 5],
    [100, 1.5, 4],
    [120, 1.5, 4],
  ])
    it(`jets and air on, alkalinity ${alk}: pH 7.6 → 8.0 in ${lo} to ${hi} h`, () => {
      const p = POOLS.jacuzzi;
      let w = waterFrom({
        ph: 7.6,
        alkalinity: alk,
        hardness: 250,
        tds: 800,
        temperature: 37,
        freeChlorine: 3,
      });
      const aeration = JACUZZI_AERATION.jets + JACUZZI_AERATION.air;
      let minutes = 0;
      while (w.ph < 8 && minutes < 24 * 60) {
        w = stepChemistry(w, { ...p, airCo2: 420, aeration }, 60).water;
        minutes++;
      }
      expect(minutes / 60).toBeGreaterThan(lo);
      expect(minutes / 60).toBeLessThan(hi);
    });
});
