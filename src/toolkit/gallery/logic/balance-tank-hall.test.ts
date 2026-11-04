import { describe, expect, it } from 'vite-plus/test';
import { BALANCE_TANK, volumeOf } from '../../../game/plant/balance-tank';
import {
  HALL,
  HALL_INLET_LABELS,
  PARTITION,
  SPOTS,
  START,
  TANK,
  TANK_BUS,
  hallPipes,
  hallLevelCable,
  hallDrainRun,
  heightOf,
} from './balance-tank-hall';
import { OLYMPIC_ANNEX } from './olympic-annex';

describe('the balance tank hall', () => {
  it('is the Olympic tank: 9 × 6 m inside, 216 m³ to its weir, its walls the hall’s', () => {
    expect(TANK.maxX - TANK.minX).toBeCloseTo(9, 9);
    expect(TANK.maxZ - TANK.minZ).toBe(6);
    expect(volumeOf(BALANCE_TANK.weir)).toBe(216);
    expect(HALL.halfZ * 2 - (TANK.maxZ - TANK.minZ)).toBeCloseTo(0.3, 9);
  });

  it('keeps its water below the gantry and the pool overflows into it from above its weir', () => {
    expect(heightOf(BALANCE_TANK.depth)).toBe(0);
    for (const r of hallPipes().returns)
      expect(r.at(-1)![1]).toBeGreaterThan(heightOf(BALANCE_TANK.weir));
  });

  it('identifies both pool overflow drops and the mains make-up at their actual pipes', () => {
    const runs = hallPipes();
    expect(
      HALL_INLET_LABELS.slice(0, 2).map((label) => label.lines[1]),
    ).toEqual(['OVERFLOW RETURN 1', 'OVERFLOW RETURN 2']);
    expect(HALL_INLET_LABELS.map((label) => label.lines[0])).toEqual([
      'OLYMPIC POOL',
      'OLYMPIC POOL',
      'MAINS MAKE-UP',
    ]);
    for (const [index, label] of HALL_INLET_LABELS.entries()) {
      const run = index < 2 ? runs.returns[index] : runs.makeup;
      expect(label.at[0]).toBe(run.at(-1)![0]);
      expect(label.at[2]).toBe(run.at(-1)![2]);
    }
  });

  it('feeds its make-up through an air gap above the weir (Type AA: at least 20 mm)', () => {
    expect(
      hallPipes().makeup.at(-1)![1] - heightOf(BALANCE_TANK.weir),
    ).toBeGreaterThan(0.02);
  });

  it('draws its suctions below LOW LOW, so a trip comes before they take air', () => {
    for (const s of SPOTS.suctions)
      expect(s.y + 0.3).toBeLessThan(heightOf(BALANCE_TANK.lowLow));
  });

  it('starts the walker in the plant bay, behind the partition', () => {
    expect(START.x).toBeLessThan(TANK.minX - PARTITION);
    expect(START.x).toBeGreaterThan(-HALL.halfX);
  });

  it('keeps the machinery out of the hall: the panel and the make-up valve in the bay', () => {
    expect(SPOTS.panel.x).toBeLessThan(TANK.minX - PARTITION);
    expect(SPOTS.makeup.bayX).toBeLessThan(TANK.minX - PARTITION);
  });

  it('takes the suctions west through the partition to the plant room', () => {
    for (const r of hallPipes().suctions)
      expect(r.at(-1)![0]).toBeLessThan(TANK.minX - PARTITION);
  });
});

it('sets the hall ceiling to the complex’s 7 m plant height', () => {
  expect(HALL.height).toBe(7);
});

it('takes the level cable from its gland straight up to the control bus height and square into the south wall bus, on a control link', () => {
  const p = hallLevelCable();
  expect(p[0]).toEqual([
    SPOTS.transmitter.x + 0.11,
    SPOTS.transmitter.y + 0.2,
    SPOTS.transmitter.z,
  ]);
  expect(p[1]).toEqual([
    SPOTS.transmitter.x + 0.16,
    SPOTS.transmitter.y + 0.2,
    SPOTS.transmitter.z,
  ]);
  expect(p[2]).toEqual([
    SPOTS.transmitter.x + 0.16,
    TANK_BUS.y,
    SPOTS.transmitter.z,
  ]);
  expect(p[3]).toEqual([
    SPOTS.transmitter.x + 0.16,
    TANK_BUS.y,
    TANK.maxZ - TANK_BUS.off,
  ]);
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1],
      b = p[i];
    const axes = [a[0] !== b[0], a[1] !== b[1], a[2] !== b[2]].filter(Boolean);
    expect(axes).toHaveLength(1);
  }
  for (const point of p) expect(point[1]).toBeLessThan(HALL.height);
  const link = OLYMPIC_ANNEX.links.find((l) => l.id === 'tank.level-signal');
  expect(link?.medium).toBe('control');
});
it('takes the floor drain out through the east wall below its sump, with its penstock on the run', () => {
  const run = hallDrainRun();
  expect(run.points[0][1]).toBeLessThan(TANK.floor);
  expect(run.points.at(-1)![0]).toBeGreaterThan(TANK.maxX);
  expect(run.valves[0].at[1]).toBe(run.points[0][1]);
  expect(run.valves[0].at[0]).toBeGreaterThan(run.points[0][0]);
});
