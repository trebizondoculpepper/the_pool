import { describe, expect, it } from 'vite-plus/test';
import {
  dose,
  readings as chemistryReadings,
  waterFrom,
} from '../water/pool-chemistry';
import type { WaterSpec } from '../water/pool-chemistry';
import { advise, dilute } from './aqualis-advisor';
import type { Advice } from './aqualis-types';
import { MAINS } from './water-treatment';
import {
  TRIO_CHANNELS,
  readingsOf,
  rel,
  settingsAt,
} from './aqualis-advice.test-support';

/**
 * Independent reference cases (`doc/plans/aqualis-advice-verification.md`,
 * "Reference cases"): the chemistry (`dose`, `readings`) and Dr Aqualis's
 * Show dose checked against hand-worked trade and textbook rules of thumb,
 * each with its source and arithmetic in the plan doc. The numbers here
 * are the plan doc's, worked by hand, not by the model.
 */

const V = 100;
/** The textbook's water for the carbonate arithmetic: 25 °C, next to no salts (activities 1). */
const BENCH: WaterSpec = {
  ph: 7.5,
  alkalinity: 100,
  hardness: 250,
  tds: 1,
  temperature: 25,
  freeChlorine: 0,
  sulphate: 0,
};
const water = (over: Partial<WaterSpec> = {}) =>
  waterFrom({ ...BENCH, ...over });
const T = BENCH.temperature;

/** Show dose for one advice on a water, at V m³, the Trio's channels. */
function showDose(over: Partial<WaterSpec>, id: string): Advice {
  const w = water(over);
  const a = advise(readingsOf(w, T), settingsAt(V), TRIO_CHANNELS, w).find(
    (x) => x.id === id,
  );
  if (!a) throw new Error(`no ${id}`);
  return a;
}

describe('reference: sodium bicarbonate per 10 mg/l of alkalinity', () => {
  // 10 mg/l as CaCO₃ × 100 m³ = 1000 g CaCO₃ = 19.98 eq; × 84.007 g/eq = 1679 g.
  // Trade rule: 1.7 kg per 100 m³ (1.4 lb per 10,000 US gal).
  it('1.679 kg in 100 m³ raises alkalinity 10 mg/l (±1 %)', () => {
    const d = dose(water(), { bicarbonate: 1679 }, V, T);
    expect(rel(d.alkalinity - 100, 10)).toBeLessThan(0.01);
  });
  it('Show dose: 60 → 120 mg/l in 100 m³ is 10.07 kg (±3 %)', () => {
    const a = showDose({ alkalinity: 60 }, 'alkalinity-low');
    expect(a.dose?.unit).toBe('kg');
    expect(rel(a.dose!.amount, 10.07)).toBeLessThan(0.03);
  });
  it('raises the pH a little: +10 mg/l at pH 7.2, alkalinity 80 → pH 7.25 (±0.02)', () => {
    const d = dose(
      water({ ph: 7.2, alkalinity: 80 }),
      { bicarbonate: 1679 },
      V,
      T,
    );
    expect(Math.abs(d.ph - 7.251)).toBeLessThan(0.02);
  });
});

describe('reference: soda ash, its alkalinity and its pH', () => {
  // 10 mg/l as CaCO₃ = 19.98 eq × 52.99 g/eq (Na₂CO₃ / 2) = 1059 g per 100 m³.
  it('1.059 kg in 100 m³ raises alkalinity 10 mg/l (±1 %)', () => {
    const d = dose(water(), { sodaAsh: 1059 }, V, T);
    expect(rel(d.alkalinity - 100, 10)).toBeLessThan(0.01);
  });
  it('and the pH far more than bicarbonate: pH 7.2, alkalinity 80 → 7.50 (±0.03)', () => {
    const d = dose(water({ ph: 7.2, alkalinity: 80 }), { sodaAsh: 1059 }, V, T);
    expect(Math.abs(d.ph - 7.5)).toBeLessThan(0.03);
  });
  it('Show dose: pH 7.0 → 7.3 at alkalinity 100 is 1.94 kg per 100 m³ (±5 %)', () => {
    const a = showDose({ ph: 7.0, alkalinity: 100 }, 'ph-low');
    expect(a.additive).toBe('sodaAsh');
    expect(rel(a.dose!.amount, 1.943)).toBeLessThan(0.05);
  });
});

describe('reference: calcium chloride per 10 mg/l of hardness', () => {
  // 10 mg/l as CaCO₃ × 100 m³ = 1000 g = 9.991 mol × 110.98 = 1109 g anhydrous
  // (1.47 kg of the dihydrate flake; trade: about 1.5 kg of 77 % flake).
  it('1.109 kg (anhydrous) in 100 m³ raises hardness 10 mg/l (±1 %)', () => {
    const d = dose(water(), { calciumChloride: 1109 }, V, T);
    expect(rel(d.hardness - 250, 10)).toBeLessThan(0.01);
  });
  it('Show dose: 80 → 250 mg/l in 100 m³ is 18.85 kg (±3 %)', () => {
    const a = showDose({ hardness: 80 }, 'calcium-hardness-low');
    expect(rel(a.dose!.amount, 18.85)).toBeLessThan(0.03);
  });
});

describe('reference: hydrochloric acid per 0.1 pH', () => {
  // Closed carbonate system, pK₁ 6.35, pK₂ 10.33 (25 °C): C_T fixed by
  // the starting pH and alkalinity, the acid the alkalinity lost.
  const cases: [number, number, number, number][] = [
    // alkalinity, from, to, g HCl per 100 m³
    [50, 7.6, 7.5, 50.9],
    [100, 7.6, 7.5, 101.8],
    [200, 7.6, 7.5, 203.7],
    [100, 7.8, 7.7, 68.4],
  ];
  for (const [alk, from, to, g] of cases)
    it(`alkalinity ${alk}, pH ${from} → ${to}: ${g} g HCl in 100 m³ (±5 %)`, () => {
      const w = water({ ph: from, alkalinity: alk });
      const d = dose(w, { hcl: g }, V, T);
      expect(Math.abs(from - d.ph - (from - to)) / (from - to)).toBeLessThan(
        0.05,
      );
    });
  it('Show dose: pH 7.5 → 7.3 at alkalinity 100 is 2.63 l of 10 % per 100 m³ (±5 %)', () => {
    const a = showDose({ ph: 7.5, alkalinity: 100 }, 'ph-high');
    expect(a.additive).toBe('acid');
    expect(rel(a.dose!.amount, 2.625)).toBeLessThan(0.05);
  });
});

describe('reference: sodium hypochlorite per 1 mg/l of free chlorine', () => {
  // 1 mg/l × 100 m³ = 100 g Cl₂; at 140 g/l (14 %), 0.714 l.
  it('100 g of available chlorine in 100 m³ is 1 mg/l (±1 %)', () => {
    const d = dose(water(), { hypochlorite: 100 }, V, T);
    expect(rel(d.freeChlorine, 1)).toBeLessThan(0.01);
  });
  it('Show dose: 0.5 → 1.3 mg/l in 100 m³ is 0.571 l (±3 %)', () => {
    const a = showDose({ freeChlorine: 0.5 }, 'free-chlorine-low');
    expect(rel(a.dose!.amount, 0.571)).toBeLessThan(0.03);
  });
});

describe('reference: sodium thiosulphate per 1 mg/l of chlorine removed', () => {
  // PWTAG TN23: 5 g of the pentahydrate per m³ per mg/l (the model is fitted
  // to it). Stoichiometry to sulphate alone is 0.875 g/m³; US trade figures
  // 1.2 to 2 g/m³. 4.0 → 1.3 mg/l in 100 m³: 2.7 × 100 × 5 = 1.35 kg.
  it('Show dose: 4.0 → 1.3 mg/l in 100 m³ is 1.35 kg (±3 %)', () => {
    const a = showDose({ freeChlorine: 4 }, 'free-chlorine-high');
    expect(a.additive).toBe('thiosulphate');
    expect(rel(a.dose!.amount, 1.35)).toBeLessThan(0.03);
  });
});

describe('reference: the Langelier index of textbook waters', () => {
  const lsi = (s: Partial<WaterSpec>) =>
    chemistryReadings(water(s), s.temperature ?? T).langelier;
  it('Carrier’s formula: pH 7.5, 25 °C, Ca 250, TA 100, TDS 500 gives −0.060 (±0.01)', () => {
    expect(Math.abs(lsi({ tds: 500 }) - -0.0602)).toBeLessThan(0.01);
  });
  // The factor tables (TF, CF, AF; 12.1 below TDS 1000): within their 0.1 steps.
  const factor: [Partial<WaterSpec>, number][] = [
    [{ ph: 7.5, temperature: 28.9, hardness: 250, alkalinity: 100 }, 0.0],
    [{ ph: 7.2, temperature: 26.7, hardness: 100, alkalinity: 60 }, -0.9],
    [{ ph: 7.8, temperature: 32.2, hardness: 400, alkalinity: 150 }, 0.8],
  ];
  for (const [s, want] of factor)
    it(`factor method: pH ${s.ph}, ${s.temperature} °C, Ca ${s.hardness}, TA ${s.alkalinity} gives ${want} (±0.1)`, () => {
      expect(Math.abs(lsi({ ...s, tds: 500 }) - want)).toBeLessThanOrEqual(0.1);
    });
});

describe('reference: dilution', () => {
  // Replacing a share f with mains water: C′ = (1 − f) C + f M, so
  // f = (C − C′) / (C − M). Hardness 1100 → 250, mains 200: f = 850 / 900.
  it('Show dose: hardness 1100 → 250 in 100 m³ is 94.4 m³ (±1 %)', () => {
    const a = showDose({ hardness: 1100 }, 'calcium-hardness-high');
    expect(a.dose?.unit).toBe('m³');
    expect(rel(a.dose!.amount, 94.44)).toBeLessThan(0.01);
  });
  it('TDS 2000 → 1000 with mains at 350: 60.6 m³ (±1 %)', () => {
    const a = showDose({ tds: 2000 }, 'tds-high');
    expect(rel(a.dose!.amount, (V * 1000) / (2000 - MAINS.tds))).toBeLessThan(
      0.01,
    );
  });
  it('and the dilution it names brings the water there', () => {
    const d = dilute(water({ hardness: 1100 }), 94.44, V, T);
    expect(Math.abs(d.hardness - 250)).toBeLessThan(1);
  });
});
