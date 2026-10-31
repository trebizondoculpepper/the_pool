import type { World } from './world';
import { healthFaults, INFORMATIONAL_INDICATIONS } from './health';
import { POOL_IDS, POOL_TARGET } from './plant/pools';
import type { PoolId } from './plant/pools';
import { KIT, testKit } from './plant/test-kit';
import type { KitTest, TestKitResult } from './plant/test-kit';
import { farSide, CONTROLLER } from './plant/water-treatment';
import { readings } from './water/pool-chemistry';
import { DEFAULT_TARGETS } from './plant/aqualis-types';
import type { Target } from './plant/aqualis-types';
import { advise } from './plant/aqualis-advisor';
import { firstAidSettings } from './plant/aqualis-first-aid';
import { TRIO_POOLS, trioAlarms } from './plant/aqualis-world';
import { osRunning } from './plant/aqualis-os';
import { HEALTHY } from './health';
import { LOUNGE_DIRT_REF, loungeFilterDp } from './plant/lounge-filters';
import { loungeFlowsOf } from './plant/lounge-valves';
import { OLYMPIC_DIRT_REF } from './plant/olympic-battery';
import { filterSizing } from './plant/ideal-filter';
import {
  olympicFlowsOfWorld,
  plantReadingOf,
} from '../toolkit/gallery/logic/world-reading';
import { FILTER_DP_LIMIT } from '../toolkit/gallery/logic/control-room-demo';

/**
 * What "normal" is for a new game, and a checker for it (the owner,
 * 2026-10-31, `doc/plans/new-game-normal.md`): every band is the game's
 * own where it has one (the Dr Aqualis Trio's targets for the pools that
 * have a Trio, the healthy-start contract's for the spas, the
 * annunciators' limits), read as the poolside test kit reads it: widened
 * by the kit's tolerance and half its step, since a kit reading of a water
 * exactly at a band's edge may fall either side of it.
 */

/** The share of a filter bed's dirt reference a clean bed stays under through its first hours. */
export const CLEAN_FILTER_SHARE = 0.2;
/** How far a balance tank may move from its new game's level in the hour, a share of full. */
export const TANK_DRIFT = 0.05;
/** The most water the backwash pit may hold and still be empty, m³ (its sump's puddle). */
export const PIT_EMPTY = 0.5;

/** A band as the kit can tell it: the target's widened by the kit's error and rounding. */
const kitBand = (test: KitTest, low: number, high: number) => {
  const m = KIT[test];
  const slack = m.tolerance + m.step / 2 + 1e-9;
  return [low - slack, high + slack] as const;
};

/** Each pool's normal band for each kit test, and where it comes from. */
export function kitBands(
  id: PoolId,
): Partial<Record<KitTest, readonly [number, number]>> {
  const trio = (TRIO_POOLS as readonly PoolId[]).includes(id);
  const t = DEFAULT_TARGETS;
  const temp = POOL_TARGET[id].temp;
  const bands: Partial<Record<KitTest, readonly [number, number]>> = {
    // The Trio's targets where it doses; the spas' healthy-start bands.
    freeChlorine: trio
      ? kitBand('freeChlorine', t.freeChlorine.low, t.freeChlorine.high)
      : kitBand('freeChlorine', ...HEALTHY.freeChlorine),
    totalChlorine: kitBand(
      'totalChlorine',
      t.totalChlorine.low,
      t.totalChlorine.high,
    ),
    ph: trio
      ? kitBand('ph', t.ph.low, t.ph.high)
      : kitBand('ph', ...HEALTHY.ph),
    hardness: kitBand(
      'hardness',
      t.calciumHardness.low,
      t.calciumHardness.high,
    ),
    // PWTAG: TDS no more than 1,000 mg/l over the mains' (350); the Trio's high is 1,500.
    tds: kitBand('tds', 0, t.tds.high),
    temperature: kitBand(
      'temperature',
      temp - HEALTHY.temperature,
      temp + HEALTHY.temperature,
    ),
  };
  // The spas' alkalinity has no band they can hold (`TODO.md`): judged by drift.
  if (trio)
    bands.alkalinity = kitBand(
      'alkalinity',
      t.alkalinity.low,
      t.alkalinity.high,
    );
  return bands;
}

const within = (v: number, [lo, hi]: readonly [number, number]) =>
  v >= lo && v <= hi;
const inTarget = (v: number, t: Target) => v >= t.low && v <= t.high;

/** A pool's kit taken now. */
export const kitOf = (w: World, id: PoolId): TestKitResult =>
  testKit(id, w.treatment.circuits[id], w.pools[id].temperature, w.time);

/** Everything about a world that is not normal, in words: empty when all is. */
export function abnormalities(w: World, start?: World): string[] {
  const out: string[] = [];
  const bad = (what: string) => out.push(`${w.time.toFixed(0)} s: ${what}`);

  // The healthy-start contract: pools, motors, services, valves, gas, the rest.
  for (const f of healthFaults(w))
    bad(`health ${f.subsystem} ${f.asset}: ${f.measured} (${f.reason})`);

  for (const id of POOL_IDS) {
    // The test kit, at the pool's far side.
    const kit = kitOf(w, id);
    for (const [test, band] of Object.entries(kitBands(id)) as [
      KitTest,
      readonly [number, number],
    ][]) {
      const r = kit.readings[test];
      if (r.beyond || !within(r.value, band))
        bad(
          `${id} kit ${test} ${r.beyond ?? ''}${r.value} outside ${band[0].toFixed(2)}–${band[1].toFixed(2)}`,
        );
    }
    // Indoor pools carry no cyanuric acid (PWTAG): the kit reads below its range.
    if (kit.readings.cyanuric.beyond !== 'below')
      bad(`${id} kit cyanuric ${kit.readings.cyanuric.value}`);
    if (kit.combined > DEFAULT_TARGETS.combinedChlorine.high)
      bad(`${id} kit combined ${kit.combined}`);
    // The water's balance, where the Trio judges it.
    const water = farSide(w.treatment.circuits[id]);
    const lsi = readings(water, w.pools[id].temperature).langelier;
    if (
      (TRIO_POOLS as readonly PoolId[]).includes(id) &&
      !inTarget(lsi, DEFAULT_TARGETS.lsi)
    )
      bad(`${id} LSI ${lsi.toFixed(2)}`);
    // The spas' settled water: steady, not drifting.
    if (start && !(TRIO_POOLS as readonly PoolId[]).includes(id)) {
      const a0 = farSide(start.treatment.circuits[id]).alkalinity;
      if (Math.abs(water.alkalinity - a0) > 5)
        bad(
          `${id} alkalinity drifted ${a0.toFixed(1)} → ${water.alkalinity.toFixed(1)}`,
        );
    }
    // Its balance tank near where a new game puts it.
    if (
      start &&
      Math.abs(w.pools[id].balance - start.pools[id].balance) > TANK_DRIFT
    )
      bad(
        `${id} balance tank ${start.pools[id].balance.toFixed(3)} → ${w.pools[id].balance.toFixed(3)}`,
      );
    // Its plant's alarms (makeup-running is ordinary activity: `health.ts`).
    for (const a of plantReadingOf(w, id).alarms)
      if (!(a in INFORMATIONAL_INDICATIONS)) bad(`${id} plant alarm ${a}`);
  }

  // Dr Aqualis agrees, through what his cabinet shows.
  for (const id of TRIO_POOLS) {
    const t = w.aqualis[id];
    if (!osRunning(t.os)) bad(`${id} Trio's computer ${t.os.phase}`);
    if (t.selector !== 'auto') bad(`${id} Trio at ${t.selector}`);
    if (t.firstAid) bad(`${id} Trio First Aid ${t.firstAid.id}`);
    if (t.inhibit) bad(`${id} Trio inhibit ${t.inhibit}`);
    if (t.lockout) bad(`${id} Trio chlorine lockout`);
    for (const a of trioAlarms(t)) bad(`${id} Trio alarm ${a.id}`);
    if (!t.sample.flowing) bad(`${id} Trio sample not flowing`);
    const r = t.readings;
    for (const [k, target] of Object.entries(t.settings.targets) as [
      keyof typeof t.settings.targets,
      Target,
    ][])
      if (!inTarget(r[k], target))
        bad(
          `${id} Trio ${k} ${r[k].toFixed(2)} outside ${target.low}–${target.high}`,
        );
    const advice = advise(
      t.readings,
      firstAidSettings(t.firstAid, t.settings),
      t.channels,
    );
    for (const a of advice) {
      if (a.severity !== 'info')
        bad(`${id} Dr Aqualis ${a.severity}: ${a.problem}`);
      // No hand dose: a new game needs none (the owner, 2026-10-31).
      if (a.dose && a.where !== 'automatic')
        bad(`${id} Dr Aqualis asks for a hand dose: ${a.dose.text}`);
    }
    // The Trio (at the tank) and the kit (at the far side) tell the same story.
    const far = farSide(w.treatment.circuits[id]);
    if (Math.abs(r.ph - far.ph) > KIT.ph.tolerance)
      bad(`${id} Trio pH ${r.ph.toFixed(2)} vs pool ${far.ph.toFixed(2)}`);
    if (
      Math.abs(r.freeChlorine - far.freeChlorine) >
      2 * KIT.freeChlorine.tolerance
    )
      bad(
        `${id} Trio chlorine ${r.freeChlorine.toFixed(2)} vs pool ${far.freeChlorine.toFixed(2)}`,
      );
    if (Math.abs(r.alkalinity - far.alkalinity) > KIT.alkalinity.tolerance)
      bad(
        `${id} Trio alkalinity ${r.alkalinity.toFixed(0)} vs pool ${far.alkalinity.toFixed(0)}`,
      );
    // Its pH set point the old controller's, so the pools agree.
    if (t.settings.targets.ph.set !== CONTROLLER.pHSet)
      bad(`${id} Trio pH set point ${t.settings.targets.ph.set}`);
  }

  // Filters clean: little dirt, their pressure differences well under the alarm.
  const dirty = (name: string, dirt: number, ref: number) => {
    if (dirt > CLEAN_FILTER_SHARE * ref)
      bad(`${name} dirt ${(dirt / ref).toFixed(2)} of its reference`);
  };
  w.loungeFilters.dirt.forEach((d, i) =>
    dirty(`PL1-F${i + 1}`, d, LOUNGE_DIRT_REF),
  );
  w.olympic.dirt.forEach((d, i) => dirty(`PL2-F${i + 1}`, d, OLYMPIC_DIRT_REF));
  for (const [pool, f] of Object.entries(w.spaFilters)) {
    dirty(`${pool} sand filter`, f.bed.dirt, filterSizing(f.spec).dirtRef);
    if (f.phase !== 'filter') bad(`${pool} sand filter ${f.phase}`);
  }
  const dps = [
    ...loungeFilterDp(w.loungeFilters, loungeFlowsOf(w)),
    ...olympicFlowsOfWorld(w).filters.map((f) => f.bedBar),
  ];
  for (const dp of dps)
    if (dp > 0.8 * FILTER_DP_LIMIT) bad(`a filter's DP ${dp.toFixed(2)} bar`);

  // The backwash pit empty, nothing spilt, its pumps in AUTO.
  if (w.wetHall.backwashTank > PIT_EMPTY)
    bad(`backwash pit ${w.wetHall.backwashTank.toFixed(2)} m³`);
  if (w.wetHall.pitPumps.modes.some((m) => m !== 'auto'))
    bad('a pit pump out of AUTO');
  if (w.wetHall.inhibit) bad('wet hall inhibit');

  // The Wash-O-Tron in AUTO, every filter in service, no alarm.
  const wot = w.washOTron;
  if (!wot.running || wot.hold) bad('Wash-O-Tron not running in AUTO');
  wot.filters.forEach((f, i) => {
    if (!f.auto || f.mode !== 'filter' || f.lockout)
      bad(`Wash-O-Tron filter ${i + 1} ${f.mode}${f.auto ? '' : ' (manual)'}`);
  });
  for (const [a, s] of Object.entries(wot.alarms))
    if (s.on) bad(`Wash-O-Tron alarm ${a}`);

  // The dosing pumps and the chemical lines.
  for (const [pool, pumps] of Object.entries(w.dosingPumps))
    for (const [c, p] of Object.entries(pumps))
      if (p.fault) bad(`${pool} ${c} pump fault ${p.fault}`);
  for (const [c, line] of Object.entries(w.distribution)) {
    if (line.tripped || line.mode !== 'auto' || line.hoa !== 'auto')
      bad(`${c} transfer line not in AUTO`);
    line.tanks.forEach((t, i) => {
      if (t.inhibited) bad(`${c} day tank ${i} inhibited`);
      if (t.litres <= t.lowL) bad(`${c} day tank ${i} at or below low`);
    });
  }

  // No annunciator lit but for ordinary activity.
  for (const [id, win] of Object.entries(w.annunciator.windows))
    if (win !== 'off' && !(id in INFORMATIONAL_INDICATIONS))
      bad(`annunciator ${id} ${win}`);
  for (const [loc, a] of Object.entries(w.locationAnnunciators))
    for (const [id, win] of Object.entries(a.windows))
      if (win !== 'off') bad(`${loc} annunciator ${id} ${win}`);
  return out;
}
