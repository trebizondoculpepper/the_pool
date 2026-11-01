import { describe, expect, it } from 'vite-plus/test';
import type { TrioPool } from './aqualis-world';
import { SCENARIOS } from './aqualis-advice.test-support';
import type { Scenario } from './aqualis-advice.test-support';
import { accuracy, closedLoop, twin } from './aqualis-advice-runs.test-support';
import type {
  LoopResult,
  TwinResult,
} from './aqualis-advice-runs.test-support';

/**
 * The advice verification suite in the world (`doc/plans/aqualis-advice-verification.md`,
 * Part 4, items 3, 4 and 6), one pool, open or closed: for every scenario,
 * the closed loop, follow versus don't follow, and the prescription's
 * accuracy. A known failure (`known`, keyed `loop:`, `twin:` or
 * `accuracy:` and the scenario's id) is a finding the plan doc records;
 * it is run as `it.fails`, so it is still seen to fail, and a fix that
 * makes it pass is caught and must take it off the list.
 */

/** The prescription's accuracy band: within 15 % of the change it aimed for. */
export const ACCURACY = 0.15;

export function verificationSuite(
  pool: TrioPool,
  open: boolean,
  known: Readonly<Record<string, string>>,
  /** Mission 118's variant: the CO₂ panels on their Trios. */
  co2 = false,
) {
  const loops = new Map<string, LoopResult>();
  const twins = new Map<string, TwinResult>();
  const loopOf = (s: Scenario) => {
    if (!loops.has(s.id))
      loops.set(
        s.id,
        closedLoop(s, pool, open, undefined, undefined, undefined, co2),
      );
    return loops.get(s.id)!;
  };
  const twinOf = (s: Scenario) => {
    if (!twins.has(s.id))
      twins.set(s.id, twin(s, pool, open, undefined, undefined, co2));
    return twins.get(s.id)!;
  };
  const test = (key: string) => (known[key] ? it.fails : it);
  const T = 240_000;
  describe(`${pool} ${open ? 'OPEN' : 'CLOSED'}${co2 ? ' with CO₂' : ''}`, () => {
    for (const s of SCENARIOS)
      describe(`${s.id}: ${s.about}`, () => {
        test(`loop:${s.id}`)(
          `closed loop: settles within ten rounds, without overshoot, oscillation or a worse round${known[`loop:${s.id}`] ? ` (known: ${known[`loop:${s.id}`]})` : ''}`,
          () =>
            expect(loopOf(s).failures, loopOf(s).failures.join('; ')).toEqual(
              [],
            ),
          T,
        );
        test(`twin:${s.id}`)(
          `followed: nearer neutral after mixing, nothing driven out of band or alarm, no backfire at 24 h${known[`twin:${s.id}`] ? ` (known: ${known[`twin:${s.id}`]})` : ''}`,
          () =>
            expect(twinOf(s).failures, twinOf(s).failures.join('; ')).toEqual(
              [],
            ),
          T,
        );
        if (s.automatic)
          it(
            'the pumps put it right: Dr Aqualis says to let them work, with no hand dose',
            () => {
              const r = twinOf(s);
              expect(r.where).toBe('automatic');
              expect(r.action).toMatch(/^nothing/);
              expect(loopOf(s).settledAt).not.toBe(null);
            },
            T,
          );
        test(`accuracy:${s.id}`)(
          `a hand dose lands within ${ACCURACY * 100} % of the change it aimed for${known[`accuracy:${s.id}`] ? ` (known: ${known[`accuracy:${s.id}`]})` : ''}`,
          () => {
            const a = accuracy(twinOf(s));
            if (a === null) return;
            expect(Math.abs(a - 1)).toBeLessThanOrEqual(ACCURACY);
          },
          T,
        );
      });
    // The owner's (2026-10-31): bicarbonate advised with the pH high.
    describe('pH high with alkalinity low, followed in its stated order', () => {
      const s = SCENARIOS.find((x) => x.id === 'ph-high+alkalinity-low')!;
      it(
        'the pH first (above its band, the bicarbonate would lift it past its alarm): the pumps’ work, and the bicarbonate after',
        () => {
          const r = loopOf(s);
          expect(r.rounds[0].advice).toBe('ph-high');
          expect(r.rounds.map((x) => x.advice)).toContain('alkalinity-low');
        },
        T,
      );
      test('order:settles')(
        `ends nearer neutral than not following it for a day, settling in the closed loop${known['order:settles'] ? ` (known: ${known['order:settles']})` : ''}`,
        () => {
          const l = loopOf(s);
          expect(l.settledAt).not.toBe(null);
          expect(l.endScore).toBeLessThan(twinOf(s).day.not);
        },
        T,
      );
      if (open)
        it(
          'the pH stays inside its alarm limit (7.6) throughout, while the pool is open',
          () => expect(loopOf(s).maxPh).toBeLessThanOrEqual(7.6),
          T,
        );
    });
  });
  return { loops, twins };
}
