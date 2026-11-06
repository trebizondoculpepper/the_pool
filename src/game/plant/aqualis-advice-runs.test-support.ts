import { advance, applyAction } from '../world';
import { ALARM_LIMITS } from './aqualis-advisor';
import type { Advice, AqualisSettings } from './aqualis-types';
import type { TrioPool } from './aqualis-world';
import {
  SCORED,
  TRIO,
  alarmIds,
  carryOut,
  poolReadings,
  runFor,
  scenarioWorld,
  score,
  topInstruction,
  turnoverS,
} from './aqualis-advice.test-support';
import type { Advisor, Scenario, Scored } from './aqualis-advice.test-support';

/**
 * The advice verification suite's runs (`doc/plans/aqualis-advice-verification.md`,
 * Part 4): the closed loop, and follow versus don't follow. Each returns
 * its record and its failures (as words), so the same checks can be shown
 * failing on a broken advisor (the negative controls).
 */

/** The alarm limits of the two readings the pumps regulate (`ALARM_LIMITS`). */
const alarmLow = (k: 'freeChlorine' | 'ph', t: AqualisSettings['targets']) =>
  k === 'ph'
    ? t.ph.low - ALARM_LIMITS.phMargin
    : t.freeChlorine.low * ALARM_LIMITS.chlorineLowShare;
const alarmHigh = (k: 'freeChlorine' | 'ph', t: AqualisSettings['targets']) =>
  k === 'ph'
    ? t.ph.high + ALARM_LIMITS.phMargin
    : t.freeChlorine.high * ALARM_LIMITS.chlorineHighTimes;

/** A reading's side of its band: below, in, or above. */
const sideOf = (v: number, t: { low: number; high: number }, resolution = 0) =>
  v < t.low - resolution ? -1 : v > t.high + resolution ? 1 : 0;

/** A closed loop's record: each round's top instruction and score, and what went wrong. */
export interface LoopResult {
  rounds: { advice: string; action: string; score: number }[];
  /** The round it settled at (every reading in band, nothing to do), or null. */
  settledAt: number | null;
  startScore: number;
  endScore: number;
  /** The highest pH the Trio read through it. */
  maxPh: number;
  failures: string[];
}

/**
 * The closed loop (Part 4, item 6): an operator reads the Trio, carries out
 * its top instruction, waits the dose's own time and a turnover, reads
 * again; up to `rounds` times. Readings are the Trio's, what the operator
 * sees. It fails if the water does not settle (every reading in its band,
 * nothing left but information); if a reading out of its band overshoots
 * to the other side of it (sampled every 10 minutes); if a reading's advice
 * flips direction (oscillation); if a round leaves the score worse by more
 * than `worse` (a band's width; a superchlorination's intended rise, and
 * the thiosulphate after it, excepted); or if an instruction cannot be
 * carried out. A pool an instruction closed is reopened once Dr Aqualis
 * says it may.
 */
export function closedLoop(
  s: Scenario,
  pool: TrioPool,
  open: boolean,
  advisor: Advisor = TRIO,
  rounds = 10,
  worse = 1,
  co2 = false,
): LoopResult {
  let w = scenarioWorld(s, pool, open, co2);
  const t = w.aqualis[pool].settings.targets;
  const failures: string[] = [];
  const start = w.aqualis[pool].readings;
  const startSide = Object.fromEntries(
    SCORED.map((k) => [k, sideOf(start[k], t[k], k === 'ph' ? 0.005 : 0)]),
  ) as Record<Scored, number>;
  const directions = new Map<string, number>();
  const out: LoopResult['rounds'] = [];
  let settledAt: number | null = null;
  let maxPh = start.ph;
  let last = score(start, t);
  const startScore = last;
  for (let round = 0; round < rounds; round++) {
    const advice = advisor(w, pool);
    if (
      open &&
      !w.aqualis[pool].poolOpen &&
      advice.some(
        (a) => a.id === 'pool-closed' && /may reopen/.test(a.direction),
      )
    )
      w = applyAction(w, {
        type: 'aqualis',
        pool,
        action: { act: 'pool', open: true },
      });
    const top = topInstruction(advice);
    if (!top) {
      settledAt = round;
      break;
    }
    for (const a of advice) {
      const m = /^(.*)-(low|high)$/.exec(a.id);
      if (!m || !a.reading) continue;
      const dir = m[2] === 'low' ? -1 : 1;
      const was = directions.get(m[1]);
      if (was !== undefined && was !== dir)
        failures.push(
          `round ${round}: ${m[1]} oscillates (${was < 0 ? 'low' : 'high'} then ${m[2]})`,
        );
      directions.set(m[1], dir);
    }
    const c = carryOut(w, pool, top);
    if (!c) {
      failures.push(`round ${round}: no world action carries out ${top.id}`);
      break;
    }
    const shock =
      top.additive === 'superchlorinate' || top.additive === 'thiosulphate';
    w = runFor(c.world, c.done.seconds + turnoverS(w, pool), (x) => {
      // On the way: no further than its alarm limit on the other side.
      const r = x.aqualis[pool].readings;
      maxPh = Math.max(maxPh, r.ph);
      for (const k of SCORED) {
        const half =
          startSide[k] > 0 ? t[k].set - t[k].low : t[k].high - t[k].set;
        const beyond = startSide[k] > 0 ? t[k].low - r[k] : r[k] - t[k].high;
        if (startSide[k] !== 0 && beyond > half)
          failures.push(`round ${round}: ${k} overshoots far`);
      }
    });
    // Read again: not on the other side of its band.
    const now = w.aqualis[pool].readings;
    for (const k of SCORED)
      if (
        startSide[k] !== 0 &&
        sideOf(now[k], t[k], k === 'ph' ? 0.005 : 0) === -startSide[k]
      )
        failures.push(`round ${round}: ${k} overshoots`);
    const sc = score(now, t);
    out.push({ advice: top.id, action: c.done.action, score: sc });
    if (sc > last + worse && !shock)
      failures.push(
        `round ${round}: ${top.id} left it worse (${last.toFixed(2)} → ${sc.toFixed(2)})`,
      );
    last = sc;
  }
  if (settledAt === null) failures.push(`not settled in ${rounds} rounds`);
  return {
    rounds: out,
    settledAt,
    startScore,
    endScore: last,
    maxPh,
    failures: [...new Set(failures)],
  };
}

/** Follow versus don't follow (Part 4, items 3 and 4). */
export interface TwinResult {
  advice: string;
  action: string;
  where: string | null;
  /** Scores at the pool's far side (what bathers meet): after mixing (three turnovers after the dose is in) and at 24 hours. */
  mixed: { followed: number; not: number };
  day: { followed: number; not: number };
  /** The change aimed at in the advice's own reading (the first visit's share of the way to its aim), and what came (followed less not, after mixing). */
  aimed: number | null;
  got: number | null;
  /** The highest pH the Trio read in the followed copy. */
  maxPh: number;
  failures: string[];
}

/** The reading each dosing advice aims at. */
const AIMS: Record<string, Scored> = {
  'free-chlorine-low': 'freeChlorine',
  'free-chlorine-high': 'freeChlorine',
  'alkalinity-low': 'alkalinity',
  'alkalinity-high': 'alkalinity',
  'ph-high': 'ph',
  'ph-low': 'ph',
  'calcium-hardness-low': 'calciumHardness',
  'calcium-hardness-high': 'calciumHardness',
  'tds-high': 'tds',
};

/**
 * Two copies of a scenario's world, the automatic dosing running in both,
 * one carrying out the top instruction: compared after mixing (it should
 * be nearer neutral, by `score`), throughout (no reading in band leaves it
 * because of the instruction, nor do the Trio's alarms get worse) and at
 * 24 hours (it has not backfired: no worse than not following, a tolerance
 * of 0.5 in the score). Where the instruction is to let the pumps work,
 * the two copies are the same.
 */
export function twin(
  s: Scenario,
  pool: TrioPool,
  open: boolean,
  advisor: Advisor = TRIO,
  /** Which advice to follow (the ranking test's): the top instruction by default. */
  pick: (a: Advice[]) => Advice | null = topInstruction,
  co2 = false,
): TwinResult {
  const w0 = scenarioWorld(s, pool, open, co2);
  const t = w0.aqualis[pool].settings.targets;
  const top = pick(advisor(w0, pool));
  let maxPh = 0;
  const failures: string[] = [];
  const c = top ? carryOut(w0, pool, top) : null;
  if (top && !c) failures.push(`no world action carries out ${top.id}`);
  let followed = c?.world ?? w0;
  let not = w0;
  const r0 = poolReadings(w0, pool);
  const startAlarms = alarmIds(w0, pool).length;
  // After mixing: three turnovers once the dose is in; thiosulphate, whose
  // chlorine falls on its own too, one.
  const mixS =
    (top?.additive === 'thiosulphate' ? 1 : 3) * turnoverS(w0, pool) +
    (c?.done.seconds ?? 0);
  let mixed: TwinResult['mixed'] | null = null;
  // Each copy's score over the hour after mixing, averaged (#59, #74; the
  // owner, 2026-11-06): the pumps' regulated readings ripple about their
  // set points as the pumps cycle (free chlorine's half-band is 0.2 mg/l,
  // so a 0.02 swing moves the score by a tenth), and one instant would
  // judge that ripple.
  const window: { followed: number; not: number }[] = [];
  let aimed: number | null = null;
  let got: number | null = null;
  // Run on through the hour its mixing score is averaged over.
  const end = Math.max(24 * 3600, mixS + 3600);
  const shock = top?.additive === 'superchlorinate';
  for (let time = 600; time <= end; time += 600) {
    followed = advance(followed, 600, 10);
    not = advance(not, 600, 10);
    // A shock is a supervised programme. A stopped hypochlorite head may
    // gas-lock during its long standby; follow the Trio's repair advice as
    // part of the programme, instead of leaving an acknowledged fault for
    // the rest of this 24-hour comparison.
    if (shock) {
      const repair = advisor(followed, pool).find(
        (a) => a.id === 'hypochlorite-offline',
      );
      if (repair) {
        const step = carryOut(followed, pool, repair);
        if (step && !/^nothing/.test(step.done.action)) followed = step.world;
      }
    }
    const rf = poolReadings(followed, pool);
    const rn = poolReadings(not, pool);
    // A reading in band leaving it because of the instruction: out, with
    // the other copy in, by a tenth of its half-band more than that copy.
    // The two the pumps regulate (free chlorine, pH) may stray as a side
    // effect the pumps then take back (bicarbonate lifts the pH, fresh
    // water thins the chlorine), but never past their alarm limits.
    for (const k of SCORED) {
      if (shock && k === 'freeChlorine') continue;
      const regulated = k === 'freeChlorine' || k === 'ph';
      const lo = regulated ? alarmLow(k, t) : t[k].low;
      const hi = regulated ? alarmHigh(k, t) : t[k].high;
      const half = (t[k].high - t[k].low) / 2;
      const outF = rf[k] < lo || rf[k] > hi;
      const outN = rn[k] < lo || rn[k] > hi;
      if (
        sideOf(r0[k], t[k]) === 0 &&
        outF &&
        !outN &&
        Math.abs(rf[k] - rn[k]) > half / 10
      )
        failures.push(
          `${k} leaves its ${regulated ? 'alarm limits' : 'band'} because of ${top?.id}`,
        );
    }
    maxPh = Math.max(maxPh, followed.aqualis[pool].readings.ph);
    const af = alarmIds(followed, pool).filter(
      (id) => !(shock && id === 'chlorine-high'),
    );
    if (af.length > Math.max(startAlarms, alarmIds(not, pool).length))
      failures.push(`alarms worse (${af.join(', ')}) because of ${top?.id}`);
    if (!mixed && time >= mixS) {
      if (window.length === 0) {
        const k = top ? AIMS[top.id] : undefined;
        // Dilution changes alkalinity directly, but the live pH controller
        // also changes its acid dose as the water is replaced. Its physical
        // amount is checked against `dilute` in the advisor's unit tests;
        // this comparison judges the net outcome through follow and loop.
        if (
          k &&
          top?.dose &&
          top.where !== 'automatic' &&
          !(top.id === 'alkalinity-high' && top.additive === 'dilution')
        ) {
          const goal =
            top.id === 'ph-low'
              ? (t.ph.low + t.ph.set) / 2
              : top.id === 'free-chlorine-high'
                ? t.freeChlorine.high
                : t[k].set;
          aimed = (goal - r0[k]) * (top.dose.first / top.dose.amount);
          got = rf[k] - rn[k];
        }
      }
      // A shock is judged by the chloramines it burns off, its chlorine intended.
      window.push(
        shock
          ? { followed: rf.combinedChlorine, not: rn.combinedChlorine }
          : { followed: score(rf, t), not: score(rn, t) },
      );
      if (time + 600 >= mixS + 3600 || time + 600 > end) {
        const mean = (k: 'followed' | 'not') =>
          window.reduce((sum, w) => sum + w[k], 0) / window.length;
        mixed = { followed: mean('followed'), not: mean('not') };
      }
    }
  }
  mixed ??= { followed: 0, not: 0 };
  const day = shock
    ? {
        followed: poolReadings(followed, pool).combinedChlorine,
        not: poolReadings(not, pool).combinedChlorine,
      }
    : {
        followed: score(poolReadings(followed, pool), t),
        not: score(poolReadings(not, pool), t),
      };
  const acted = !!c && !/^nothing/.test(c.done.action);
  // Closing a pool is a safety action: it need not change its chemistry.
  const protectiveClosure = c?.done.action.startsWith('close pool;') ?? false;
  // Restoring a failed pump is also worthwhile when another online channel
  // already holds the same reading; require the repaired channel online and
  // no material deterioration of the water score.
  const repaired =
    top?.id === 'acid-offline'
      ? 'acid'
      : top?.id === 'hypochlorite-offline'
        ? 'hypochlorite'
        : null;
  const restoredRedundancy =
    repaired !== null &&
    followed.aqualis[pool].channels[repaired].status.kind === 'online' &&
    mixed.followed <= mixed.not + 0.1;
  if (
    acted &&
    !protectiveClosure &&
    !restoredRedundancy &&
    !(mixed.followed < mixed.not)
  )
    failures.push(
      `after mixing not nearer neutral (${mixed.followed.toFixed(2)} against ${mixed.not.toFixed(2)})`,
    );
  if (acted && day.followed > day.not + 0.5)
    failures.push(
      `backfired by 24 h (${day.followed.toFixed(2)} against ${day.not.toFixed(2)})`,
    );
  return {
    advice: top?.id ?? 'none',
    action: c?.done.action ?? 'none',
    where: top?.where ?? null,
    mixed,
    day,
    aimed,
    got,
    maxPh,
    failures: [...new Set(failures)],
  };
}

/** A prescription's accuracy: what came of the change aimed at, as a share of it (1 exactly). */
export const accuracy = (r: TwinResult) =>
  r.aimed === null || r.got === null || r.aimed === 0 ? null : r.got / r.aimed;
