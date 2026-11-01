import {
  carbonateFor,
  readings as chemistryReadings,
} from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { HAND_CHEMICAL, advise, deviation } from './aqualis-advisor';
import type { AdviseOptions } from './aqualis-advisor';
import {
  FIRST_AID,
  firstAidSettings,
  superchlorinating,
} from './aqualis-first-aid';
import { trioAlarms } from './aqualis-world';
import type { TrioPool } from './aqualis-world';
import { DEFAULT_TARGETS } from './aqualis-types';
import type {
  Advice,
  AqualisReadings,
  AqualisSettings,
  ChannelId,
  ChannelStatus,
  ChannelView,
} from './aqualis-types';
import { farSide } from './water-treatment';
import type { DosingPumpAction } from './dosing-pumps';

/**
 * Shared setup for the advice verification suite
 * (`doc/plans/aqualis-advice-verification.md`, Part 4): an ideal analyser's
 * readings of a water, channel views, settings; the problem scenarios, set
 * up in a world; the operator, who reads the Trio and carries out its top
 * instruction through world actions; and the score the water is judged by.
 */

/** The readings an ideal analyser gives of a water. */
export function readingsOf(w: PoolChemistry, T: number): AqualisReadings {
  const r = chemistryReadings(w, T);
  return {
    freeChlorine: w.freeChlorine,
    combinedChlorine: r.combinedChlorine,
    totalChlorine: r.totalChlorine,
    ph: w.ph,
    alkalinity: w.alkalinity,
    calciumHardness: w.hardness,
    lsi: r.langelier,
    tds: w.tds,
    sulphate: w.sulphate,
    temperature: T,
  };
}

export const channelView = (
  id: ChannelId,
  status: ChannelStatus,
): ChannelView => ({ id, status, demand: 0, demandRate: 0, delivering: 0 });

/** Hypochlorite and acid online, CO₂ unconnected: the world's Trios. */
export const TRIO_CHANNELS: ChannelView[] = [
  channelView('hypochlorite', { kind: 'online' }),
  channelView('acid', { kind: 'online' }),
  channelView('co2', { kind: 'unconnected' }),
];

/** Settings at `volumeM3` with the default targets. */
export const settingsAt = (volumeM3: number): AqualisSettings => ({
  dynamics: { volumeM3, flowM3h: volumeM3 / 4 },
  targets: DEFAULT_TARGETS,
});

/** Relative error of `got` against `want`. */
export const rel = (got: number, want: number) => Math.abs(got / want - 1);

// ---- The score -------------------------------------------------------------------------

/** The readings the score is taken over: every one with a target. */
export const SCORED = [
  'freeChlorine',
  'combinedChlorine',
  'ph',
  'alkalinity',
  'calciumHardness',
  'lsi',
  'tds',
  'sulphate',
] as const;
export type Scored = (typeof SCORED)[number];

/**
 * How far a water is from neutral (the plan doc's metric): the sum, over
 * every reading with a target, the LSI among them, of its deviation from
 * its set point in the half-band on its side (`deviation`: 0 at the set
 * point, 1 at the band's edge). Combined chlorine, TDS and sulphate, whose
 * set points are a floor or a ceiling (0, and the bands' working values),
 * count only above their set points.
 */
export function score(
  r: AqualisReadings,
  t: AqualisSettings['targets'] = DEFAULT_TARGETS,
): number {
  let s = 0;
  for (const k of SCORED) {
    const v = r[k];
    if (
      (k === 'combinedChlorine' || k === 'tds' || k === 'sulphate') &&
      v <= t[k].set
    )
      continue;
    s += deviation(v, t[k]);
  }
  return s;
}

/** The readings out of their band. */
export const outOfBand = (
  r: AqualisReadings,
  t: AqualisSettings['targets'] = DEFAULT_TARGETS,
): Scored[] => SCORED.filter((k) => r[k] < t[k].low || r[k] > t[k].high);

/** The pool's own water as bathers meet it: its far side, read by an ideal analyser. */
export function poolReadings(w: World, pool: TrioPool): AqualisReadings {
  return readingsOf(
    farSide(w.treatment.circuits[pool]),
    w.pools[pool].temperature,
  );
}

// ---- Scenarios -------------------------------------------------------------------------

/** A water changed in every zone of a pool's circuit, its pH (and so its carbonate) kept consistent. */
export function withWater(
  world: World,
  pool: TrioPool,
  change: {
    ph?: number;
    alkalinity?: number;
    hardness?: number;
    tds?: number;
    freeChlorine?: number;
    combined?: number;
    sulphate?: number;
  },
): World {
  const T = world.pools[pool].temperature;
  const edit = (w: PoolChemistry): PoolChemistry => {
    const out: PoolChemistry = { ...w };
    if (change.hardness !== undefined) out.hardness = change.hardness;
    if (change.tds !== undefined) out.tds = change.tds;
    if (change.sulphate !== undefined) out.sulphate = change.sulphate;
    if (change.freeChlorine !== undefined)
      out.freeChlorine = change.freeChlorine;
    if (change.combined !== undefined) {
      out.organicChloramine = change.combined;
      out.chloramine = 0;
      out.trichloramine = 0;
    }
    if (change.alkalinity !== undefined) out.alkalinity = change.alkalinity;
    out.ph = change.ph ?? w.ph;
    out.carbonate = carbonateFor(
      out.ph,
      out.alkalinity,
      out.freeChlorine,
      T,
      out.tds,
    );
    return out;
  };
  const c = world.treatment.circuits[pool];
  return {
    ...world,
    treatment: {
      ...world.treatment,
      circuits: {
        ...world.treatment.circuits,
        [pool]: { ...c, tank: edit(c.tank), pool: c.pool.map(edit) },
      },
    },
  };
}

const pumpAct = (w: World, action: DosingPumpAction) =>
  applyAction(w, { type: 'dosing-pump', action });

/** A problem: what is wrong with the water or the plant. */
export interface Scenario {
  id: string;
  /** What the advisor should be seen to put right. */
  about: string;
  set(w: World, pool: TrioPool): World;
  /** The problem the automatic pumps put right themselves: the advice is to let them. */
  automatic?: boolean;
}

/** Every single problem, and the awkward pairs. */
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'chlorine-low',
    about: 'free chlorine 0.5',
    automatic: true,
    set: (w, p) => withWater(w, p, { freeChlorine: 0.5 }),
  },
  {
    id: 'chlorine-high',
    about: 'free chlorine 4',
    set: (w, p) => withWater(w, p, { freeChlorine: 4 }),
  },
  {
    id: 'ph-high',
    about: 'pH 7.55',
    automatic: true,
    set: (w, p) => withWater(w, p, { ph: 7.55 }),
  },
  {
    id: 'ph-low',
    about: 'pH 7.0',
    set: (w, p) => withWater(w, p, { ph: 7.0 }),
  },
  {
    id: 'alkalinity-low',
    about: 'alkalinity 50',
    set: (w, p) => withWater(w, p, { alkalinity: 50 }),
  },
  {
    id: 'alkalinity-high',
    about: 'alkalinity 250',
    set: (w, p) => withWater(w, p, { alkalinity: 250 }),
  },
  {
    id: 'hardness-low',
    about: 'calcium hardness 70',
    set: (w, p) => withWater(w, p, { hardness: 70 }),
  },
  {
    id: 'hardness-high',
    about: 'calcium hardness 1100 (only dilution)',
    set: (w, p) => withWater(w, p, { hardness: 1100 }),
  },
  {
    id: 'tds-high',
    about: 'TDS 1800',
    set: (w, p) => withWater(w, p, { tds: 1800 }),
  },
  {
    id: 'combined-high',
    about: 'combined chlorine 1.2 (superchlorinate)',
    set: (w, p) => withWater(w, p, { combined: 1.2 }),
  },
  {
    id: 'ph-low+alkalinity-low',
    about: 'pH 7.0, alkalinity 40',
    set: (w, p) => withWater(w, p, { ph: 7.0, alkalinity: 40 }),
  },
  {
    id: 'ph-high+alkalinity-low',
    about: 'pH 7.55, alkalinity 50',
    set: (w, p) => withWater(w, p, { ph: 7.55, alkalinity: 50 }),
  },
  {
    id: 'aggressive',
    about: 'LSI about −1 (hardness 80, alkalinity 60, pH 7.2)',
    set: (w, p) => withWater(w, p, { hardness: 80, alkalinity: 60, ph: 7.2 }),
  },
  {
    id: 'scaling',
    about: 'LSI about +0.7 (hardness 900, alkalinity 190, pH 7.5)',
    set: (w, p) => withWater(w, p, { hardness: 900, alkalinity: 190, ph: 7.5 }),
  },
  {
    id: 'acid-manual',
    about: 'the acid pump in its own manual mode, the pH high',
    set: (w, p) =>
      pumpAct(withWater(w, p, { ph: 7.5 }), {
        act: 'key',
        pool: p,
        chemical: 'acid',
        key: 'mode',
      }),
  },
  {
    id: 'acid-off',
    about: 'the acid pump stopped at its keys, the pH high',
    set: (w, p) =>
      pumpAct(withWater(w, p, { ph: 7.5 }), {
        act: 'key',
        pool: p,
        chemical: 'acid',
        key: 'stop',
      }),
  },
  {
    id: 'hypochlorite-tripped',
    about:
      'the hypochlorite pump gas-locked (its flow monitor tripped), the chlorine low',
    set: (w, p) =>
      pumpAct(withWater(w, p, { freeChlorine: 0.8 }), {
        act: 'gas',
        pool: p,
        chemical: 'hypochlorite',
        ml: 50,
      }),
  },
];

/** A Trio pool's world with a scenario set up, its analyser settled on it. */
export function scenarioWorld(
  s: Scenario,
  pool: TrioPool,
  open = true,
  /** Its CO₂ dosing connected (mission 118's variant); acid alone by default. */
  co2 = false,
): World {
  const start = newWorld();
  // The verification suite pins the pre-118 acid-only plant; its CO₂
  // variant (`aqualis-verification-co2.*.slow.test.ts`) keeps the CO₂
  // panels on their Trios, CO₂ first and acid trimming.
  let w = advance(
    co2
      ? start
      : {
          ...start,
          co2: {
            ...start.co2,
            connected: { plant_pool_01: false, plant_pool_02: false },
          },
        },
    600,
    10,
  );
  if (!open)
    w = applyAction(w, {
      type: 'aqualis',
      pool,
      action: { act: 'pool', open: false },
    });
  w = s.set(w, pool);
  // The analyser's cell settles (its lag a minute) and the pumps see their state.
  return advance(w, 600, 10);
}

// ---- The operator ----------------------------------------------------------------------

/** What the Trio's cabinet shows: its advice on its readings, with Show dose worked out. */
export function trioAdvice(
  w: World,
  pool: TrioPool,
  extra: AdviseOptions = {},
): Advice[] {
  const t = w.aqualis[pool];
  return advise(
    t.readings,
    firstAidSettings(t.firstAid, t.settings),
    t.channels,
    undefined,
    {
      open: t.poolOpen,
      normal: t.settings.targets,
      closedByFirstAid: !!t.firstAid && FIRST_AID[t.firstAid.id].closePool,
      superchlorinating: superchlorinating(t.firstAid),
      ...extra,
    },
  );
}

/** An advisor as the suite drives it: the Trio's (`trioAdvice`), or a broken one (`negative controls`). */
export type Advisor = (w: World, pool: TrioPool) => Advice[];
export const TRIO: Advisor = (w, pool) => trioAdvice(w, pool);

/** The advice an operator acts on: the first with something to do (not information). */
export const topInstruction = (a: readonly Advice[]) =>
  a.find((x) => x.tier < 3 && x.severity !== 'info') ?? null;

/** What carrying out an instruction did, for the report. */
export interface Done {
  advice: string;
  action: string;
  /** Seconds the dose takes to go in (0 for none). */
  seconds: number;
}

/**
 * An instruction carried out through world actions, as an operator would:
 * a hand dose of its first visit's amount at its recommended rate into
 * the place it names (`hand/dose`); a dilution (`hand/dilute`); a
 * superchlorination with the pool closed first; a pump put back to remote
 * or started or its fault acknowledged and bled; and nothing where the
 * pumps are to be left to work or it asks only to wait. An instruction no
 * world action can carry out is null (a finding).
 */
export function carryOut(
  w0: World,
  pool: TrioPool,
  a: Advice,
): { world: World; done: Done } | null {
  let w = w0;
  const done = (action: string, seconds = 0) => ({
    world: w,
    done: { advice: a.id, action, seconds },
  });
  if (a.id.endsWith('-offline')) {
    const ch = a.id.replace('-offline', '') as 'hypochlorite' | 'acid';
    const status = w.aqualis[pool].channels[ch].status;
    if (status.kind !== 'offline') return done('nothing: back online');
    if (status.reason === 'manual')
      w = pumpAct(w, { act: 'key', pool, chemical: ch, key: 'mode' });
    else if (status.reason === 'switched-off')
      w = pumpAct(w, {
        act: 'key',
        pool,
        chemical: ch,
        key: 'start',
      });
    else if (status.reason === 'fault') {
      // As its manual says (and Dr Aqualis): bleed open, acknowledged,
      // its strokes clearing the gas, then the bleed shut.
      w = pumpAct(w, { act: 'bleed', pool, chemical: ch, open: true });
      w = pumpAct(w, { act: 'acknowledge', pool, chemical: ch });
      w = advance(w, 120, 10);
      w = pumpAct(w, { act: 'bleed', pool, chemical: ch, open: false });
    } else return null;
    return done(`pump ${ch}: ${status.reason} put right`);
  }
  if (!a.additive) return done('nothing: it asks only to wait');
  if (a.where === 'automatic')
    return done('nothing: the pumps are left to work');
  const d = a.dose;
  if (!d) return null;
  if (a.additive === 'dilution') {
    w = applyAction(w, { type: 'hand/dilute', pool, m3: d.first });
    const c = w.treatment.charges[pool].at(-1);
    return done(`dilute ${d.first} m³`, c?.seconds ?? 0);
  }
  const chemical = HAND_CHEMICAL[a.additive];
  if (!chemical) return null;
  // "Stop the hypochlorite (First Aid › Bring chlorine down)": as it says.
  if (
    a.additive === 'thiosulphate' &&
    /Bring chlorine down/.test(a.direction) &&
    !w.aqualis[pool].firstAid
  )
    w = applyAction(w, {
      type: 'aqualis',
      pool,
      action: { act: 'firstAid', programme: 'chlorine-down' },
    });
  if (a.additive === 'superchlorinate' && w.aqualis[pool].poolOpen)
    w = applyAction(w, {
      type: 'aqualis',
      pool,
      action: { act: 'pool', open: false },
    });
  const into = a.where === 'pool' ? 'pool' : 'balance-tank';
  w = applyAction(w, {
    type: 'hand/dose',
    pool,
    chemical,
    amount: d.first,
    into,
    ...(d.rate ? { rate: d.rate } : {}),
  });
  return done(
    `dose ${chemical} ${d.first} ${d.unit}${d.rate ? ` at ${d.rate}/min` : ''} into ${into}`,
    d.rate ? (d.first / d.rate) * 60 : 0,
  );
}

/** A world run on `seconds` in the suite's step (10 s, the chemistry's own tick), watching each minute. */
export function runFor(
  w0: World,
  seconds: number,
  watch?: (w: World) => void,
  every = 600,
): World {
  let w = w0;
  for (let t = 0; t < seconds; t += every) {
    w = advance(w, Math.min(every, seconds - t), 10);
    watch?.(w);
  }
  return w;
}

/** The pool's turnover, s, as its Trio has it entered. */
export const turnoverS = (w: World, pool: TrioPool) => {
  const d = w.aqualis[pool].settings.dynamics;
  return (d.volumeM3 / d.flowM3h) * 3600;
};

/** The Trio's alarms, by id. */
export const alarmIds = (w: World, pool: TrioPool) =>
  trioAlarms(w.aqualis[pool]).map((a) => a.id);
