import { describe, expect, it } from 'vite-plus/test';
import { CHALLENGES } from './museum-4-cards';
import { replay } from './museum-4-challenge';
import type { Dose, Level } from './museum-4-challenge';
import { TANKS } from './museum-4-lab';
import type { SizeIndex } from './museum-4-doses';
import { closeTo, doseKey } from './museum-4-challenge.test-support';
import {
  PLANT,
  POOL_25M,
  circuitWater,
  runBench,
  warmedUp,
} from '../water/chemistry-bench';

const LEVELS: readonly Level[] = ['journeyman', 'pro'];
const ALL: Dose[] = TANKS.flatMap((t) =>
  ([0, 1, 2, 3, 4] as SizeIndex[]).map((size) => ({ tank: t.id, size })),
);

describe("Hall 4's cards, searched", () => {
  // Every single dose, and every pair up to the level's par, replayed (the
  // live hall and the replay agree: museum-4-challenge.slow.test.ts): any
  // winner must be close to a stored solution or to a declared alsoWins
  // route (`closeTo`), so no unforeseen cheap win is left on a card.
  for (const card of CHALLENGES)
    for (const level of LEVELS)
      it(`leaves no unforeseen win on ${card.title} at ${level}`, () => {
        const routes = [
          card.solutions[level],
          ...(card.alsoWins?.[level] ?? []).map((w) => w.doses),
        ];
        const seqs: Dose[][] = ALL.map((a) => [a]);
        if (card.pars[level] >= 2)
          for (const a of ALL) for (const b of ALL) seqs.push([a, b]);
        const unexpected = seqs
          .filter((ds) => !routes.some((r) => closeTo(ds, r)))
          .filter((ds) => replay(card, level, ds).outcome === 'won')
          .map(doseKey);
        expect(unexpected).toEqual([]);
      }, 600_000);
});

describe('“The acid pump failed”: how long its story says the pump has been off', () => {
  it('about two weeks: the bench, from its settled water at its set point, takes 13 to 14 days without acid to creep to pH 7.9', () => {
    // The lab's 25 m pool settled (`warmedUp`) and two steady days on, as
    // the bench's high-pH scenario starts, then no acid: at two days it
    // reads 7.60 (the lab's own card), and 7.9 only after about two
    // weeks, its CO₂ loss slowing as the pH nears the air's.
    const s0 = warmedUp(POOL_25M, PLANT);
    let s = runBench(s0, POOL_25M, 48, [], 60).final;
    expect(
      Math.abs(circuitWater(s, POOL_25M).ph - PLANT.phSetpoint),
    ).toBeLessThan(0.05);
    s = { ...s, plant: { ...s.plant, acidFailed: true } };
    let hours = 0;
    while (circuitWater(s, POOL_25M).ph < 7.9 && hours < 30 * 24) {
      s = runBench(s, POOL_25M, 6, [], 60).final;
      hours += 6;
    }
    expect(hours / 24).toBeGreaterThan(12.5);
    expect(hours / 24).toBeLessThanOrEqual(14.5);
    const card = CHALLENGES.find((c) => c.id === 'high-ph')!;
    for (const words of [
      card.problem,
      card.briefing.journeyman,
      card.briefing.pro,
    ])
      expect(words).toContain('about two weeks ago');
  });
});
