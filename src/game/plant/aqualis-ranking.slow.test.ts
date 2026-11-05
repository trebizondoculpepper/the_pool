import { describe, expect, it } from 'vite-plus/test';
import {
  SCENARIOS,
  trioAdvice,
  withWater,
} from './aqualis-advice.test-support';
import type { Advisor, Scenario } from './aqualis-advice.test-support';
import { accuracy, closedLoop, twin } from './aqualis-advice-runs.test-support';
import { BROKEN } from './aqualis-checks.test-support';
import type { TrioPool } from './aqualis-world';

/**
 * The ranking in the world (`doc/plans/aqualis-advice-verification.md`,
 * Part 4, item 9), and the negative controls on the world's checks (item
 * 8): for waters with several problems, each instruction carried out
 * alone and its improvement measured (not following's score less
 * following's, after mixing); the advisor's order safety first, and
 * within a tier biggest first within a tolerance, or as normal practice
 * puts it (alkalinity before the pH it buffers; a cause before its
 * effect). Then the same world checks run on broken advisors, each of
 * which must fail.
 */

const T = 300_000;
/** Within a tier, a smaller improvement may come first by this much of the score (or normal practice's order). */
const TOLERANCE = 0.25;

/**
 * Known: within the balance tier the ranking goes by each reading's own
 * distance from its set point (live and cheap, Part 5), and with three
 * problems that is not the order of the improvements measured. The
 * bicarbonate (alkalinity 60, its distance 1.5) comes first and improves
 * the score least (0.3 to 1.0, its pH lift and the acid that follows
 * taking much back), while the dilution for TDS improves it most (up to
 * 3.1: the mains water lifts the hardness and alkalinity too). Ranking by
 * predicted improvement would need the dose arithmetic on request.
 */
const KNOWN: Record<string, true> = {
  // The Lounge only: since mission 207 (the Olympic's correctly sized acid
  // pump, and bicarbonate worked out allowing for it) the Olympic ranks
  // these three in the order of their improvements.
  'pool_01:alkalinity-low+hardness-low+tds-high': true,
  // Since mission 118 (the Olympic's water at alkalinity 120, its CO₂ loss
  // held to Wojtowicz's range): the dilution for TDS ranks first, by its
  // distance, and improves the score 0.84; calcium chloride, after it,
  // 1.68. The same cause as above.
  'pool_02:hardness-low+tds-high': true,
};

const MULTI: Scenario[] = [
  {
    id: 'hardness-low+tds-high',
    about: 'hardness 70, TDS 1800',
    set: (w, p) => withWater(w, p, { hardness: 70, tds: 1800 }),
  },
  {
    id: 'chlorine-high+hardness-low',
    about: 'free chlorine 4 (tier 1), hardness 70',
    set: (w, p) => withWater(w, p, { freeChlorine: 4, hardness: 70 }),
  },
  {
    id: 'alkalinity-low+hardness-low+tds-high',
    about: 'alkalinity 60, hardness 80, TDS 1700',
    set: (w, p) =>
      withWater(w, p, { alkalinity: 60, hardness: 80, tds: 1700, ph: 7.3 }),
  },
];

/** Normal practice's precedence: what may come before a bigger difference. */
const PRECEDES: Record<string, readonly string[]> = {
  'alkalinity-low': ['ph-low', 'ph-high', 'balance-aggressive'],
  'calcium-hardness-low': ['balance-aggressive'],
};

for (const pool of ['pool_01', 'pool_02'] as TrioPool[])
  describe(`9. the ranking in the world: ${pool}`, () => {
    for (const s of MULTI)
      (KNOWN[s.id] || KNOWN[`${pool}:${s.id}`] ? it.fails : it)(
        `${s.about}: each instruction alone; tiers first, and within one the biggest improvement first (±${TOLERANCE}) or normal practice’s order`,
        () => {
          const results = new Map<string, number>();
          const order: { id: string; tier: number }[] = [];
          const first = twin(s, pool, true, undefined, (a) => {
            for (const x of a)
              if (x.tier < 3 && x.severity !== 'info' && x.additive && x.dose)
                order.push({ id: x.id, tier: x.tier });
            return a[0];
          });
          results.set(first.advice, first.mixed.not - first.mixed.followed);
          for (const { id } of order.slice(1)) {
            const r = twin(
              s,
              pool,
              true,
              undefined,
              (a) => a.find((x) => x.id === id) ?? null,
            );
            results.set(id, r.mixed.not - r.mixed.followed);
          }
          const fails: string[] = [];
          for (let i = 1; i < order.length; i++) {
            const a = order[i - 1];
            const b = order[i];
            if (a.tier < b.tier) continue;
            if (PRECEDES[a.id]?.includes(b.id)) continue;
            const ia = results.get(a.id) ?? 0;
            const ib = results.get(b.id) ?? 0;
            if (ia < ib - TOLERANCE)
              fails.push(
                `${a.id} (${ia.toFixed(2)}) before ${b.id} (${ib.toFixed(2)})`,
              );
          }
          expect(order.length).toBeGreaterThan(1);
          expect(
            fails,
            `${fails.join('; ')} | ${[...results].map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`,
          ).toEqual([]);
        },
        T,
      );
  });

describe('8. negative controls on the world’s checks: each broken advisor fails', () => {
  const pool: TrioPool = 'pool_01';
  const brokenAdvisor =
    (b: keyof typeof BROKEN): Advisor =>
    (w, p) =>
      BROKEN[b](trioAdvice(w, p));
  const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!;
  it(
    'the real advisor passes these checks',
    () => {
      expect(closedLoop(scenario('hardness-low'), pool, true).failures).toEqual(
        [],
      );
      const r = twin(scenario('hardness-low'), pool, true);
      expect(r.failures).toEqual([]);
      expect(Math.abs(accuracy(r)! - 1)).toBeLessThanOrEqual(0.15);
    },
    T,
  );
  it(
    'doubled doses: the hardness overshoots its set point, the accuracy twice its aim',
    () => {
      const r = twin(
        scenario('hardness-low'),
        pool,
        true,
        brokenAdvisor('doubled'),
      );
      expect(Math.abs(accuracy(r)! - 1)).toBeGreaterThan(0.15);
    },
    T,
  );
  it(
    'halved doses: the accuracy half its aim',
    () => {
      const r = twin(
        scenario('hardness-low'),
        pool,
        true,
        brokenAdvisor('halved'),
      );
      expect(Math.abs(accuracy(r)! - 1)).toBeGreaterThan(0.15);
    },
    T,
  );
  it(
    'the wrong way (acid for low alkalinity): no nearer neutral, and the closed loop does not settle',
    () => {
      expect(
        twin(scenario('alkalinity-low'), pool, true, brokenAdvisor('wrong-way'))
          .failures.length,
      ).toBeGreaterThan(0);
      expect(
        closedLoop(
          scenario('alkalinity-low'),
          pool,
          true,
          brokenAdvisor('wrong-way'),
          4,
        ).failures.length,
      ).toBeGreaterThan(0);
    },
    T,
  );
  it(
    'the ranking reversed: the safety tier no longer first',
    () => {
      const w = closedLoop(MULTI[1], pool, true, brokenAdvisor('reversed'), 1);
      expect(w.rounds[0]?.advice).not.toBe('free-chlorine-high');
      const real = closedLoop(MULTI[1], pool, true, undefined, 1);
      expect(real.rounds[0]?.advice).toBe('free-chlorine-high');
    },
    T,
  );
});
