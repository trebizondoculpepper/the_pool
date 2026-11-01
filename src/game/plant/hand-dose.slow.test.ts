import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { onSettledWater } from '../world.test-support';
import { advise } from './aqualis-advisor';
import { trioAlarms } from './aqualis-world';
import { withWater } from './aqualis-advice.test-support';

/**
 * A hand dose fed in at a rate (`doc/plans/aqualis-advice-verification.md`,
 * Part 1; the owner, 2026-10-31): the owner's measurement, 17 kg of
 * bicarbonate tipped into the Lounge's tank at once (the Trio, just
 * downstream, read 820 mg/l and more and raised pH HIGH and WATER
 * SCALING), against the same fed in at the rate Dr Aqualis recommends.
 */

describe('a hand dose, carried round by the circulation', () => {
  it('18 kg of bicarbonate in the Lounge’s tank reaches its far side within two hours', () => {
    const start = newWorld();
    const far = (w: typeof start) => w.treatment.circuits.pool_01.pool[2];
    const before = far(start).alkalinity;
    let w = applyAction(start, {
      type: 'hand/dose',
      pool: 'pool_01',
      chemical: 'bicarbonate',
      amount: 18,
    });
    // Unmixed yet: the far side has none of it.
    expect(far(w).alkalinity).toBe(before);
    w = applyAction(w, { type: 'time/skip', seconds: 2 * 3600 });
    const tank = w.treatment.circuits.pool_01.tank.alkalinity;
    // About 73 mg/l once mixed through the circuit's 146 m³ (Dr Aqualis's
    // Show dose: 17.4 kg for 69 mg/l in his 150 m³), less what the acid
    // pump takes back as the pH rises; mixed: the tank and far side agree.
    expect(far(w).alkalinity - before).toBeGreaterThan(62);
    expect(far(w).alkalinity - before).toBeLessThan(76);
    expect(Math.abs(tank - far(w).alkalinity)).toBeLessThan(3);
  });
});

/** The Lounge Trio's alarms (minutes each was on) and highest pH and alkalinity over `minutes`. */
function watch(w0: World, minutes: number) {
  let w = w0;
  const on = new Map<string, number>();
  let ph = 0;
  let alk = 0;
  for (let m = 0; m < minutes; m++) {
    w = advance(w, 60, 1);
    for (const a of trioAlarms(w.aqualis.pool_01))
      on.set(a.id, (on.get(a.id) ?? 0) + 1);
    ph = Math.max(ph, w.aqualis.pool_01.readings.ph);
    alk = Math.max(alk, w.aqualis.pool_01.readings.alkalinity);
  }
  return { on, ph, alk, end: w };
}

describe('17 kg of bicarbonate into the Lounge’s balance tank', () => {
  // The owner's water: as months of service left it before mission 118
  // put the CO₂ loss right, alkalinity 50.7 (settled water is now 77).
  const base = advance(
    withWater(onSettledWater(newWorld()), 'pool_01', { alkalinity: 50.7 }),
    120,
    1,
  );
  const t = base.aqualis.pool_01;
  const before = new Set<string>(trioAlarms(t).map((a) => a.id));
  const advice = advise(t.readings, t.settings, t.channels, undefined, {
    open: t.poolOpen,
  }).find((a) => a.id === 'alkalinity-low');
  const rate = advice!.dose!.rate!;
  const dose = (r?: number) =>
    applyAction(base, {
      type: 'hand/dose',
      pool: 'pool_01',
      chemical: 'bicarbonate',
      amount: 17,
      ...(r ? { rate: r } : {}),
    });
  const dumped = watch(dose(), 240);
  const fed = watch(dose(rate), 240);
  const raised = (r: typeof fed) =>
    [...r.on.keys()].filter((id) => !before.has(id));

  it('Dr Aqualis recommends a rate, as dose takes it', () => {
    expect(advice?.dose?.how).toMatch(/at \d+g\/min/);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.5);
  });
  it('dumped at once, the sample point’s alarms come on: pH HIGH and WATER SCALING', () => {
    expect(dumped.alk).toBeGreaterThan(800);
    expect(raised(dumped)).toEqual(
      expect.arrayContaining(['ph-high', 'balance-scaling']),
    );
  });
  it('fed at his rate, no alarm comes on, and the pH stays inside its alarm limit', () => {
    expect(raised(fed)).toEqual([]);
    expect(fed.ph).toBeLessThan(7.6);
    expect(fed.alk).toBeLessThan(160);
  });
  it('either way it is all in by the end, the alkalinity back in its band', () => {
    for (const r of [dumped, fed]) {
      expect(r.end.treatment.charges.pool_01).toHaveLength(0);
      expect(r.end.aqualis.pool_01.readings.alkalinity).toBeGreaterThan(80);
    }
  });
});
