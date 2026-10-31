import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { onSettledWater } from '../world.test-support';
import { handDose } from './hand-dose';

/**
 * A hand dose into the balance tank goes in gradually
 * (`doc/plans/aqualis-advice-verification.md`, Part 1): the owner's
 * measurement, 17 kg of bicarbonate into the Lounge's tank, once
 * dissolved at once (the Trio, just downstream, read 820 mg/l and more),
 * now going in over about 21 minutes.
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

/** The Lounge Trio's highest readings over `minutes`, a minute at a time. */
function peaks(w0: World, minutes: number) {
  let w = w0;
  let alk = 0;
  let tds = 0;
  for (let m = 0; m < minutes; m++) {
    w = advance(w, 60, 1);
    alk = Math.max(alk, w.aqualis.pool_01.readings.alkalinity);
    tds = Math.max(tds, w.aqualis.pool_01.readings.tds);
  }
  return { alk, tds, end: w };
}

describe('17 kg of bicarbonate into the Lounge’s balance tank', () => {
  const base = advance(onSettledWater(newWorld()), 60, 1);
  const kg = 17.4;
  const instant: World = {
    ...base,
    treatment: {
      ...base.treatment,
      circuits: {
        ...base.treatment.circuits,
        pool_01: handDose(
          base.treatment.circuits.pool_01,
          'pool_01',
          base.pools.pool_01,
          'bicarbonate',
          kg,
          'balance-tank',
        ),
      },
    },
  };
  const dose = (into?: 'pool') =>
    applyAction(base, {
      type: 'hand/dose',
      pool: 'pool_01',
      chemical: 'bicarbonate',
      amount: kg,
      into,
    });
  const was = peaks(instant, 180);
  const tank = peaks(dose(), 180);
  const pool = peaks(dose('pool'), 180);

  it('dissolved at once, the Trio read over 900 mg/l (the brief’s problem)', () => {
    expect(was.alk).toBeGreaterThan(900);
  });
  it('going in over its 21 minutes, the Trio’s peak is under half that', () => {
    expect(tank.alk).toBeLessThan(was.alk / 2);
    expect(tank.tds).toBeLessThan(was.tds);
  });
  it('spread over the pool, the Trio sees it only mixed', () => {
    expect(pool.alk).toBeLessThan(140);
  });
  it('every way, it is all in, and three hours on (two turnovers) the circuit is mixed near its 120', () => {
    for (const r of [tank, pool]) {
      expect(r.end.treatment.charges.pool_01).toHaveLength(0);
      expect(r.end.aqualis.pool_01.readings.alkalinity).toBeGreaterThan(105);
      expect(r.end.aqualis.pool_01.readings.alkalinity).toBeLessThan(135);
    }
  });
});
