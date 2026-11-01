import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { POOL_IDS } from '../../../game/plant/pools';
import { WET_HALL_PLANT, wetHallAlarms } from '../../../game/plant/wet-hall';
import type { WetHallState } from '../../../game/plant/wet-hall';
import { branchTotal } from '../../../game/plant/wet-hall-branch-meters';

const pt = (x: number, y: number): Point => [x, y];
const FRESH = '#5c88b8';
const DIRTY = '#8a6d4a';
const rows = [0.45, 0.2, -0.05, -0.3];
const names = ['LOUNGE', 'OLYMPIC', 'JACUZZI', 'FOOTBATH'];
const rate = (value: number, name: string): Reading => ({
  value: Math.round(value * 10) / 10,
  unit: 'm3/h',
  name,
  places: 1,
});
const percent = (value: number, name: string): Reading => ({
  value: Math.round(value),
  unit: '%',
  name,
});

/** WH-MP1: one boosted source fanning out to the four pool balance tanks. */
export const freshWaterMimicSpec: MimicSpec = {
  title: 'FRESH WATER DISTRIBUTION',
  width: 2.8,
  height: 1.6,
  lines: [
    { colour: FRESH, points: [pt(-1.25, 0.07), pt(-0.35, 0.07)], width: 8 },
    {
      colour: FRESH,
      points: [pt(-0.35, rows[0]), pt(-0.35, rows[3])],
      width: 8,
    },
    ...rows.map((y) => ({
      colour: FRESH,
      points: [pt(-0.35, y), pt(1.08, y)],
      width: 6,
    })),
  ],
  shapes: [
    { symbol: 'tank', at: pt(-1.08, 0.07), size: 0.1, label: 'BREAK TANK' },
    { symbol: 'pump', at: pt(-0.7, 0.07), size: 0.08, label: 'BOOSTER' },
  ],
  labels: [
    ...rows.map((y, i) => ({
      text: names[i],
      at: pt(1.12, y + 0.08),
      size: 0.8,
    })),
    {
      text: 'WHERE IS MY FRESH WATER GOING?',
      at: pt(-0.13, -0.67),
      size: 0.75,
    },
  ],
  lamps: [
    { id: 'mains', at: pt(-1.23, -0.13), colour: 'green', label: 'MAINS' },
    { id: 'low', at: pt(-1.08, -0.13), colour: 'amber', label: 'LOW' },
    { id: 'booster', at: pt(-0.72, -0.13), colour: 'green', label: 'RUN' },
    { id: 'trip', at: pt(-0.56, -0.13), colour: 'red', label: 'TRIP' },
    ...POOL_IDS.map((id, i) => ({
      id: `${id}-flow`,
      at: pt(0.94, rows[i] - 0.07),
      colour: 'blue' as const,
      label: 'FLOW',
    })),
  ],
  readouts: [
    { id: 'tank', at: pt(-1.08, 0.38) },
    { id: 'total', at: pt(-0.77, -0.35) },
    ...POOL_IDS.map((id, i) => ({ id, at: pt(0.45, rows[i] + 0.07) })),
  ],
  buttons: [
    {
      id: 'suction-open',
      at: pt(-1.15, -0.56),
      colour: 'green',
      legend: 'OPEN',
    },
    { id: 'suction-shut', at: pt(-1.03, -0.56), colour: 'red', legend: 'SHUT' },
    {
      id: 'booster-reset',
      at: pt(-0.73, -0.56),
      colour: 'black',
      legend: 'RESET',
    },
    {
      id: 'discharge-open',
      at: pt(-0.43, -0.56),
      colour: 'green',
      legend: 'OPEN',
    },
    {
      id: 'discharge-shut',
      at: pt(-0.31, -0.56),
      colour: 'red',
      legend: 'SHUT',
    },
  ],
  modes: [{ id: 'flow', legend: 'FLOW' }],
};

/** WH-MP2: four waste branches converge on the pit, then pump to sewer. */
export const dirtyWaterMimicSpec: MimicSpec = {
  title: 'PIT INFLOW SOURCES',
  width: 2.8,
  height: 1.6,
  lines: [
    ...rows.map((y) => ({
      colour: DIRTY,
      points: [pt(-1.08, y), pt(0.52, y)],
      width: 6,
    })),
    { colour: DIRTY, points: [pt(0.52, rows[0]), pt(0.52, rows[3])], width: 8 },
    { colour: DIRTY, points: [pt(0.52, -0.05), pt(1.18, -0.05)], width: 8 },
  ],
  shapes: [
    { symbol: 'tank', at: pt(0.85, -0.05), size: 0.11, label: 'BACKWASH PIT' },
    { symbol: 'pump', at: pt(1.16, -0.05), size: 0.07, label: 'TO SEWER' },
  ],
  labels: [
    ...rows.map((y, i) => ({
      text: names[i],
      at: pt(-1.08, y + 0.08),
      size: 0.8,
    })),
    {
      text: 'WHERE IS THE DIRTY WATER COMING FROM?',
      at: pt(-0.22, -0.56),
      size: 0.75,
    },
    { text: 'LARGE POOL DRAINS BYPASS PIT', at: pt(-0.22, -0.66), size: 0.75 },
  ],
  lamps: [
    { id: 'high', at: pt(0.84, -0.3), colour: 'red', label: 'HIGH' },
    { id: 'pump', at: pt(1.14, -0.3), colour: 'green', label: 'RUN' },
    ...POOL_IDS.flatMap((id, i) => [
      {
        id: `${id}-waste`,
        at: pt(-0.63, rows[i] - 0.08),
        colour: 'amber' as const,
        label: 'WASTE',
      },
      {
        id: `${id}-drain`,
        at: pt(-0.39, rows[i] - 0.08),
        colour: 'blue' as const,
        label: 'DRAIN',
      },
    ]),
  ],
  readouts: [
    { id: 'pit', at: pt(0.85, 0.25) },
    { id: 'total', at: pt(1.14, -0.52) },
    ...POOL_IDS.map((id, i) => ({ id, at: pt(-0.85, rows[i] + 0.04) })),
  ],
  modes: [{ id: 'flow', legend: 'FLOW' }],
};

export interface WetHallWaterReading {
  wetHall: WetHallState;
  mains: boolean;
  valves: { suction: boolean; discharge: boolean };
}

export function freshWaterMimicState({
  wetHall: s,
  mains,
}: WetHallWaterReading): MimicState {
  const alarms = wetHallAlarms(s);
  return {
    lamps: {
      mains,
      low: alarms.breakTankLow,
      booster: s.boosterRunning,
      trip: s.boosterTripped,
      ...Object.fromEntries(
        POOL_IDS.map((id) => [
          `${id}-flow`,
          s.branches[id].fresh.indicated >= 0.1,
        ]),
      ),
    },
    readouts: {
      tank: {
        flow: percent((s.breakTank / WET_HALL_PLANT.breakTank) * 100, 'TANK'),
      },
      total: {
        flow: rate(branchTotal(s.branches, 'fresh', 'indicated'), 'TOTAL'),
      },
      ...Object.fromEntries(
        POOL_IDS.map((id, i) => [
          id,
          { flow: rate(s.branches[id].fresh.indicated, `PL${i + 1}`) },
        ]),
      ),
    },
  };
}

export function dirtyWaterMimicState({
  wetHall: s,
}: WetHallWaterReading): MimicState {
  const alarms = wetHallAlarms(s);
  return {
    lamps: {
      high: alarms.backwashHigh,
      pump: s.discharging,
      ...Object.fromEntries(
        POOL_IDS.flatMap((id) => [
          [`${id}-waste`, s.branches[id].waste >= 0.1],
          [`${id}-drain`, s.branches[id].drain >= 0.1],
        ]),
      ),
    },
    readouts: {
      pit: {
        flow: percent(
          (s.backwashTank / WET_HALL_PLANT.backwashTank) * 100,
          'PIT',
        ),
      },
      total: {
        flow: rate(branchTotal(s.branches, 'dirty', 'indicated'), 'TOTAL'),
      },
      ...Object.fromEntries(
        POOL_IDS.map((id, i) => [
          id,
          { flow: rate(s.branches[id].dirty.indicated, `PL${i + 1}`) },
        ]),
      ),
    },
  };
}
