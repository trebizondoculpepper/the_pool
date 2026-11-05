import { describe, expect, it } from 'vite-plus/test';
import { waterFrom } from '../water/pool-chemistry';
import type { WaterSpec } from '../water/pool-chemistry';
import { ALARM_LIMITS, advise, alarms } from './aqualis-advisor';
import { trioSettings } from './aqualis-world';
import type { TrioPool } from './aqualis-world';
import { DEFAULT_TARGETS } from './aqualis-types';
import type { AlarmId, AqualisReadings } from './aqualis-types';
import {
  TRIO_CHANNELS,
  channelView,
  readingsOf,
} from './aqualis-advice.test-support';
import {
  BROKEN,
  DIAGNOSED,
  broken,
  diagnosisFailures,
  dosed,
  prescriptionFailures,
  randomWater,
  rankingFailures,
  seeded,
} from './aqualis-checks.test-support';

/**
 * Dr Aqualis's advice, verified without the world
 * (`doc/plans/aqualis-advice-verification.md`, Part 4): diagnosis at every
 * band edge and alarm limit (item 1), a few hundred seeded random waters
 * through the diagnosis and the single-step prescription (item 7), probe
 * error (item 5), and the negative controls (item 8): the same checks
 * failing on deliberately broken advisors.
 */

const t = DEFAULT_TARGETS;
const POOLS: TrioPool[] = ['pool_01', 'pool_02'];
/** Every reading at its set point (LSI 0): nothing to say. */
const AT_SET: AqualisReadings = {
  freeChlorine: t.freeChlorine.set,
  combinedChlorine: 0.1,
  totalChlorine: t.freeChlorine.set + 0.1,
  ph: t.ph.set,
  alkalinity: t.alkalinity.set,
  calciumHardness: t.calciumHardness.set,
  lsi: 0,
  tds: t.tds.set,
  sulphate: t.sulphate.set,
  temperature: 28,
};
/** Each band edge worth testing, by reading (a floor of nought has none below it). */
const EDGES = DIAGNOSED.flatMap((k) => {
  const out: { k: typeof k; edge: 'low' | 'high' }[] = [{ k, edge: 'high' }];
  if (t[k].low > 0 || k === 'lsi') out.push({ k, edge: 'low' });
  return out;
});
/**
 * A small step past an edge: a hundredth of the reading's half-band; for
 * pH, one digit of the meter (0.01), since the advice reads the pH as the
 * Trio shows it, to two places (mission 207).
 */
const eps = (k: (typeof DIAGNOSED)[number]) =>
  k === 'ph' ? 0.01 : Math.max(1e-3, (t[k].high - t[k].low) / 200);

describe('1. diagnosis at every band edge, both pools, open and closed', () => {
  for (const pool of POOLS)
    for (const open of [true, false])
      for (const { k, edge } of EDGES) {
        const at = t[k][edge];
        const outside = edge === 'low' ? at - eps(k) : at + eps(k);
        const inside = edge === 'low' ? at + eps(k) : at - eps(k);
        it(`${pool} ${open ? 'open' : 'closed'}: ${k} just inside its ${edge} edge says nothing; just outside, exactly it`, () => {
          const s = trioSettings(pool);
          const fn = (r: AqualisReadings) =>
            advise(r, s, TRIO_CHANNELS, undefined, { open, doses: false });
          expect(
            diagnosisFailures(
              { ...AT_SET, [k]: inside },
              s,
              TRIO_CHANNELS,
              (r, s2, ch, w, o) => advise(r, s2, ch, w, { ...o, open }),
            ),
          ).toEqual([]);
          expect(
            fn({ ...AT_SET, [k]: inside }).filter((a) => a.reading),
          ).toEqual([]);
          const out = fn({ ...AT_SET, [k]: outside }).filter((a) => a.reading);
          expect(out.map((a) => a.reading)).toEqual([k]);
          expect(
            diagnosisFailures(
              { ...AT_SET, [k]: outside },
              s,
              TRIO_CHANNELS,
              (r, s2, ch, w, o) => advise(r, s2, ch, w, { ...o, open }),
            ),
          ).toEqual([]);
        });
      }

  it('the severities change at ALARM_LIMITS', () => {
    const s = trioSettings('pool_01');
    const sev = (r: Partial<AqualisReadings>, id: string) =>
      advise({ ...AT_SET, ...r }, s, TRIO_CHANNELS, undefined, {
        doses: false,
      }).find((a) => a.id === id)?.severity;
    const L = ALARM_LIMITS;
    const lowFc = t.freeChlorine.low * L.chlorineLowShare;
    expect(sev({ freeChlorine: lowFc + 0.01 }, 'free-chlorine-low')).toBe(
      'warning',
    );
    expect(sev({ freeChlorine: lowFc - 0.01 }, 'free-chlorine-low')).toBe(
      'alarm',
    );
    const highFc = t.freeChlorine.high * L.chlorineHighTimes;
    expect(sev({ freeChlorine: highFc - 0.01 }, 'free-chlorine-high')).toBe(
      'warning',
    );
    expect(sev({ freeChlorine: highFc + 0.01 }, 'free-chlorine-high')).toBe(
      'alarm',
    );
    expect(sev({ ph: t.ph.high + L.phMargin - 0.01 }, 'ph-high')).toBe(
      'warning',
    );
    expect(sev({ ph: t.ph.high + L.phMargin + 0.01 }, 'ph-high')).toBe('alarm');
    expect(sev({ ph: t.ph.low - L.phMargin + 0.01 }, 'ph-low')).toBe('warning');
    expect(sev({ ph: t.ph.low - L.phMargin - 0.01 }, 'ph-low')).toBe('alarm');
    const cc = t.combinedChlorine.high * L.combinedTimes;
    expect(sev({ combinedChlorine: cc - 0.01 }, 'combined-chlorine-high')).toBe(
      'warning',
    );
    expect(sev({ combinedChlorine: cc + 0.01 }, 'combined-chlorine-high')).toBe(
      'alarm',
    );
  });

  it('its alarms come on at ALARM_LIMITS, and not before', () => {
    const s = trioSettings('pool_01');
    const L = ALARM_LIMITS;
    const flowing = { flowing: true, flowLh: 30, lostFor: 0 };
    const on = (r: Partial<AqualisReadings>) =>
      alarms({ ...AT_SET, ...r }, flowing, TRIO_CHANNELS, s).map((a) => a.id);
    const pairs: [keyof AqualisReadings, number, AlarmId][] = [
      ['freeChlorine', t.freeChlorine.low * L.chlorineLowShare, 'chlorine-low'],
      [
        'freeChlorine',
        t.freeChlorine.high * L.chlorineHighTimes,
        'chlorine-high',
      ],
      ['ph', t.ph.low - L.phMargin, 'ph-low'],
      ['ph', t.ph.high + L.phMargin, 'ph-high'],
      [
        'combinedChlorine',
        t.combinedChlorine.high * L.combinedTimes,
        'combined-high',
      ],
      ['lsi', t.lsi.low, 'balance-aggressive'],
      ['lsi', t.lsi.high, 'balance-scaling'],
    ];
    for (const [k, limit, id] of pairs) {
      const below = id.endsWith('low') || id === 'balance-aggressive';
      expect(
        on({ [k]: below ? limit + 0.005 : limit - 0.005 }),
        id,
      ).not.toContain(id);
      expect(on({ [k]: below ? limit - 0.005 : limit + 0.005 }), id).toContain(
        id,
      );
    }
    expect(on({})).toEqual([]);
  });
});

describe('7. seeded random waters: diagnosis and single-step prescription', () => {
  const N = 300;
  const rnd = seeded(114);
  const waters = Array.from({ length: N }, () => randomWater(rnd));
  for (const pool of POOLS) {
    const s = trioSettings(pool);
    it(`${pool}: ${N} random waters, each diagnosed exactly (with random combined chlorine)`, () => {
      const fails: string[] = [];
      const cc = seeded(7);
      waters.forEach((spec, i) => {
        const r = {
          ...readingsOf(waterFrom(spec), spec.temperature),
          combinedChlorine: cc() * 1.5,
        };
        for (const f of diagnosisFailures(r, s, TRIO_CHANNELS))
          fails.push(`water ${i}: ${f}`);
      });
      expect(fails).toEqual([]);
    });
    it(`${pool}: ${N} random waters, each hand dose landing within 15 % of its aim and never past its band`, () => {
      const fails: string[] = [];
      waters.forEach((spec, i) => {
        for (const f of prescriptionFailures(spec, s, NO_PUMPS))
          fails.push(`water ${i}: ${f}`);
      });
      expect(fails).toEqual([]);
    });
  }
});

/** Every channel unconnected: every chemical by hand, so every dose is checked. */
const NO_PUMPS = [
  channelView('hypochlorite', { kind: 'unconnected' }),
  channelView('acid', { kind: 'unconnected' }),
  channelView('co2', { kind: 'unconnected' }),
];

describe('5. probe error: a small reading error never makes a large wrong dose', () => {
  // Realistic errors: a pH probe ±0.05, free chlorine ±10 %, the kit's
  // titrations (alkalinity, hardness) ±10 %, TDS ±5 %.
  const ERRORS: [keyof WaterSpec, (v: number) => number[]][] = [
    ['ph', (v) => [v - 0.05, v + 0.05]],
    ['freeChlorine', (v) => [v * 0.9, v * 1.1]],
    ['alkalinity', (v) => [v * 0.9, v * 1.1]],
    ['hardness', (v) => [v * 0.9, v * 1.1]],
    ['tds', (v) => [v * 0.95, v * 1.05]],
  ];
  const SCENES: [string, Partial<WaterSpec>][] = [
    ['alkalinity low', { alkalinity: 50 }],
    ['pH far low', { ph: 6.9 }],
    ['pH high', { ph: 7.6 }],
    ['hardness low', { hardness: 70 }],
    ['hardness high', { hardness: 1100 }],
    ['chlorine low', { freeChlorine: 0.5 }],
    ['chlorine far high', { freeChlorine: 4 }],
    ['TDS high', { tds: 1800 }],
  ];
  const GOOD: WaterSpec = {
    ph: 7.3,
    alkalinity: 120,
    hardness: 250,
    tds: 900,
    temperature: 28,
    freeChlorine: 1.3,
    sulphate: 50,
  };
  for (const pool of POOLS)
    for (const [name, over] of SCENES)
      it(`${pool}: ${name}, the dose from misread readings lands the true water in its band`, () => {
        const s = trioSettings(pool);
        const V = s.dynamics.volumeM3;
        const truth = waterFrom({ ...GOOD, ...over });
        const fails: string[] = [];
        for (const [k, err] of ERRORS)
          for (const v of err({ ...GOOD, ...over }[k] as number)) {
            const misread = waterFrom({ ...GOOD, ...over, [k]: v });
            const r = readingsOf(misread, GOOD.temperature);
            for (const a of advise(r, s, NO_PUMPS, misread)) {
              if (
                !a.dose ||
                !a.reading ||
                a.reading === 'temperature' ||
                a.reading === 'lsi'
              )
                continue;
              const after = dosed(truth, a, V, GOOD.temperature);
              if (!after) continue;
              const r2 = readingsOf(after, GOOD.temperature);
              const tt = s.targets[a.reading];
              // Into its band, or (a split dose) no further than its band's far edge.
              const v2 = r2[a.reading];
              const before = readingsOf(truth, GOOD.temperature)[a.reading];
              const past = before < tt.low ? v2 > tt.high : v2 < tt.low;
              if (past)
                fails.push(
                  `${k} misread as ${v.toFixed(2)}: ${a.id} takes ${a.reading} to ${v2.toFixed(2)}`,
                );
            }
          }
        expect(fails).toEqual([]);
      });
});

describe('8. negative controls: the checks fail on broken advisors', () => {
  const rnd = seeded(8);
  const waters = Array.from({ length: 60 }, () => randomWater(rnd));
  const s = trioSettings('pool_01');
  const failing = (b: keyof typeof BROKEN) =>
    waters.filter(
      (spec) => prescriptionFailures(spec, s, NO_PUMPS, broken(b)).length > 0,
    ).length;
  it('the real advisor passes the prescription check on all of them', () => {
    expect(
      waters.filter(
        (spec) => prescriptionFailures(spec, s, NO_PUMPS).length > 0,
      ),
    ).toEqual([]);
  });
  it('doubling every dose fails it', () =>
    expect(failing('doubled')).toBeGreaterThan(30));
  it('halving every dose fails it', () =>
    expect(failing('halved')).toBeGreaterThan(30));
  it('dosing the wrong way fails it', () =>
    expect(failing('wrong-way')).toBeGreaterThan(30));
  it('reversing the ranking fails the ranking check, which the real advisor passes', () => {
    let real = 0;
    let rev = 0;
    for (const spec of waters) {
      const r = readingsOf(waterFrom(spec), spec.temperature);
      const a = advise(r, s, TRIO_CHANNELS, undefined, { doses: false });
      if (rankingFailures(a).length) real++;
      if (rankingFailures(BROKEN.reversed(a)).length) rev++;
    }
    expect(real).toBe(0);
    expect(rev).toBeGreaterThan(30);
  });
  it('a broken diagnosis (the advice of a different water) fails the diagnosis check', () => {
    let fails = 0;
    for (let i = 0; i < waters.length; i++) {
      const r = readingsOf(waterFrom(waters[i]), 28);
      const other = readingsOf(waterFrom(waters[(i + 1) % waters.length]), 28);
      if (
        diagnosisFailures(r, s, TRIO_CHANNELS, (_r, s2, ch, w, o) =>
          advise(other, s2, ch, w, o),
        ).length
      )
        fails++;
    }
    expect(fails).toBeGreaterThan(30);
  });
});
