import {
  acidFor,
  dose,
  mixWaters,
  readings as chemistryReadings,
  waterFrom,
  thiosulphateStoichiometry,
} from '../water/pool-chemistry';
import { MOLAR } from '../water/pool-chemistry';
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
 * **Where.** A connected channel owns its chemical even if it is offline
 * or at capacity; Dr Aqualis advises repair rather than a manual dose.
 * Every other hand chemical goes into the
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
 * high limit (the latter marks "very high"; thiosulphate is reserved for
 * more than three times the high limit);
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

/**
 * A dosing channel asked for this share of its most or more is flat out
 * (`Ctx.pinned`): Dr Aqualis reports its capacity limit.
 */
export const PINNED = 0.98;

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

function fixFor(
  id: ChannelId,
  reason: OfflineReason,
  fault: string | null = null,
): string {
  const at = id === 'co2' ? 'at the valve controller' : 'at the pump';
  // A pump's own faults, as its manual puts them right.
  if (reason === 'fault' && fault === 'flow monitor tripped')
    return 'Gas in its head: open its bleed, acknowledge it, and shut the bleed once it pumps liquid.';
  if (reason === 'fault' && fault === 'tank empty')
    return 'Its day tank is empty: fill it, then acknowledge the pump.';
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
 * (`dose pool_01 bicarbonate 12.6kg 130g/min`): the visit's amount over
 * one turnover, so the water the Trio samples from the tank rises no
 * further than the whole circuit will once mixed, and the pumps keep pace
 * with what it does to the pH (bicarbonate lifts it); the same spread
 * over a closed pool, which spread faster pushed the pH out of its band
 * (Part 4). A shock (superchlorination) goes in over a quarter of a
 * turnover, at least 10 minutes.
 */
export function feedRate(amount: number, s: AqualisSettings, shock = false) {
  const turnover = turnoverOf(s) * 60;
  const minutes = shock ? Math.max(10, turnover / 4) : turnover;
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
    if (c && !c.online(additive as ChannelId))
      return `The ${device} is offline; restore it before the controller can dose.`;
    if (c?.pinned(additive as ChannelId))
      return `The ${device} is working at full capacity; check why demand exceeds its output.`;
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
  whereTo?: Where,
): DoseAmount | null {
  const a = sig3(amount);
  if (!(a > 0)) return null;
  const visits =
    perVisit > 0 && amount > perVisit * 1.0001
      ? Math.ceil(amount / perVisit - 1e-6)
      : 1;
  const first = visits > 1 ? sig3(perVisit) : a;
  const where = whereTo ?? whereOf(additive, c);
  const rate =
    c && where && where !== 'automatic' && HAND_CHEMICAL[additive]
      ? feedRate(first, c.s, additive === 'superchlorinate')
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
  connected: (id: ChannelId) => boolean;
  /** Online but asked for all it has (`PINNED`): it cannot catch up alone. */
  pinned: (id: ChannelId) => boolean;
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
  key: 'alkalinity' | 'hardness' | 'tds' | 'sulphate',
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

/** Smallest fresh-water replacement that brings the modelled balance to target. */
function dilutionToLsi(c: Ctx, target: number): number | null {
  const at = (m3: number) => lsiOf(c)(dilute(c.w, m3, c.V, c.T));
  if (at(c.V) >= target) return null;
  let lo = 0;
  let hi = c.V;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) > target) lo = mid;
    else hi = mid;
  }
  return hi;
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
  /** Work out Show dose's amounts (the default), or leave them for `doseFor` (each advice's `hasDose` says whether it has one). */
  doses?: boolean;
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
    prescribe: null,
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

type Draft = Omit<Advice, 'mood' | 'where' | 'tier' | 'dose' | 'hasDose'> & {
  where?: Where | null;
  /** Its Show dose, worked out only when asked for (Part 5); null where it has none. */
  prescribe: (() => DoseAmount | null) | null;
};

/**
 * Where an additive goes. Connected channels own their chemicals even
 * when offline or saturated. By hand, into the balance tank while the pool is
 * open (PWTAG: never into the pool with bathers in it); closed, spread
 * straight over the pool, which the Trio's tapping then sees only mixed.
 * CO₂ is only recommended while its channel is online.
 */
function whereOf(additive: Additive | null, c: Ctx | null): Where | null {
  if (!additive) return null;
  if (additive === 'dilution' || additive === 'superchlorinate') return 'pool';
  if (
    (additive === 'co2' ||
      additive === 'hypochlorite' ||
      additive === 'acid') &&
    c?.connected(additive)
  )
    return 'automatic';
  return c && !c.open ? 'pool' : 'balance-tank';
}

function controllerDirection(c: Ctx, id: ChannelId, action: string): string {
  if (!c.connected(id)) return action;
  if (!c.online(id))
    return `The ${DEVICE[id]} is offline; restore it at the equipment before the controller can ${action}.`;
  if (c.pinned(id))
    return `The ${DEVICE[id]} is working at full capacity; let it run and check why demand exceeds its output.`;
  return `The ${DEVICE[id]} is taking care of this automatically; no hand dose is needed.`;
}

function readingRules(c: Ctx): Draft[] {
  const { r, s, V } = c;
  const t = s.targets;
  const shownPh = Math.round(r.ph * 100) / 100;
  const out: Draft[] = [];
  const add = (d: Draft) => out.push(d);
  // Each dose is a closure, worked out only when Show dose asks (Part 5).

  // Free chlorine.
  const fc = r.freeChlorine;
  if (fc < t.freeChlorine.low) {
    add({
      id: 'free-chlorine-low',
      reading: 'freeChlorine',
      severity:
        fc < t.freeChlorine.low * ALARM_LIMITS.chlorineLowShare
          ? 'alarm'
          : 'warning',
      problem: `Free chlorine low (${twoDp(fc)} mg/l): the germs are winning.`,
      direction: controllerDirection(c, 'hypochlorite', 'raise the chlorine'),
      additive: 'hypochlorite',
      prescribe: () => {
        const g = Math.max(0, t.freeChlorine.set - c.w.freeChlorine) * V;
        return doseOf(
          'hypochlorite',
          g / CHANNELS.hypochlorite.gramsPerUnit,
          'l',
          c,
        );
      },
    });
  } else if (fc > t.freeChlorine.high) {
    const veryHigh = fc > t.freeChlorine.high * ALARM_LIMITS.chlorineHighTimes;
    if (veryHigh) {
      const rapidReduction = fc > t.freeChlorine.high * 3;
      // Closed, high chlorine harms no bather: it only keeps the pool shut.
      add({
        id: 'free-chlorine-high',
        reading: 'freeChlorine',
        severity: c.open ? 'alarm' : 'warning',
        problem: c.open
          ? `Free chlorine far too high (${twoDp(fc)} mg/l): nobody should swim in that!`
          : `Free chlorine far above its band (${twoDp(fc)} mg/l): the pool stays closed until it is under ${twoDp(t.freeChlorine.high)}.`,
        direction: rapidReduction
          ? c.open
            ? 'Close the pool now; start First Aid › Bring chlorine down and use sodium thiosulphate. Retest before reopening.'
            : 'Keep the pool closed; start First Aid › Bring chlorine down and use sodium thiosulphate. Retest before reopening.'
          : c.open
            ? 'Close the pool now; let the chlorine fall naturally. Or start First Aid › Bring chlorine down. Retest before reopening.'
            : 'Keep the pool closed and let the chlorine fall naturally; retest before reopening.',
        additive: rapidReduction ? 'thiosulphate' : null,
        prescribe: rapidReduction
          ? () =>
              doseOf(
                'thiosulphate',
                ((fc - t.freeChlorine.high) * V) /
                  thiosulphateStoichiometry().chlorinePerMg /
                  1000,
                'kg',
                c,
              )
          : null,
      });
    } else {
      add({
        id: 'free-chlorine-high',
        reading: 'freeChlorine',
        severity: 'warning',
        problem: `Free chlorine rather high (${twoDp(fc)} mg/l): stinging eyes, I fear.`,
        direction: c.online('hypochlorite')
          ? 'The hypochlorite pump has stopped; it will fall on its own.'
          : 'Turn the hypochlorite down; it will fall on its own.',
        additive: null,
        prescribe: null,
      });
    }
  }

  // Combined chlorine.
  const cc = r.combinedChlorine;
  if (cc > t.combinedChlorine.high) {
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
      prescribe: () => {
        const to = Math.max(t.freeChlorine.set, SUPERCHLORINATE_TIMES * cc);
        const g = Math.max(0, to - c.w.freeChlorine) * V;
        return doseOf(
          'superchlorinate',
          g / CHANNELS.hypochlorite.gramsPerUnit,
          'l',
          c,
        );
      },
    });
  }

  // Alkalinity, before the pH it steadies.
  const alk = r.alkalinity;
  if (alk < t.alkalinity.low) {
    // Normal practice: the alkalinity first, then the pH. Bicarbonate
    // nudges the pH up (towards 8.3): where the pH is already above its
    // band that would take it past its alarm limit, so the pH comes first
    // (the acid pump's, once restored if offline), and the bicarbonate after.
    const acidOnline = c.online('acid') || c.online('co2');
    const waits = shownPh > t.ph.high;
    add({
      id: 'alkalinity-low',
      reading: 'alkalinity',
      severity: 'warning',
      problem: `Alkalinity low (${whole(alk)} mg/l): the pH will be unstable.`,
      direction: waits
        ? acidOnline
          ? `Let the ${c.online('co2') ? 'CO₂' : 'acid pump'} bring the pH into its band first; then raise the alkalinity with sodium bicarbonate.`
          : c.connected('acid')
            ? 'Restore the acid pump to lower the pH first; then raise the alkalinity with sodium bicarbonate.'
            : 'Lower the pH with acid by hand first; then raise the alkalinity with sodium bicarbonate.'
        : shownPh < t.ph.set
          ? 'Raise the alkalinity with sodium bicarbonate.'
          : acidOnline
            ? `Raise it with sodium bicarbonate. This will lift the pH a little; the ${c.online('co2') ? 'CO₂' : 'acid pump'} will bring it back down.`
            : c.connected('acid')
              ? 'Raise it with sodium bicarbonate, then let the acid pump bring the pH back down once restored.'
              : 'Raise it with sodium bicarbonate, then lower the pH with acid by hand: the bicarbonate lifts it a little.',
      additive: waits ? null : 'bicarbonate',
      prescribe: waits
        ? null
        : () => {
            const g = gramsFor(
              c,
              'bicarbonate',
              (w) => w.alkalinity,
              t.alkalinity.set,
              1000 * V,
            );
            // Acid control continues while a long bicarbonate feed mixes;
            // allow a modest extra reserve for the alkalinity it consumes.
            const compensatedG =
              g *
              (c.online('acid') &&
              !c.online('co2') &&
              r.ph >= (t.ph.low + t.ph.set) / 2
                ? 1.12
                : 1);
            // A visit: its alkalinity limit, and no more than lifts the pH
            // (unbuffered by any acid) to 0.1 inside its alarm limit open,
            // or 0.1 past it closed.
            const ceiling =
              t.ph.high + ALARM_LIMITS.phMargin + (c.open ? -0.1 : 0.1);
            const byPh = gramsFor(
              c,
              'bicarbonate',
              (w) => w.ph,
              ceiling,
              1000 * V,
            );
            const byAlk =
              (compensatedG * limit(c, 'alkalinity')) /
              Math.max(1e-9, t.alkalinity.set - c.w.alkalinity);
            return doseOf(
              'bicarbonate',
              compensatedG / 1000,
              'kg',
              c,
              Math.max(compensatedG * 0.01, Math.min(byAlk, byPh)) / 1000,
            );
          },
    });
  } else if (alk > t.alkalinity.high) {
    // A material excess takes the pH-controlled acid pump many turnovers
    // to remove. Within 5 mg/l of the band, leave its trimming alone.
    // Mains water can bring a larger excess into band directly.
    const diluteExcess =
      alk > t.alkalinity.high + 5 &&
      dilutionFor(c, 'alkalinity', t.alkalinity.high - 2) !== null;
    add({
      id: 'alkalinity-high',
      reading: 'alkalinity',
      severity: 'warning',
      problem: `Alkalinity high (${whole(alk)} mg/l): the pH will keep creeping up.`,
      direction: diluteExcess
        ? 'Close the pool and replace water with fresh mains water in stages; retest after each stage.'
        : controllerDirection(c, 'acid', 'lower the alkalinity'),
      additive: diluteExcess ? 'dilution' : 'acid',
      // The connected pump owns this chemical even when offline or saturated.
      where: whereOf(diluteExcess ? 'dilution' : 'acid', c),
      prescribe: () => {
        if (diluteExcess)
          return (
            dilutionOf(
              c,
              dilutionFor(c, 'alkalinity', t.alkalinity.high - 2),
            )?.() ?? null
          );
        const g = gramsFor(
          c,
          'hcl',
          (w) => w.alkalinity,
          t.alkalinity.set,
          1000 * V,
        );
        // A visit's acid: its alkalinity limit, and no more than takes the
        // pH to its band's foot (open) or 0.2 below it (closed); the pH
        // comes back up as the CO₂ the acid made leaves (acid and aerate).
        const floor = t.ph.low - (c.open ? 0 : 0.2);
        const per = Math.min(
          (g * limit(c, 'alkalinity')) /
            Math.max(1e-9, c.w.alkalinity - t.alkalinity.set),
          acidFor(c.w, floor, V, c.T),
        );
        if (!(per > g * 0.01)) return null;
        return doseOf(
          'acid',
          g / CHANNELS.acid.gramsPerUnit,
          'l',
          c,
          per / CHANNELS.acid.gramsPerUnit,
          whereOf('acid', c) ?? undefined,
        );
      },
    });
  }

  // pH.
  const ph = shownPh;
  if (ph > t.ph.high) {
    // CO₂ spares the alkalinity, so it is preferred where that is not high; acid otherwise.
    const useCo2 =
      c.online('co2') && (!c.online('acid') || alk <= t.alkalinity.set);
    const severity: Severity =
      ph > t.ph.high + ALARM_LIMITS.phMargin ? 'alarm' : 'warning';
    const problem = `pH high (${twoDp(ph)}): the chlorine is losing its bite.`;
    if (useCo2) {
      add({
        id: 'ph-high',
        reading: 'ph',
        severity,
        problem,
        direction: controllerDirection(c, 'co2', 'lower the pH'),
        additive: 'co2',
        prescribe: () =>
          doseOf(
            'co2',
            gramsFor(c, 'co2', (w) => w.ph, t.ph.set, 100 * V),
            'g',
            c,
          ),
      });
    } else {
      add({
        id: 'ph-high',
        reading: 'ph',
        severity,
        problem,
        direction: controllerDirection(c, 'acid', 'lower the pH'),
        additive: 'acid',
        prescribe: () => {
          const g = acidFor(c.w, t.ph.set, V, c.T);
          const per = acidFor(
            c.w,
            Math.max(t.ph.set, c.w.ph - limit(c, 'ph')),
            V,
            c.T,
          );
          return doseOf(
            'acid',
            g / CHANNELS.acid.gramsPerUnit,
            'l',
            c,
            per / CHANNELS.acid.gramsPerUnit,
          );
        },
      });
    }
  } else if (ph < t.ph.low) {
    const far = ph < t.ph.low - ALARM_LIMITS.phMargin;
    // Normal practice: a pH a little low in a pool dosed with acid is put
    // right by the water itself, as it gives up its CO₂ (and the acid pump
    // stops); look at the acid dosing. Only a pH far out wants soda ash.
    const waits = !far && c.online('acid');
    add({
      id: 'ph-low',
      reading: 'ph',
      severity: far ? 'alarm' : 'warning',
      problem: `pH low (${twoDp(ph)}): the water will sting and corrode.`,
      direction: waits
        ? 'It will rise on its own as the water gives up its CO₂; check the acid pump is not overdosing.'
        : 'Raise it gently with soda ash.',
      additive: waits ? null : 'sodaAsh',
      prescribe: waits
        ? null
        : () => {
            // Halfway from the band's foot to its set point: a pool's pH
            // drifts up on its own as its CO₂ leaves it, and finishes the job.
            const aim = (t.ph.low + t.ph.set) / 2;
            const g = gramsFor(c, 'sodaAsh', (w) => w.ph, aim, 200 * V);
            const per = gramsFor(
              c,
              'sodaAsh',
              (w) => w.ph,
              Math.min(aim, c.w.ph + limit(c, 'ph')),
              200 * V,
            );
            return doseOf('sodaAsh', g / 1000, 'kg', c, per / 1000);
          },
    });
  }

  // Calcium hardness.
  const ch = r.calciumHardness;
  if (ch < t.calciumHardness.low) {
    add({
      id: 'calcium-hardness-low',
      reading: 'calciumHardness',
      severity: 'warning',
      problem: `Calcium hardness low (${whole(ch)} mg/l): the water will eat the grout.`,
      direction: 'Raise it with calcium chloride.',
      additive: 'calciumChloride',
      prescribe: () => {
        const g = gramsFor(
          c,
          'calciumChloride',
          (w) => w.hardness,
          t.calciumHardness.set,
          1000 * V,
        );
        return doseOf(
          'calciumChloride',
          g / 1000,
          'kg',
          c,
          hardnessVisit(c, g),
        );
      },
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
      prescribe: dilutionOf(c, m3),
    });
  }

  // The balance, after the readings that make it.
  const lsi = r.lsi;
  const has = (id: string) => out.some((d) => d.id === id);
  if (lsi < t.lsi.low) {
    const caused = has('ph-low') || has('alkalinity-low');
    add({
      id: 'balance-aggressive',
      reading: 'lsi',
      severity: 'alarm',
      problem: `Water aggressive (LSI ${signed(lsi)}): it will etch the tiles.`,
      direction: caused
        ? 'Put the pH and alkalinity right first, then look again.'
        : 'Raise the calcium hardness with calcium chloride.',
      additive: caused ? null : 'calciumChloride',
      prescribe: caused
        ? null
        : () => {
            const g = gramsFor(
              c,
              'calciumChloride',
              lsiOf(c),
              lsiTarget(c),
              5000 * V,
            );
            return doseOf(
              'calciumChloride',
              g / 1000,
              'kg',
              c,
              hardnessVisit(c, g),
            );
          },
    });
  } else if (lsi > t.lsi.high) {
    const caused =
      has('ph-high') || has('alkalinity-high') || has('calcium-hardness-high');
    const diluteScaling = !caused && c.online('co2');
    add({
      id: 'balance-scaling',
      reading: 'lsi',
      severity: 'alarm',
      problem: `Water scaling (LSI ${signed(lsi)}): cloudy water and crusty pipes.`,
      direction: caused
        ? 'Put the pH, alkalinity and hardness right first, then look again.'
        : diluteScaling
          ? 'Dilute with fresh water; CO₂ holds pH as the minerals fall.'
          : controllerDirection(c, 'acid', 'lower the pH a touch'),
      additive: caused ? null : diluteScaling ? 'dilution' : 'acid',
      prescribe: caused
        ? null
        : diluteScaling
          ? dilutionOf(c, dilutionToLsi(c, t.lsi.high - 0.05))
          : () => {
              const g = gramsFor(c, 'hcl', lsiOf(c), lsiTarget(c), 1000 * V);
              return doseOf('acid', g / CHANNELS.acid.gramsPerUnit, 'l', c);
            },
    });
  }

  // What only fresh water takes away.
  if (r.tds > t.tds.high) {
    add({
      id: 'tds-high',
      reading: 'tds',
      severity: 'warning',
      problem: `Dissolved solids high (${whole(r.tds)} mg/l): this water is tired.`,
      direction: 'Dilute the pool with fresh water.',
      additive: 'dilution',
      prescribe: dilutionOf(c, dilutionFor(c, 'tds', t.tds.set)),
    });
  }
  if (r.sulphate > t.sulphate.high) {
    add({
      id: 'sulphate-high',
      reading: 'sulphate',
      severity: 'warning',
      problem: `Sulphate high (${whole(r.sulphate)} mg/l): it attacks cement grout.`,
      direction: 'Dilute the pool with fresh water.',
      additive: 'dilution',
      prescribe: dilutionOf(c, dilutionFor(c, 'sulphate', t.sulphate.set)),
    });
  }
  return out;
}

/** A dilution's Show dose, or none where the mains cannot do it. */
const dilutionOf = (c: Ctx, m3: number | null) =>
  m3 === null
    ? null
    : () =>
        doseOf('dilution', m3, 'm³', c, c.makeUp * limit(c, 'dilutionHours'));

/** Calcium chloride's most at a visit, kg, of `g` grams: the hardness it adds no more than its limit. */
function hardnessVisit(c: Ctx, g: number) {
  const rise = ((g / c.V) * MOLAR.CaCO3) / MOLAR.CaCl2;
  return (g / 1000) * Math.min(1, limit(c, 'hardness') / Math.max(1e-9, rise));
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
        direction: fixFor(ch.id, st.reason, st.fault),
        additive: null,
        prescribe: null,
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
        prescribe: null,
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
function order(drafts: Draft[], c: Ctx | null, doses = true): Advice[] {
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
    // Only an instruction comes before: a wait (no additive) does not.
    const draft = drafts.find((d) => d.id === id);
    const instructs = !!draft?.additive || id.endsWith('-offline');
    for (const e of instructs ? (BEFORE[id] ?? []) : []) {
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
    .map(({ d, k }) => {
      const { prescribe, ...rest } = d;
      const dose = doses && prescribe ? prescribe() : null;
      return {
        ...rest,
        tier: k.tier,
        where: d.where !== undefined ? d.where : whereOf(d.additive, c),
        dose,
        hasDose: doses ? dose !== null : prescribe !== null,
        mood: moodOf(d.severity, d.reading),
      };
    });
}

/** The context and the drafts, unordered, their doses not worked out. */
function draftsOf(
  readings: AqualisReadings,
  settings: AqualisSettings,
  channels: readonly ChannelView[],
  water: PoolChemistry | undefined,
  options: AdviseOptions,
): { c: Ctx; drafts: Draft[] } {
  const statusOf = (id: ChannelId) =>
    channels.find((ch) => ch.id === id)?.status.kind ?? 'unconnected';
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
    connected: (id) => statusOf(id) !== 'unconnected',
    // At its limit, advice reports capacity rather than a manual top-up.
    pinned: (id) =>
      statusOf(id) === 'online' &&
      (channels.find((ch) => ch.id === id)?.demand ?? 0) >= PINNED,
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
      prescribe: null,
    });
  if (!c.open) drafts.push(reopenAdvice(c, options));
  drafts.push(...channelRules(channels, phHigh));
  return { c, drafts };
}

/**
 * Dr Aqualis's advice, most urgent first (`order`): every reading outside
 * its band (null readings: none yet), every channel offline, a pleased
 * word when the readings are all in band, and, the pool closed, what it
 * needs to reopen. `water`, the pool's own, is what Show dose is worked
 * on; without it, a water rebuilt from the readings. Show dose's amounts
 * are the costly part (a bisection over `dose()` for most): with
 * `options.doses` false they are left out, each advice's `hasDose` saying
 * whether it has one, for `doseFor` to work out when the player asks.
 */
export function advise(
  readings: AqualisReadings | null,
  settings: AqualisSettings,
  channelsIn: Channels,
  water?: PoolChemistry,
  options: AdviseOptions = {},
): Advice[] {
  const channels = listOf(channelsIn);
  const doses = options.doses ?? true;
  if (!readings) {
    const drafts = channelRules(channels, false);
    drafts.push({
      id: 'no-readings',
      reading: null,
      severity: 'info',
      problem: 'No readings yet: the sample is still settling.',
      direction: 'Give me a moment, if you please.',
      additive: null,
      prescribe: null,
    });
    return order(drafts, null, doses);
  }
  const { c, drafts } = draftsOf(readings, settings, channels, water, options);
  const out = order(drafts, c, doses);
  for (const a of out) if (a.id === 'all-well') a.mood = 'pleased';
  return out;
}

/** One advice's Show dose, worked out alone (as `advise` with doses would give it); null if it has none. */
export function doseFor(
  id: string,
  readings: AqualisReadings | null,
  settings: AqualisSettings,
  channelsIn: Channels,
  water?: PoolChemistry,
  options: AdviseOptions = {},
): DoseAmount | null {
  if (!readings) return null;
  const { drafts } = draftsOf(
    readings,
    settings,
    listOf(channelsIn),
    water,
    options,
  );
  return drafts.find((d) => d.id === id)?.prescribe?.() ?? null;
}

/**
 * A Show dose cache: `doseFor`, kept against the readings, settings,
 * channels and options it was worked out for, so a screen asking every
 * frame works it out once for each new reading (the analyser's tick, 10
 * s) and not again.
 */
export function createDoseCache() {
  let key = '';
  let value: DoseAmount | null = null;
  return (
    id: string,
    readings: AqualisReadings | null,
    settings: AqualisSettings,
    channelsIn: Channels,
    options: AdviseOptions = {},
  ): DoseAmount | null => {
    const kinds = listOf(channelsIn).map((ch) => ch.status.kind);
    const k = JSON.stringify([id, readings, settings, kinds, options]);
    if (k !== key) {
      key = k;
      value = doseFor(id, readings, settings, channelsIn, undefined, options);
    }
    return value;
  };
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
