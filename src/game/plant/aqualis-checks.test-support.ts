import {
  dose,
  thiosulphateStoichiometry,
  waterFrom,
} from '../water/pool-chemistry';
import type { PoolChemistry, WaterSpec } from '../water/pool-chemistry';
import { ALARM_LIMITS, HAND_CHEMICAL, advise, dilute } from './aqualis-advisor';
import type { AdviseOptions } from './aqualis-advisor';
import { handChemical } from './hand-dose';
import type {
  Advice,
  AqualisReadings,
  AqualisSettings,
  ChannelView,
  ReadingId,
  Severity,
} from './aqualis-types';
import { readingsOf } from './aqualis-advice.test-support';

/**
 * The advice verification suite's world-free checks
 * (`doc/plans/aqualis-advice-verification.md`, Part 4, items 1, 5, 7 and
 * 8): what the advisor should diagnose of a set of readings, and whether
 * its Show dose, put into the water it was worked on, lands where it
 * aimed. Each returns its failures as words, so the same checks can be
 * shown failing on a broken advisor.
 */

/** An advisor as these checks call it: `advise`, or a broken one. */
export type AdviseFn = (
  r: AqualisReadings,
  s: AqualisSettings,
  ch: readonly ChannelView[],
  w: PoolChemistry | undefined,
  o: AdviseOptions,
) => Advice[];
export const ADVISE: AdviseFn = (r, s, ch, w, o) => advise(r, s, ch, w, o);

/** Each advice id about a reading, by the reading and its side. */
/** The readings the advice diagnoses. */
export type Diagnosed = Exclude<ReadingId, 'temperature' | 'totalChlorine'>;

const ID: Partial<Record<Diagnosed, { low?: string; high: string }>> = {
  freeChlorine: { low: 'free-chlorine-low', high: 'free-chlorine-high' },
  combinedChlorine: { high: 'combined-chlorine-high' },
  ph: { low: 'ph-low', high: 'ph-high' },
  alkalinity: { low: 'alkalinity-low', high: 'alkalinity-high' },
  calciumHardness: {
    low: 'calcium-hardness-low',
    high: 'calcium-hardness-high',
  },
  lsi: { low: 'balance-aggressive', high: 'balance-scaling' },
  tds: { high: 'tds-high' },
  sulphate: { high: 'sulphate-high' },
};
export const DIAGNOSED = Object.keys(ID) as Diagnosed[];

/** The severity the rules give a reading out on a side (independent of the advisor). */
export function expectedSeverity(
  k: ReadingId,
  side: 'low' | 'high',
  v: number,
  t: AqualisSettings['targets'],
): Severity {
  const L = ALARM_LIMITS;
  switch (k) {
    case 'freeChlorine':
      return side === 'low'
        ? v < t.freeChlorine.low * L.chlorineLowShare
          ? 'alarm'
          : 'warning'
        : v > t.freeChlorine.high * L.chlorineHighTimes
          ? 'alarm'
          : 'warning';
    case 'combinedChlorine':
      return v > t.combinedChlorine.high * L.combinedTimes
        ? 'alarm'
        : 'warning';
    case 'ph':
      return (
        side === 'low' ? v < t.ph.low - L.phMargin : v > t.ph.high + L.phMargin
      )
        ? 'alarm'
        : 'warning';
    case 'lsi':
      return 'alarm';
    default:
      return 'warning';
  }
}

/** What is wrong with a diagnosis: anything out of band not reported, or at the wrong severity, or anything reported that is not out. */
export function diagnosisFailures(
  r: AqualisReadings,
  s: AqualisSettings,
  ch: readonly ChannelView[],
  fn: AdviseFn = ADVISE,
): string[] {
  const t = s.targets;
  const a = fn(r, s, ch, undefined, { doses: false });
  const out: string[] = [];
  const want = new Map<string, Severity>();
  for (const k of DIAGNOSED) {
    const ids = ID[k]!;
    // The pH as the Trio shows it, to two places: the advice reads that
    // (mission 207), as an operator can only act on what is shown.
    const v = k === 'ph' ? Math.round(r.ph * 100) / 100 : r[k];
    if (ids.low && v < t[k].low)
      want.set(ids.low, expectedSeverity(k, 'low', v, t));
    if (v > t[k].high) want.set(ids.high, expectedSeverity(k, 'high', v, t));
  }
  for (const [id, sev] of want) {
    const got = a.find((x) => x.id === id);
    if (!got) out.push(`${id} not reported`);
    else if (got.severity !== sev)
      out.push(`${id} ${got.severity}, not ${sev}`);
  }
  for (const x of a)
    if (x.reading && x.reading !== 'temperature' && !want.has(x.id))
      out.push(`${x.id} reported, but nothing is out`);
  return out;
}

/** The water a Show dose leaves: its whole amount (every visit) put into the water it was worked on. */
export function dosed(
  w: PoolChemistry,
  a: Advice,
  V: number,
  T: number,
): PoolChemistry | null {
  const d = a.dose;
  if (!d || !a.additive) return null;
  if (a.additive === 'dilution') return dilute(w, d.amount, V, T);
  const id = HAND_CHEMICAL[a.additive];
  const info = id ? handChemical(id) : undefined;
  if (!info) return null;
  const after = dose(w, info.additions(d.amount), V, T);
  // Thiosulphate meets free chlorine at once (`stepChemistry`'s fast reactions).
  if (a.additive !== 'thiosulphate') return after;
  const fc = Math.max(
    0,
    after.freeChlorine -
      after.thiosulphate * thiosulphateStoichiometry().chlorinePerMg,
  );
  return dose({ ...after, freeChlorine: fc, thiosulphate: 0 }, {}, V, T);
}

/** The reading each dose aims at, and where (the set point; pH low's halfway; the LSI's set). */
const AIM: Record<
  string,
  { k: keyof AqualisReadings; aim: (t: AqualisSettings['targets']) => number }
> = {
  'free-chlorine-low': { k: 'freeChlorine', aim: (t) => t.freeChlorine.set },
  'free-chlorine-high': { k: 'freeChlorine', aim: (t) => t.freeChlorine.high },
  'alkalinity-low': { k: 'alkalinity', aim: (t) => t.alkalinity.set },
  'alkalinity-high': { k: 'alkalinity', aim: (t) => t.alkalinity.set },
  'ph-high': { k: 'ph', aim: (t) => t.ph.set },
  'ph-low': { k: 'ph', aim: (t) => (t.ph.low + t.ph.set) / 2 },
  'calcium-hardness-low': {
    k: 'calciumHardness',
    aim: (t) => t.calciumHardness.set,
  },
  'calcium-hardness-high': {
    k: 'calciumHardness',
    aim: (t) => t.calciumHardness.set,
  },
  'tds-high': { k: 'tds', aim: (t) => t.tds.set },
  'sulphate-high': { k: 'sulphate', aim: (t) => t.sulphate.set },
  'balance-aggressive': { k: 'lsi', aim: (t) => t.lsi.set },
  'balance-scaling': { k: 'lsi', aim: (t) => t.lsi.set },
};

/**
 * Doses accepted as falling short of their aim (the owner, 2026-11-05:
 * the chemistry is a hard balance and will never be perfect, so get it as
 * close as we can and accept the rest). Each must still move its reading
 * the right way and never past its aim; it need not land within the
 * tolerance. alkalinity-high: since mission 207 the advice takes high
 * alkalinity down partly by dilution and leaves the rest to the acid
 * pump's CO2 loss, so the hand step lands short (about a third of the way).
 */
export const SHORT_ACCEPTED: ReadonlySet<string> = new Set(['alkalinity-high']);

/**
 * Single-step prescription (Part 4, item 7): each advice's Show dose, all
 * of it, put into the water it was worked on (`dose`, as the world does),
 * lands its own reading within `tolerance` of the change it aimed for, and
 * never on the far side of its band.
 */
export function prescriptionFailures(
  spec: WaterSpec,
  s: AqualisSettings,
  ch: readonly ChannelView[],
  fn: AdviseFn = ADVISE,
  tolerance = 0.15,
): string[] {
  const w = waterFrom(spec);
  const T = spec.temperature;
  const r = readingsOf(w, T);
  const out: string[] = [];
  for (const a of fn(r, s, ch, w, {})) {
    const aim = AIM[a.id];
    if (!aim || !a.dose || a.where === 'automatic') continue;
    const after = dosed(w, a, s.dynamics.volumeM3, T);
    if (!after) continue;
    const r2 = readingsOf(after, T);
    const want = aim.aim(s.targets) - r[aim.k as Diagnosed];
    const got = r2[aim.k] - r[aim.k];
    const short =
      SHORT_ACCEPTED.has(a.id) &&
      Math.sign(got) === Math.sign(want) &&
      Math.abs(got) <= Math.abs(want) * (1 + tolerance);
    if (!short && Math.abs(got - want) > tolerance * Math.abs(want))
      out.push(`${a.id}: aimed ${want.toFixed(3)}, got ${got.toFixed(3)}`);
    const t = s.targets[aim.k as Diagnosed];
    if ((want > 0 && r2[aim.k] > t.high) || (want < 0 && r2[aim.k] < t.low))
      out.push(
        `${a.id}: past the far side of its band (${r2[aim.k].toFixed(2)})`,
      );
  }
  return out;
}

/**
 * The ranking (Part 3), as a check: tiers in order, and within a tier the
 * biggest deviation first, but for what normal practice puts first (a
 * cause, alkalinity before pH), which may come before a bigger one.
 */
export function rankingFailures(a: readonly Advice[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < a.length; i++)
    if (a[i].tier < a[i - 1].tier)
      out.push(
        `${a[i].id} (tier ${a[i].tier}) after ${a[i - 1].id} (tier ${a[i - 1].tier})`,
      );
  return out;
}

// ---- Broken advisors (the negative controls, Part 4, item 8) --------------------------

const scaledDose = (a: Advice, k: number): Advice =>
  a.dose
    ? {
        ...a,
        dose: {
          ...a.dose,
          amount: a.dose.amount * k,
          first: a.dose.first * k,
          rate: a.dose.rate === null ? null : a.dose.rate * k,
        },
      }
    : a;

/** Each additive's opposite, for the advisor that doses the wrong way. */
const OPPOSITE: Partial<
  Record<NonNullable<Advice['additive']>, NonNullable<Advice['additive']>>
> = {
  bicarbonate: 'acid',
  acid: 'sodaAsh',
  sodaAsh: 'acid',
  hypochlorite: 'thiosulphate',
  thiosulphate: 'hypochlorite',
  calciumChloride: 'dilution',
  dilution: 'calciumChloride',
};

/** The broken advisors: every dose doubled or halved, the wrong way, the ranking reversed. */
export const BROKEN: Record<
  'doubled' | 'halved' | 'wrong-way' | 'reversed',
  (a: Advice[]) => Advice[]
> = {
  doubled: (a) => a.map((x) => scaledDose(x, 2)),
  halved: (a) => a.map((x) => scaledDose(x, 0.5)),
  'wrong-way': (a) =>
    a.map((x) => {
      const to = x.additive && OPPOSITE[x.additive];
      return to && x.dose
        ? {
            ...x,
            additive: to,
            where: x.where === 'automatic' ? 'balance-tank' : x.where,
          }
        : x;
    }),
  reversed: (a) => [...a].reverse(),
};

/** `fn` with its advice broken. */
export const broken =
  (b: keyof typeof BROKEN, fn: AdviseFn = ADVISE): AdviseFn =>
  (...args) =>
    BROKEN[b](fn(...args));

/** A seeded random number generator (mulberry32), for repeatable random waters. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A plausible pool water, at random: every reading somewhere a real pool might put it. */
export function randomWater(rnd: () => number): WaterSpec {
  const r = (lo: number, hi: number) => lo + (hi - lo) * rnd();
  return {
    ph: r(6.8, 8.0),
    alkalinity: r(30, 300),
    hardness: r(50, 1200),
    tds: r(300, 3000),
    temperature: r(26, 34),
    freeChlorine: r(0, 6),
    sulphate: r(0, 500),
  };
}
