import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { POOL_IDS } from '../../../game/plant/pools';
import type { PoolId } from '../../../game/plant/pools';
import { AREAS, poolConsumer } from '../../../game/plant/heat-consumers';
import type { LthwRingState } from '../../../game/plant/lthw-ring';

/**
 * The energy mimic (mission 120, the owner, 2026-11-01): a Penfold board,
 * 2.4 × 1.2 m, showing how much heat each facility takes from the LTHW
 * ring. The boiler house on the left, its flow and return headers down
 * the board, one row a facility off them: each pool's water and hall air
 * and their sum, each other area's (`AREAS`) sum alone, each row's share
 * of the total and a lamp while it draws; the supply, flow and return
 * by the boiler house; the total at the foot. Its rows come from the
 * consumer list, so a new area adds a row. Pure.
 */

const pt = (x: number, y: number): Point => [x, y];
const FLOW = '#b9372d';
const RETURN = '#3f6fa8';
/** The rows' spacing and the first row's height, metres. */
const PITCH = 0.115;
const TOP = 0.36;
/** The headers' x, and each column's: water, air, total, share. */
const HEADER = -0.62;
const COLUMNS = { water: 0.02, air: 0.27, total: 0.6, share: 0.92 } as const;
/** The facilities' rows: the four pools, then the other areas. */
const POOL_NAMES: Record<PoolId, string> = {
  pool_01: 'LOUNGE',
  pool_02: 'OLYMPIC',
  pool_03: 'JACUZZI',
  pool_04: 'FOOTBATH',
};
export const ENERGY_ROWS: readonly {
  id: string;
  name: string;
  pool?: PoolId;
}[] = [
  ...POOL_IDS.map((pool) => ({ id: pool, name: POOL_NAMES[pool], pool })),
  ...AREAS.map((a) => ({ id: a.id, name: a.name })),
];
const rowY = (i: number) => TOP - i * PITCH;
const LAST = rowY(ENERGY_ROWS.length - 1);
const TOTAL_Y = LAST - PITCH;

export const ENERGY_MIMIC: MimicSpec = {
  title: 'HEAT ENERGY BY FACILITY',
  width: 2.4,
  height: 1.2,
  lines: [
    // The boiler house to the headers.
    { colour: FLOW, points: [pt(-0.84, 0.16), pt(HEADER, 0.16)], width: 7 },
    { colour: RETURN, points: [pt(-0.84, 0.08), pt(HEADER - 0.06, 0.08)] },
    // The flow and return headers down the board.
    { colour: FLOW, points: [pt(HEADER, TOP), pt(HEADER, LAST)], width: 7 },
    {
      colour: RETURN,
      points: [pt(HEADER - 0.06, TOP - 0.03), pt(HEADER - 0.06, LAST - 0.03)],
    },
    // Each row's branch.
    ...ENERGY_ROWS.map((_, i) => ({
      colour: FLOW,
      points: [pt(HEADER, rowY(i)), pt(-0.14, rowY(i))],
      width: 5,
    })),
  ],
  shapes: [
    { symbol: 'boiler', at: pt(-0.96, 0.12), size: 0.1, label: 'BOILERS' },
  ],
  labels: [
    { text: 'WATER kW', at: pt(COLUMNS.water, 0.46), size: 0.75 },
    { text: 'AIR kW', at: pt(COLUMNS.air, 0.46), size: 0.75 },
    { text: 'TOTAL kW', at: pt(COLUMNS.total, 0.46), size: 0.75 },
    { text: 'SHARE %', at: pt(COLUMNS.share, 0.46), size: 0.75 },
    ...ENERGY_ROWS.map((row, i) => ({
      text: row.name,
      at: pt(-0.4, rowY(i) + 0.03),
      size: 0.8,
    })),
    { text: 'ALL FACILITIES', at: pt(0.3, TOTAL_Y), size: 0.8 },
    { text: 'SUPPLY kW', at: pt(-0.96, -0.08), size: 0.7 },
    { text: 'FLOW C', at: pt(-0.96, -0.22), size: 0.7 },
    { text: 'RETURN C', at: pt(-0.96, -0.36), size: 0.7 },
    { text: 'LTHW FLOW', at: pt(HEADER, TOP + 0.05), size: 0.7 },
  ],
  lamps: [
    { id: 'firing', at: pt(-1.06, 0.34), colour: 'amber', label: 'FIRING' },
    { id: 'pumps', at: pt(-0.86, 0.34), colour: 'green', label: 'PUMPS' },
    ...ENERGY_ROWS.map((row, i) => ({
      id: `${row.id}-heat`,
      at: pt(-0.22, rowY(i)),
      colour: 'green' as const,
    })),
  ],
  readouts: [
    { id: 'supply', at: pt(-0.78, -0.08) },
    { id: 'flow', at: pt(-0.78, -0.22) },
    { id: 'return', at: pt(-0.78, -0.36) },
    ...ENERGY_ROWS.flatMap((row, i) => [
      ...(row.pool
        ? [
            { id: `${row.id}-water`, at: pt(COLUMNS.water, rowY(i)) },
            { id: `${row.id}-air`, at: pt(COLUMNS.air, rowY(i)) },
          ]
        : []),
      { id: `${row.id}-total`, at: pt(COLUMNS.total, rowY(i)) },
      { id: `${row.id}-share`, at: pt(COLUMNS.share, rowY(i)) },
    ]),
    { id: 'total', at: pt(COLUMNS.total, TOTAL_Y) },
  ],
  modes: [{ id: 'heat', legend: 'HEAT' }],
  readoutLegends: false,
};

/** Below this a row's draw shows no heat, kW. */
const DRAWING = 0.5;
const kw = (value: number, name: string): Reading => ({
  value: Math.round(Math.max(0, value)),
  unit: 'kW',
  name,
});
const celsius = (value: number, name: string): Reading => ({
  value: Math.round(value * 10) / 10,
  unit: 'C',
  name,
  places: 1,
});

/** Each facility's heat, kW, from the ring's draws: a pool's water, air and sum; an area's sum. */
export function facilityHeat(ring: LthwRingState) {
  const draw = (id: string) => ring.draws[id] ?? 0;
  return ENERGY_ROWS.map((row) => {
    const water = row.pool ? draw(poolConsumer(row.pool, 'water')) : 0;
    const air = row.pool ? draw(poolConsumer(row.pool, 'air')) : 0;
    return {
      ...row,
      water,
      air,
      total: row.pool ? water + air : draw(row.id),
    };
  });
}

/** What the board shows, every value rounded to what its digits show, so it redraws only on a change. */
export function energyMimicState(ring: LthwRingState): MimicState {
  const rows = facilityHeat(ring);
  const total = rows.reduce((t, r) => t + r.total, 0);
  const one = (r: Reading) => ({ heat: r });
  const readouts: Record<string, Record<string, Reading>> = {
    supply: one(kw(ring.supply, 'SUPPLY')),
    flow: one(celsius(ring.flow, 'FLOW')),
    return: one(celsius(ring.return, 'RETURN')),
    total: one(kw(total, 'TOTAL')),
  };
  const lamps: Record<string, boolean> = {
    firing: ring.firing,
    pumps: ring.pumps,
  };
  for (const r of rows) {
    if (r.pool) {
      readouts[`${r.id}-water`] = one(kw(r.water, `${r.name} W`));
      readouts[`${r.id}-air`] = one(kw(r.air, `${r.name} A`));
    }
    readouts[`${r.id}-total`] = one(kw(r.total, r.name));
    readouts[`${r.id}-share`] = one({
      value: total > DRAWING ? Math.round((r.total / total) * 100) : 0,
      unit: '%',
      name: r.name,
    });
    lamps[`${r.id}-heat`] = r.total > DRAWING;
  }
  return { lamps, readouts };
}
