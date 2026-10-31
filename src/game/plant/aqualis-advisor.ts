import {
  acidFor,
  dose,
  mixWaters,
  readings as chemistryReadings,
  thiosulphateStoichiometry,
  waterFrom,
} from '../water/pool-chemistry';
import type { Additions, PoolChemistry } from '../water/pool-chemistry';
import { CHANNELS } from './aqualis-types';
import type {
  Additive,
  Advice,
  AlarmId,
  Alarm,
  AqualisReadings,
  AqualisSettings,
  ChannelId,
  ChannelView,
  DoseAmount,
  Mood,
  OfflineReason,
  ReadingId,
  SampleStatus,
  Selector,
  Severity,
  Target,
  Tier,
  Where,
} from './aqualis-types';
import { MAINS } from './water-treatment';
import { handChemical, rateText } from './hand-dose';
import type { HandChemical } from './hand-dose';

/**
 * Dr Aqualis's diagnosis (mission 114, `doc/prompts/114-aqualis-dosing-controller.md`,
 * "Diagnosis and direction, not prescriptions"): the readings judged
 * against the cabinet's targets, each fault as a problem with its number
 * and a direction naming the additive that puts it right but never how
 * much; the Show dose amount worked through the real chemistry
 * (`pool-chemistry.ts`) at the entered volume; where each additive goes;
 * his mood; and the cabinet's alarm conditions. Pure.
 *
 * **Order.** Most urgent first: by severity (alarm, warning, info), but a
 * root cause takes the severity of the worst fault it causes, so it comes
 * before it (alkalinity before pH, pH and hardness before the balance, an
 * offline acid pump before the pH it lets drift); within a severity, by
 * `RANK`, root causes first.
 *
 * **Where.** The three automatic chemicals are 'automatic' while their
 * channel is online; otherwise hypochlorite and acid go by hand into the
 * 'balance-tank' (and CO₂, having no hand route, is only advised when its
 * channel is online). Every other hand chemical goes into the
 * 'balance-tank', except dilution (fresh water for the pool) and
 * superchlorination (a shock dose into the pool), which are 'pool'.
 *
 * **Mood.** 'alarmed' for an alarm; 'pointing' for a warning about a
 * reading (he points at it); 'concerned' for a warning about the cabinet;
 * 'idle' for information; 'pleased' when every reading is in its band.
 *
 * **Show dose.** Worked on the water passed (the pool's own), or, without
 * it, on a water rebuilt from the readings (`waterFrom`), so either way
 * through `dose()` at `settings.dynamics.volumeM3` and the reading's
 * temperature; to the reading's set point. Units: kg for solids, l for the
 * hypochlorite (14 %) and acid (10 %) solutions, g for CO₂, m³ of fresh
 * water (the mains', `water-treatment.ts` `MAINS`) for dilution, as a
 * share of the water drained and replaced.
 */

// ---- Thresholds --------------------------------------------------------------------

/**
 * Alarm limits beyond the target bands (each also turns its advice into
 * an alarm): free chlorine below half its low limit or above twice its
 * high limit (the latter also the "very high" that wants thiosulphate);
 * pH 0.2 beyond its band (7.0 and 7.6 by default, PWTAG's outer limits);
 * combined chlorine above twice its high limit (1.0 mg/l); the balance
 * beyond its band (±0.5, the usual action level).
 */
export const ALARM_LIMITS = {
  chlorineLowShare: 0.5,
  chlorineHighTimes: 2,
  phMargin: 0.2,
  combinedTimes: 2,
} as const;

/** Superchlorination raises free chlorine to this many times the combined chlorine (the breakpoint rule of thumb), at least its set point. */
export const SUPERCHLORINATE_TIMES = 10;

/** The controller's channels, as its `stepController` gives them (by id) or as a list. */
export type Channels =
  | readonly ChannelView[]
  | Readonly<Record<ChannelId, ChannelView>>;

const listOf = (channels: Channels): readonly ChannelView[] =>
  Array.isArray(channels)
    ? (channels as readonly ChannelView[])
    : Object.values(channels as Record<ChannelId, ChannelView>);

// ---- Words ------------------------------------------------------------------------

const ADDITIVE_NAMES: Record<Additive, string> = {
  hypochlorite: 'sodium hypochlorite',
  acid: 'hydrochloric acid',
  co2: 'CO₂',
  bicarbonate: 'sodium bicarbonate',
  sodaAsh: 'soda ash',
  calciumChloride: 'calcium chloride',
  thiosulphate: 'sodium thiosulphate',
  dilution: 'fresh water',
  superchlorinate: 'sodium hypochlorite',
};

const DEVICE: Record<ChannelId, string> = {
  hypochlorite: 'hypochlorite pump',
  acid: 'acid pump',
  co2: 'CO₂ valve',
};

const REASON: Record<OfflineReason, string> = {
  'switched-off': 'switched off',
  manual: 'manual',
  'no-power': 'no power',
  fault: 'fault',
  'not-delivering': 'not delivering',
};

const EFFECT: Record<ChannelId, string> = {
  hypochlorite: 'the chlorine will fall',
  acid: 'the pH will drift up',
  co2: 'the pH will drift up',
};

function fixFor(id: ChannelId, reason: OfflineReason): string {
  const at = id === 'co2' ? 'at the valve controller' : 'at the pump';
  switch (reason) {
    case 'switched-off':
      return `Switch it back on ${at}.`;
    case 'manual':
      return `Set it back to REMOTE ${at}.`;
    case 'no-power':
      return 'Find out why it has no power.';
    case 'fault':
      return `Clear its fault and reset it ${at}.`;
    case 'not-delivering':
      return id === 'co2'
        ? 'Check the cylinder and the regulator.'
        : 'Check the day tank and the suction line.';
  }
}

const MINUS = '−';
const twoDp = (v: number) => v.toFixed(2).replace('-', MINUS);
const whole = (v: number) => String(Math.round(v));
const signed = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? MINUS : ''}${Math.abs(v).toFixed(2)}`;

/** Three significant figures. */
function sig3(v: number) {
  if (!(v > 0)) return 0;
  const p = 10 ** (Math.floor(Math.log10(v)) - 2);
  return Math.round(v / p) * p;
}

function amountWords(v: number) {
  if (v >= 100) return whole(v);
  if (v >= 10) return v.toFixed(1).replace(/\.0$/, '');
  if (v >= 1) return v.toFixed(2).replace(/0$/, '');
  return v.toPrecision(2);
}

/**
 * How much may go in at one visit (`doc/plans/aqualis-advice-verification.md`,
 * "Per visit"): normal practice is to correct the balance in stages, a
 * turnover and a retest between, so that no one addition clouds the
 * water, overshoots or swings the pH under the bathers. While the pool is
 * open: alkalinity moved at most 50 mg/l, calcium hardness 150 mg/l and the
 * pH 0.2 by hand at a visit; fresh water at most a working day's make-up
 * (8 hours of it). Closed, twice as much (`CLOSED_TIMES`).
 */
export const PER_VISIT = {
  alkalinity: 50,
  hardness: 150,
  ph: 0.2,
  dilutionHours: 8,
} as const;
export const CLOSED_TIMES = 2;

/** Each hand additive as the hand-dose stand-in knows it (`hand-dose.ts`). */
export const HAND_CHEMICAL: Partial<Record<Additive, HandChemical>> = {
  hypochlorite: 'hypochlorite',
  superchlorinate: 'hypochlorite',
  acid: 'acid',
  co2: 'co2',
  bicarbonate: 'bicarbonate',
  sodaAsh: 'sodaAsh',
  calciumChloride: 'calciumChloride',
  thiosulphate: 'thiosulphate',
};

const hoursText = (h: number) =>
  h >= 1.5 ? `${Math.round(h)} h` : `${Math.max(1, Math.round(h * 60))} min`;

/** The water's turnover, h, as entered. */
const turnoverOf = (s: AqualisSettings) =>
  s.dynamics.flowM3h > 0 ? s.dynamics.volumeM3 / s.dynamics.flowM3h : 4;

/** How a dose is put in, in Dr Aqualis's words. */
/**
 * The rate Dr Aqualis recommends for a hand feed, in the chemical's unit a
 * minute, rounded down to two figures so it can be typed into `dose`
 * (`dose pool_01 bicarbonate 12.6kg 130g/min`): into the balance tank,
 * the visit's amount over one turnover, so the water the Trio samples
 * from the tank rises no further than the whole circuit will once mixed;
 * spread over a closed pool, which the Trio sees only mixed, over a
 * quarter of a turnover (at least 10 minutes).
 */
export function feedRate(amount: number, where: Where, s: AqualisSettings) {
  const turnover = turnoverOf(s) * 60;
  const minutes = where === 'pool' ? Math.max(10, turnover / 4) : turnover;
  const r = amount / Math.max(1, minutes);
  if (!(r > 0)) return 0;
  const p = 10 ** (Math.floor(Math.log10(r)) - 1);
  return Math.floor(r / p + 1e-9) * p;
}

/** How a dose is put in, in Dr Aqualis's words. */
function howOf(
  additive: Additive,
  where: Where | null,
  first: number,
  firstText: string,
  visits: number,
  rate: number | null,
  c: Ctx | null,
): string {
  if (where === 'automatic') {
    const device = DEVICE[additive as ChannelId] ?? 'pump';
    return `The ${device} is doing this; leave it to work.`;
  }
  const again =
    visits > 1
      ? ` Too much at once: ${firstText} now, retest after a turnover (${hoursText(c ? turnoverOf(c.s) : 4)}) and repeat, ${visits} visits.`
      : '';
  const closeFirst = c && c.open ? 'Close the pool first. ' : '';
  if (additive === 'dilution') {
    const mu = c ? c.makeUp : 0;
    const time =
      mu > 0 ? ` (about ${hoursText(first / mu)} at the make-up's rate)` : '';
    return `Drain it down to waste and refill with fresh water${time}.${again}`;
  }
  const hand = HAND_CHEMICAL[additive];
  const info = hand ? handChemical(hand) : undefined;
  const at =
    info && rate
      ? ` at ${rateText(info, rate)} (about ${hoursText(first / rate / 60)})`
      : '';
  if (additive === 'superchlorinate')
    return `${closeFirst}Spread it across the pool${at}, and keep the pool closed until the chlorine is back in its band.${again}`;
  if (where === 'pool') return `Spread it across the pool${at}.${again}`;
  if (additive === 'acid')
    return `Feed it into the balance tank${at}, acid into water.${again}`;
  return `Feed it into the balance tank${at}.${again}`;
}

function nameOf(additive: Additive) {
  return additive === 'hypochlorite' || additive === 'superchlorinate'
    ? 'sodium hypochlorite (14 %)'
    : additive === 'acid'
      ? 'hydrochloric acid (10 %)'
      : ADDITIVE_NAMES[additive];
}

/**
 * A Show dose: the whole correction `amount`, the most one visit may put
 * in (`perVisit`; all of it at once if that is no less), and how it goes in.
 */
function doseOf(
  additive: Additive,
  amount: number,
  unit: DoseAmount['unit'],
  c: Ctx | null = null,
  perVisit = Infinity,
): DoseAmount | null {
  const a = sig3(amount);
  if (!(a > 0)) return null;
  const visits =
    perVisit > 0 && amount > perVisit * 1.0001
      ? Math.ceil(amount / perVisit - 1e-6)
      : 1;
  const first = visits > 1 ? sig3(perVisit) : a;
  const where = whereOf(additive, c);
  const rate =
    c && where && where !== 'automatic' && HAND_CHEMICAL[additive]
      ? feedRate(first, where, c.s)
      : null;
  return {
    amount: a,
    unit,
    text: `${amountWords(a)} ${unit} of ${nameOf(additive)}`,
    how: howOf(
      additive,
      where,
      first,
      `${amountWords(first)} ${unit}`,
      visits,
      rate,
      c,
    ),
    visits,
    first,
    rate,
  };
}

// ---- Show dose arithmetic ------------------------------------------------------------

interface Ctx {
  r: AqualisReadings;
  s: AqualisSettings;
  w: PoolChemistry;
  V: number;
  T: number;
  online: (id: ChannelId) => boolean;
  /** The pool open to bathers: bather safety bounds every instruction. */
  open: boolean;
  /** Fresh water's rate for a dilution, m³/h (the make-up's: about a tenth of the circulation). */
  makeUp: number;
  /** A First Aid programme raising (or bringing down) the chlorine on purpose. */
  superchlorinating: boolean;
}

/** A visit's limit on a reading's change: open, or (closed) `CLOSED_TIMES` as much. */
const limit = (c: Ctx, k: keyof typeof PER_VISIT) =>
  PER_VISIT[k] * (c.open ? 1 : CLOSED_TIMES);

/** Calcium chloride's most at a visit, kg, of `g` grams that raise the hardness to its set point or further. */
const limitHardness = (c: Ctx, g: number) =>
  (g / 1000) *
  Math.min(
    1,
    limit(c, 'hardness') /
      Math.max(1e-9, c.s.targets.calciumHardness.set - c.w.hardness),
  );

/** The grams of one addition that bring `measure` to `target`, by bisection (`measure` rising with the grams if `rising`). */
function gramsFor(
  c: Ctx,
  key: keyof Additions,
  measure: (w: PoolChemistry) => number,
  target: number,
  hi: number,
) {
  const at = (g: number) => measure(dose(c.w, { [key]: g }, c.V, c.T));
  const rising = at(hi) > at(0);
  if (rising ? at(0) >= target : at(0) <= target) return 0;
  if (rising ? at(hi) < target : at(hi) > target) return hi;
  let lo = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) < target === rising) lo = mid;
    else hi = mid;
  }
  return hi;
}

const lsiOf = (c: Ctx) => (w: PoolChemistry) =>
  chemistryReadings(w, c.T).langelier;

/** The LSI the readings show, matched to the model's: the target as a model LSI. */
const lsiTarget = (c: Ctx) => lsiOf(c)(c.w) + (c.s.targets.lsi.set - c.r.lsi);

/** Fresh water to drain and replace, m³, that brings `key` from the pool's to `target`; null if the mains cannot. */
function dilutionFor(
  c: Ctx,
  key: 'hardness' | 'tds' | 'sulphate',
  target: number,
) {
  const C = c.w[key];
  const M = waterFrom(MAINS)[key];
  if (!(C > target) || !(target > M)) return null;
  return (c.V * (C - target)) / (C - M);
}

/** The pool's water after `m3` of it is drained and replaced with mains water. */
export function dilute(
  w: PoolChemistry,
  m3: number,
  volume: number,
  T: number,
) {
  const f = Math.min(1, Math.max(0, m3 / volume));
  return mixWaters(
    [
      { water: w, volume: 1 - f },
      { water: waterFrom(MAINS), volume: f },
    ],
    T,
  );
}

/** What else the advice depends on. */
export interface AdviseOptions {
  /** The pool open to bathers (the default) or closed (`TrioState.poolOpen`). */
  open?: boolean;
  /** The normal targets, for the reopening criteria, where First Aid's are worked to (default: the settings'). */
  normal?: AqualisSettings['targets'];
  /** A First Aid programme running that keeps the pool closed. */
  closedByFirstAid?: boolean;
  /** A First Aid programme raising the chlorine, or bringing it down, on purpose: high chlorine is intended, not a tier-1 problem. */
  superchlorinating?: boolean;
}

/**
 * What must be true before a closed pool reopens (normal practice, after
 * PWTAG's guidance on reopening after an incident or a shock): free
 * chlorine back in its band, combined chlorine no higher than its limit,
 * pH in its band, and no First Aid programme still running that needs it
 * closed. Each criterion not yet met, in words; none, it may reopen.
 */
export function reopenUnmet(
  r: AqualisReadings,
  t: AqualisSettings['targets'],
  closedByFirstAid = false,
): string[] {
  const out: string[] = [];
  if (closedByFirstAid) out.push('First Aid to finish');
  if (
    r.freeChlorine < t.freeChlorine.low ||
    r.freeChlorine > t.freeChlorine.high
  )
    out.push(
      `free chlorine ${twoDp(t.freeChlorine.low)}–${twoDp(t.freeChlorine.high)} (now ${twoDp(r.freeChlorine)})`,
    );
  if (r.combinedChlorine > t.combinedChlorine.high)
    out.push(
      `combined chlorine at most ${twoDp(t.combinedChlorine.high)} (now ${twoDp(r.combinedChlorine)})`,
    );
  if (r.ph < t.ph.low || r.ph > t.ph.high)
    out.push(`pH ${twoDp(t.ph.low)}–${twoDp(t.ph.high)} (now ${twoDp(r.ph)})`);
  return out;
}

function reopenAdvice(c: Ctx, o: AdviseOptions): Draft {
  const unmet = reopenUnmet(
    c.r,
    o.normal ?? c.s.targets,
    o.closedByFirstAid ?? false,
  );
  return {
    id: 'pool-closed',
    reading: null,
    severity: 'info',
    problem: unmet.length
      ? `The pool is closed. Before it reopens: ${unmet.join('; ')}.`
      : 'The pool is closed, and the water is fit to swim in.',
    direction: unmet.length
      ? 'Keep it closed until then.'
      : 'It may reopen (Settings › Pool dynamics).',
    additive: null,
    dose: null,
  };
}

// ---- The rules ------------------------------------------------------------------------

/** Within a severity, root causes first. */
const RANK: readonly string[] = [
  'hypochlorite-offline',
  'acid-offline',
  'co2-offline',
  'no-readings',
  'free-chlorine-high',
  'free-chlorine-low',
  'combined-chlorine-high',
  'alkalinity-low',
  'alkalinity-high',
  'ph-high',
  'ph-low',
  'calcium-hardness-low',
  'calcium-hardness-high',
  'balance-aggressive',
  'balance-scaling',
  'tds-high',
  'sulphate-high',
  'hypochlorite-unconnected',
  'acid-unconnected',
  'co2-unconnected',
  'all-well',
];

/** What each advice causes: a cause is lifted to the severity of what it causes. */
const CAUSES: Record<string, readonly string[]> = {
  'hypochlorite-offline': ['free-chlorine-low'],
  'acid-offline': ['ph-high'],
  'co2-offline': ['ph-high'],
  'alkalinity-low': ['ph-low', 'balance-aggressive'],
  'alkalinity-high': ['ph-high', 'balance-scaling'],
  'ph-high': ['balance-scaling'],
  'ph-low': ['balance-aggressive'],
  'calcium-hardness-low': ['balance-aggressive'],
  'calcium-hardness-high': ['balance-scaling'],
};

function moodOf(severity: Severity, reading: ReadingId | null): Mood {
  if (severity === 'alarm') return 'alarmed';
  if (severity === 'warning') return reading ? 'pointing' : 'concerned';
  return 'idle';
}

type Draft = Omit<Advice, 'mood' | 'where' | 'tier'> & { where?: Where | null };

/**
 * Where an additive goes. The pumps' own chemicals are theirs while their
 * channel is online. By hand, into the balance tank while the pool is
 * open (PWTAG: never into the pool with bathers in it); closed, spread
 * straight over the pool, which the Trio's tapping then sees only mixed.
 * CO₂ by hand always at its injection point (the pool's return).
 */
function whereOf(additive: Additive | null, c: Ctx | null): Where | null {
  if (!additive) return null;
  if (additive === 'dilution' || additive === 'superchlorinate') return 'pool';
  if (additive === 'co2') return c?.online('co2') ? 'automatic' : 'pool';
  if (
    (additive === 'hypochlorite' || additive === 'acid') &&
    c?.online(additive)
  )
    return 'automatic';
  return c && !c.open ? 'pool' : 'balance-tank';
}

function readingRules(c: Ctx): Draft[] {
  const { r, s, V } = c;
  const t = s.targets;
  const out: Draft[] = [];
  const add = (d: Draft) => out.push(d);

  // Free chlorine.
  const fc = r.freeChlorine;
  if (fc < t.freeChlorine.low) {
    const g = Math.max(0, t.freeChlorine.set - c.w.freeChlorine) * V;
    add({
      id: 'free-chlorine-low',
      reading: 'freeChlorine',
      severity:
        fc < t.freeChlorine.low * ALARM_LIMITS.chlorineLowShare
          ? 'alarm'
          : 'warning',
      problem: `Free chlorine low (${twoDp(fc)} mg/l): the germs are winning.`,
      direction: 'Raise it with sodium hypochlorite.',
      additive: 'hypochlorite',
      dose: doseOf(
        'hypochlorite',
        g / CHANNELS.hypochlorite.gramsPerUnit,
        'l',
        c,
      ),
    });
  } else if (fc > t.freeChlorine.high) {
    const veryHigh = fc > t.freeChlorine.high * ALARM_LIMITS.chlorineHighTimes;
    if (veryHigh) {
      const g =
        (Math.max(0, c.w.freeChlorine - t.freeChlorine.set) * V) /
        thiosulphateStoichiometry().chlorinePerMg;
      // Closed, high chlorine harms no bather: it only keeps the pool shut.
      add({
        id: 'free-chlorine-high',
        reading: 'freeChlorine',
        severity: c.open ? 'alarm' : 'warning',
        problem: c.open
          ? `Free chlorine far too high (${twoDp(fc)} mg/l): nobody should swim in that!`
          : `Free chlorine far above its band (${twoDp(fc)} mg/l): the pool stays closed until it is under ${twoDp(t.freeChlorine.high)}.`,
        direction: c.open
          ? 'Stop the hypochlorite and take it down with sodium thiosulphate.'
          : 'Let it fall, or take it down with sodium thiosulphate.',
        additive: 'thiosulphate',
        dose: doseOf('thiosulphate', g / 1000, 'kg', c),
      });
    } else {
      add({
        id: 'free-chlorine-high',
        reading: 'freeChlorine',
        severity: 'warning',
        problem: `Free chlorine rather high (${twoDp(fc)} mg/l): stinging eyes, I fear.`,
        direction: 'Turn the hypochlorite down; it will fall on its own.',
        additive: null,
        dose: null,
      });
    }
  }

  // Combined chlorine.
  const cc = r.combinedChlorine;
  if (cc > t.combinedChlorine.high) {
    const to = Math.max(t.freeChlorine.set, SUPERCHLORINATE_TIMES * cc);
    const g = Math.max(0, to - c.w.freeChlorine) * V;
    add({
      id: 'combined-chlorine-high',
      reading: 'combinedChlorine',
      severity:
        cc > t.combinedChlorine.high * ALARM_LIMITS.combinedTimes
          ? 'alarm'
          : 'warning',
      problem: `Combined chlorine high (${twoDp(cc)} mg/l): that pong is chloramines.`,
      direction: c.open
        ? 'Close the pool and superchlorinate it to burn them off, or dilute it.'
        : 'Superchlorinate the pool to burn them off, or dilute it.',
      additive: 'superchlorinate',
      dose: doseOf(
        'superchlorinate',
        g / CHANNELS.hypochlorite.gramsPerUnit,
        'l',
        c,
      ),
    });
  }

  // Alkalinity, before the pH it steadies.
  const alk = r.alkalinity;
  if (alk < t.alkalinity.low) {
    const g = gramsFor(
      c,
      'bicarbonate',
      (w) => w.alkalinity,
      t.alkalinity.set,
      1000 * V,
    );
    add({
      id: 'alkalinity-low',
      reading: 'alkalinity',
      severity: 'warning',
      problem: `Alkalinity low (${whole(alk)} mg/l): the pH will be unstable.`,
      // Normal practice: the alkalinity first, then the pH. Bicarbonate
      // nudges the pH up (towards 8.3), so say so where it is already high.
      direction:
        r.ph < t.ph.set
          ? 'Raise the alkalinity with sodium bicarbonate.'
          : c.online('acid') || c.online('co2')
            ? `Raise it with sodium bicarbonate. This will lift the pH a little; the ${c.online('co2') ? 'CO₂' : 'acid pump'} will bring it back down.`
            : 'Raise it with sodium bicarbonate, then lower the pH with acid by hand: the bicarbonate lifts it a little.',
      additive: 'bicarbonate',
      dose: doseOf(
        'bicarbonate',
        g / 1000,
        'kg',
        c,
        ((g / 1000) * limit(c, 'alkalinity')) /
          Math.max(1e-9, t.alkalinity.set - c.w.alkalinity),
      ),
    });
  } else if (alk > t.alkalinity.high) {
    const g = gramsFor(
      c,
      'hcl',
      (w) => w.alkalinity,
      t.alkalinity.set,
      1000 * V,
    );
    const per =
      (g * limit(c, 'alkalinity')) /
      Math.max(1e-9, c.w.alkalinity - t.alkalinity.set);
    add({
      id: 'alkalinity-high',
      reading: 'alkalinity',
      severity: 'warning',
      problem: `Alkalinity high (${whole(alk)} mg/l): the pH will keep creeping up.`,
      direction: 'Bring it down with hydrochloric acid, a little at a time.',
      additive: 'acid',
      dose: doseOf(
        'acid',
        g / CHANNELS.acid.gramsPerUnit,
        'l',
        c,
        per / CHANNELS.acid.gramsPerUnit,
      ),
    });
  }

  // pH.
  const ph = r.ph;
  if (ph > t.ph.high) {
    // CO₂ spares the alkalinity, so it is preferred where that is not high; acid otherwise.
    const useCo2 =
      c.online('co2') && (!c.online('acid') || alk <= t.alkalinity.set);
    const severity: Severity =
      ph > t.ph.high + ALARM_LIMITS.phMargin ? 'alarm' : 'warning';
    const problem = `pH high (${twoDp(ph)}): the chlorine is losing its bite.`;
    if (useCo2) {
      const g = gramsFor(c, 'co2', (w) => w.ph, t.ph.set, 100 * V);
      add({
        id: 'ph-high',
        reading: 'ph',
        severity,
        problem,
        direction: 'Bring it down with CO₂; it spares the alkalinity.',
        additive: 'co2',
        dose: doseOf('co2', g, 'g', c),
      });
    } else {
      const g = acidFor(c.w, t.ph.set, V, c.T);
      const per = acidFor(
        c.w,
        Math.max(t.ph.set, c.w.ph - limit(c, 'ph')),
        V,
        c.T,
      );
      add({
        id: 'ph-high',
        reading: 'ph',
        severity,
        problem,
        direction: 'Bring it down with hydrochloric acid.',
        additive: 'acid',
        dose: doseOf(
          'acid',
          g / CHANNELS.acid.gramsPerUnit,
          'l',
          c,
          per / CHANNELS.acid.gramsPerUnit,
        ),
      });
    }
  } else if (ph < t.ph.low) {
    const g = gramsFor(c, 'sodaAsh', (w) => w.ph, t.ph.set, 200 * V);
    const per = gramsFor(
      c,
      'sodaAsh',
      (w) => w.ph,
      Math.min(t.ph.set, c.w.ph + limit(c, 'ph')),
      200 * V,
    );
    add({
      id: 'ph-low',
      reading: 'ph',
      severity: ph < t.ph.low - ALARM_LIMITS.phMargin ? 'alarm' : 'warning',
      problem: `pH low (${twoDp(ph)}): the water will sting and corrode.`,
      direction: 'Raise it gently with soda ash.',
      additive: 'sodaAsh',
      dose: doseOf('sodaAsh', g / 1000, 'kg', c, per / 1000),
    });
  }

  // Calcium hardness.
  const ch = r.calciumHardness;
  if (ch < t.calciumHardness.low) {
    const g = gramsFor(
      c,
      'calciumChloride',
      (w) => w.hardness,
      t.calciumHardness.set,
      1000 * V,
    );
    add({
      id: 'calcium-hardness-low',
      reading: 'calciumHardness',
      severity: 'warning',
      problem: `Calcium hardness low (${whole(ch)} mg/l): the water will eat the grout.`,
      direction: 'Raise it with calcium chloride.',
      additive: 'calciumChloride',
      dose: doseOf(
        'calciumChloride',
        g / 1000,
        'kg',
        c,
        ((g / 1000) * limit(c, 'hardness')) /
          Math.max(1e-9, t.calciumHardness.set - c.w.hardness),
      ),
    });
  } else if (ch > t.calciumHardness.high) {
    const m3 = dilutionFor(c, 'hardness', t.calciumHardness.set);
    add({
      id: 'calcium-hardness-high',
      reading: 'calciumHardness',
      severity: 'warning',
      problem: `Calcium hardness high (${whole(ch)} mg/l): scale ahead, mark my words.`,
      direction: 'Dilute the pool with fresh water.',
      additive: 'dilution',
      dose:
        m3 === null
          ? null
          : doseOf(
              'dilution',
              m3,
              'm³',
              c,
              c.makeUp * limit(c, 'dilutionHours'),
            ),
    });
  }

  // The balance, after the readings that make it.
  const lsi = r.lsi;
  const has = (id: string) => out.some((d) => d.id === id);
  if (lsi < t.lsi.low) {
    const caused = has('ph-low') || has('alkalinity-low');
    const g = caused
      ? 0
      : gramsFor(c, 'calciumChloride', lsiOf(c), lsiTarget(c), 5000 * V);
    add({
      id: 'balance-aggressive',
      reading: 'lsi',
      severity: 'alarm',
      problem: `Water aggressive (LSI ${signed(lsi)}): it will etch the tiles.`,
      direction: caused
        ? 'Put the pH and alkalinity right first, then look again.'
        : 'Raise the calcium hardness with calcium chloride.',
      additive: caused ? null : 'calciumChloride',
      dose: caused
        ? null
        : doseOf('calciumChloride', g / 1000, 'kg', c, limitHardness(c, g)),
    });
  } else if (lsi > t.lsi.high) {
    const caused =
      has('ph-high') || has('alkalinity-high') || has('calcium-hardness-high');
    const g = caused ? 0 : gramsFor(c, 'hcl', lsiOf(c), lsiTarget(c), 1000 * V);
    add({
      id: 'balance-scaling',
      reading: 'lsi',
      severity: 'alarm',
      problem: `Water scaling (LSI ${signed(lsi)}): cloudy water and crusty pipes.`,
      direction: caused
        ? 'Put the pH, alkalinity and hardness right first, then look again.'
        : 'Lower the pH a touch with hydrochloric acid.',
      additive: caused ? null : 'acid',
      dose: caused
        ? null
        : doseOf('acid', g / CHANNELS.acid.gramsPerUnit, 'l', c),
    });
  }

  // What only fresh water takes away.
  if (r.tds > t.tds.high) {
    const m3 = dilutionFor(c, 'tds', t.tds.set);
    add({
      id: 'tds-high',
      reading: 'tds',
      severity: 'warning',
      problem: `Dissolved solids high (${whole(r.tds)} mg/l): this water is tired.`,
      direction: 'Dilute the pool with fresh water.',
      additive: 'dilution',
      dose:
        m3 === null
          ? null
          : doseOf(
              'dilution',
              m3,
              'm³',
              c,
              c.makeUp * limit(c, 'dilutionHours'),
            ),
    });
  }
  if (r.sulphate > t.sulphate.high) {
    const m3 = dilutionFor(c, 'sulphate', t.sulphate.set);
    add({
      id: 'sulphate-high',
      reading: 'sulphate',
      severity: 'warning',
      problem: `Sulphate high (${whole(r.sulphate)} mg/l): it attacks cement grout.`,
      direction: 'Dilute the pool with fresh water.',
      additive: 'dilution',
      dose:
        m3 === null
          ? null
          : doseOf(
              'dilution',
              m3,
              'm³',
              c,
              c.makeUp * limit(c, 'dilutionHours'),
            ),
    });
  }
  return out;
}

function channelRules(
  channels: readonly ChannelView[],
  phHigh: boolean,
): Draft[] {
  const out: Draft[] = [];
  for (const ch of channels) {
    const st = ch.status;
    if (st.kind === 'offline') {
      const why =
        st.reason === 'fault' && st.fault
          ? `fault: ${st.fault}`
          : REASON[st.reason];
      out.push({
        id: `${ch.id}-offline`,
        reading: null,
        severity: 'warning',
        problem: `The ${DEVICE[ch.id]} is offline (${why}): ${EFFECT[ch.id]}.`,
        direction: fixFor(ch.id, st.reason),
        additive: null,
        dose: null,
      });
    } else if (st.kind === 'unconnected' && (ch.id !== 'co2' || phHigh)) {
      out.push({
        id: `${ch.id}-unconnected`,
        reading: null,
        severity: 'info',
        problem:
          ch.id === 'co2'
            ? 'No CO₂ connected: acid must do all the pH work.'
            : `No ${CHANNELS[ch.id].name.toLowerCase()} pump connected.`,
        direction:
          ch.id === 'co2'
            ? 'That is quite all right; acid will manage.'
            : `Dose ${CHANNELS[ch.id].name.toLowerCase()} by hand.`,
        additive: null,
        dose: null,
      });
    }
  }
  return out;
}

/**
 * Each advice's tier (`doc/plans/aqualis-advice-verification.md`, Part 3;
 * the owner, 2026-10-31): 1, health and safety; 2, water balance and
 * comfort; 3, information. Tier 1 is chlorine too low to disinfect, a
 * chlorine dangerously high or a pH far out (beyond `ALARM_LIMITS`) while
 * the pool is open, the hypochlorite offline, and the acid or CO₂ offline
 * while the pH is already high (its chlorine losing its bite). A closed
 * pool relaxes the bather-safety tier (the high chlorine and the far pH
 * are tier 2 then); in superchlorination high chlorine is intended, so
 * it is never tier 1.
 */
function tierOf(d: Draft, c: Ctx | null, has: (id: string) => boolean): Tier {
  const open = c?.open ?? true;
  switch (d.id) {
    case 'free-chlorine-low':
    case 'hypochlorite-offline':
      return 1;
    case 'free-chlorine-high':
      return open && d.severity === 'alarm' && !c?.superchlorinating ? 1 : 2;
    case 'ph-high':
    case 'ph-low':
      return open && d.severity === 'alarm' ? 1 : 2;
    case 'acid-offline':
    case 'co2-offline':
      return has('ph-high') ? 1 : 2;
  }
  return d.severity === 'info' ? 3 : 2;
}

/**
 * How much difference an advice's correction makes: its reading's distance
 * from its set point in its half-band (the side it is on), so a reading
 * at its band's edge is 1 and twice as far 2 (`deviation`). Advice about
 * the cabinet itself counts nought of its own.
 */
function sizeOf(d: Draft, c: Ctx | null): number {
  if (!c || !d.reading || d.reading === 'temperature') return 0;
  return deviation(c.r[d.reading], c.s.targets[d.reading]);
}

/** A reading's distance from its set point, in the half-band on its side: 1 at the band's edge. */
export function deviation(v: number, t: Target): number {
  const half = v >= t.set ? t.high - t.set : t.set - t.low;
  return half > 0 ? Math.abs(v - t.set) / half : v === t.set ? 0 : 1;
}

/**
 * What must come before what, whatever its size: a cause before what it
 * causes (`CAUSES`), and, normal practice (PWTAG; every trade guide),
 * alkalinity before pH, since it is the pH's buffer: the pH is put right
 * once the alkalinity is.
 */
const BEFORE: Record<string, readonly string[]> = {
  ...CAUSES,
  'alkalinity-low': [...CAUSES['alkalinity-low'], 'ph-high'],
  'alkalinity-high': [...CAUSES['alkalinity-high'], 'ph-low'],
};

/**
 * Sort: safety first, by tier; within a tier, the biggest difference
 * first (`sizeOf`); but a cause, and alkalinity, before what they come
 * before (`BEFORE`), taking its tier and its size (a hair over) where
 * those are greater; ties by `RANK`.
 */
function order(drafts: Draft[], c: Ctx | null): Advice[] {
  const ids = new Set(drafts.map((d) => d.id));
  const has = (id: string) => ids.has(id);
  const own = new Map(
    drafts.map((d) => [d.id, { tier: tierOf(d, c, has), size: sizeOf(d, c) }]),
  );
  const lifted = (
    id: string,
    seen: Set<string> = new Set(),
  ): { tier: Tier; size: number } => {
    const o = own.get(id) ?? { tier: 3 as Tier, size: 0 };
    if (seen.has(id)) return o;
    seen.add(id);
    let { tier, size } = o;
    for (const e of BEFORE[id] ?? []) {
      if (!has(e)) continue;
      const l = lifted(e, seen);
      if (l.tier < tier || (l.tier === tier && l.size >= size)) {
        size = l.tier < tier ? l.size + 1e-6 : Math.max(size, l.size + 1e-6);
        tier = l.tier;
      }
    }
    return { tier, size };
  };
  const rank = (id: string) => {
    const i = RANK.indexOf(id);
    return i < 0 ? RANK.length : i;
  };
  return drafts
    .map((d) => ({ d, k: lifted(d.id) }))
    .sort(
      (a, b) =>
        a.k.tier - b.k.tier ||
        b.k.size - a.k.size ||
        rank(a.d.id) - rank(b.d.id),
    )
    .map(({ d, k }) => ({
      ...d,
      tier: k.tier,
      where: d.where !== undefined ? d.where : whereOf(d.additive, c),
      mood: moodOf(d.severity, d.reading),
    }));
}

/**
 * Dr Aqualis's advice, most urgent first: every reading outside its band
 * (null readings: none yet), every channel offline, and a pleased word
 * when the readings are all in band. `water`, the pool's own, is what Show
 * dose is worked on; without it, a water rebuilt from the readings.
 */
export function advise(
  readings: AqualisReadings | null,
  settings: AqualisSettings,
  channelsIn: Channels,
  water?: PoolChemistry,
  options: AdviseOptions = {},
): Advice[] {
  const channels = listOf(channelsIn);
  const statusOf = (id: ChannelId) =>
    channels.find((ch) => ch.id === id)?.status.kind ?? 'unconnected';
  if (!readings) {
    const drafts = channelRules(channels, false);
    drafts.push({
      id: 'no-readings',
      reading: null,
      severity: 'info',
      problem: 'No readings yet: the sample is still settling.',
      direction: 'Give me a moment, if you please.',
      additive: null,
      dose: null,
    });
    return order(drafts, null);
  }
  const T = readings.temperature;
  const c: Ctx = {
    r: readings,
    s: settings,
    w:
      water ??
      waterFrom({
        ph: readings.ph,
        alkalinity: readings.alkalinity,
        hardness: readings.calciumHardness,
        tds: readings.tds,
        temperature: T,
        freeChlorine: readings.freeChlorine,
        sulphate: readings.sulphate,
      }),
    V: Math.max(1e-6, settings.dynamics.volumeM3),
    T,
    online: (id) => statusOf(id) === 'online',
    open: options.open ?? true,
    makeUp: Math.max(0.1, settings.dynamics.flowM3h * 0.1),
    superchlorinating: options.superchlorinating ?? false,
  };
  const drafts = readingRules(c);
  const phHigh = readings.ph > settings.targets.ph.high;
  if (drafts.length === 0)
    drafts.push({
      id: 'all-well',
      reading: null,
      severity: 'info',
      problem: 'Splendid! Every reading is in its band.',
      direction: 'Carry on just as you are.',
      additive: null,
      dose: null,
    });
  if (!c.open) drafts.push(reopenAdvice(c, options));
  drafts.push(...channelRules(channels, phHigh));
  const out = order(drafts, c);
  for (const a of out) if (a.id === 'all-well') a.mood = 'pleased';
  return out;
}

// ---- Alarms -----------------------------------------------------------------------------

const ALARM_TEXT: Record<AlarmId, string> = {
  'chlorine-low': 'CHLORINE LOW',
  'chlorine-high': 'CHLORINE HIGH',
  'ph-low': 'pH LOW',
  'ph-high': 'pH HIGH',
  'combined-high': 'COMBINED Cl HIGH',
  'balance-aggressive': 'WATER AGGRESSIVE',
  'balance-scaling': 'WATER SCALING',
  'sample-flow-low': 'SAMPLE FLOW LOW',
  'dosing-offline': 'DOSING OFFLINE',
  // Raised by the watchdog, not the advisor (`aqualis-os.ts`).
  'controller-fault': 'CONTROLLER FAULT',
};

/**
 * The cabinet's alarms, at `ALARM_LIMITS` beyond the target bands (the
 * balance at its band); sample flow low while the sample is not flowing;
 * dosing offline while any connected channel is offline and the knob is
 * at AUTO or HAND (either should be dosing). Readings null (none yet):
 * only the last two can sound.
 */
export function alarms(
  readings: AqualisReadings | null,
  sample: SampleStatus,
  channelsIn: Channels,
  settings: AqualisSettings,
  selector: Selector = 'auto',
): Alarm[] {
  const channels = listOf(channelsIn);
  const on: AlarmId[] = [];
  const t = settings.targets;
  const L = ALARM_LIMITS;
  if (readings) {
    const r = readings;
    if (r.freeChlorine < t.freeChlorine.low * L.chlorineLowShare)
      on.push('chlorine-low');
    if (r.freeChlorine > t.freeChlorine.high * L.chlorineHighTimes)
      on.push('chlorine-high');
    if (r.ph < t.ph.low - L.phMargin) on.push('ph-low');
    if (r.ph > t.ph.high + L.phMargin) on.push('ph-high');
    if (r.combinedChlorine > t.combinedChlorine.high * L.combinedTimes)
      on.push('combined-high');
    if (r.lsi < t.lsi.low) on.push('balance-aggressive');
    if (r.lsi > t.lsi.high) on.push('balance-scaling');
  }
  if (!sample.flowing) on.push('sample-flow-low');
  if (selector !== 'off' && channels.some((c) => c.status.kind === 'offline'))
    on.push('dosing-offline');
  return on.map((id) => ({ id, text: ALARM_TEXT[id] }));
}
