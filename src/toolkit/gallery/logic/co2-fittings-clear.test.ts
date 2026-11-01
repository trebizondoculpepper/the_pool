import { describe, expect, it } from 'vite-plus/test';
import { CO2_DETECTOR_PARTS, CO2_LOADING_BAY } from './co2-fittings';
import { loadingBayPlumbing } from './loading-bay-plumbing';
import { olympicRoom } from './olympic-plumbing';
import { layoutRoom } from './room-equipment';
import type { Placed } from './room-equipment';
import { poolPlantPipework } from './room-pipes';
import { SHELL_ROOMS } from './shell-rooms';

/**
 * The CO₂ fittings' faces are clear (2026-11-01): nothing passes in front
 * of a wall panel's face within its working depth, where someone stands
 * to read and work it. In the Lounge's plant room the Trio's sample tubes,
 * their brackets and its supply's feed with its "230 V" sign ran across
 * the dosing panel and its wall port; in the Olympic's the Trio's CO₂
 * control cable dropped down across the wall port; in the loading bay
 * the east shutter's hand chain hung over the master valve and the
 * dock's signs sat behind the line.
 */

/** How far out from a panel's face is kept clear: an arm's length, metres. */
const WORKING_DEPTH = 0.6;
/** A run grazing a face's edge (touching its top, say) is not across it. */
const EDGE = 0.01;

type Box = { min: number[]; max: number[] };
type Run = { name: string; od: number; points: readonly (readonly number[])[] };

const overlaps = (a: Box, b: Box) =>
  [0, 1, 2].every((k) => a.min[k] < b.max[k] && a.max[k] > b.min[k]);

/**
 * What of a fitting's face is worked or read, as heights over the floor:
 * the whole of a panel; a detector's head and its controller, not the
 * conduit between them (`CO2_DETECTOR_PARTS`).
 */
function facesOf(p: Placed): [number, number][] {
  if (p.item.key === 'co2-detector')
    return [
      [
        p.y + CO2_DETECTOR_PARTS.head - 0.1,
        p.y + CO2_DETECTOR_PARTS.head + 0.1,
      ],
      [
        p.y + CO2_DETECTOR_PARTS.controller - 0.2,
        p.y + CO2_DETECTOR_PARTS.controller + 0.2,
      ],
    ];
  return [[p.y - p.item.h / 2, p.y + p.item.h / 2]];
}

/** The space before each worked part of a wall item's face: as wide as it, WORKING_DEPTH out. */
const frontsOf = (p: Placed): Box[] =>
  facesOf(p).map(([lo, hi]) => frontOf(p, lo + EDGE, hi - EDGE));

/** Its whole self: its footprint, as tall as it is. */
const bodyOf = (p: Placed): Box => {
  const f = p.footprint;
  return {
    min: [f.minX + EDGE, p.y - p.item.h / 2 + EDGE, f.minZ + EDGE],
    max: [f.maxX - EDGE, p.y + p.item.h / 2 - EDGE, f.maxZ - EDGE],
  };
};

function frontOf(p: Placed, y0: number, y1: number): Box {
  const f = p.footprint;
  switch (p.side) {
    case 'north':
      return {
        min: [f.minX + EDGE, y0, f.maxZ],
        max: [f.maxX - EDGE, y1, f.maxZ + WORKING_DEPTH],
      };
    case 'south':
      return {
        min: [f.minX + EDGE, y0, f.minZ - WORKING_DEPTH],
        max: [f.maxX - EDGE, y1, f.minZ],
      };
    case 'east':
      return {
        min: [f.minX - WORKING_DEPTH, y0, f.minZ + EDGE],
        max: [f.minX, y1, f.maxZ - EDGE],
      };
    default:
      return {
        min: [f.maxX, y0, f.minZ + EDGE],
        max: [f.maxX + WORKING_DEPTH, y1, f.maxZ - EDGE],
      };
  }
}

/** Each straight length of a run as a box, its pipe's thickness round it. */
const lengths = (r: Run): Box[] =>
  r.points.slice(1).map((b, i) => {
    const a = r.points[i];
    return {
      min: [0, 1, 2].map((k) => Math.min(a[k], b[k]) - r.od / 2),
      max: [0, 1, 2].map((k) => Math.max(a[k], b[k]) + r.od / 2),
    };
  });

const CO2_WALL_ITEMS = [
  'co2-panel',
  'co2-wall-port',
  'co2-detector',
  'co2-wall-inlet',
  'co2-master',
];

const ROOMS: [string, () => readonly Run[]][] = [
  ['plant_pool_01', () => poolPlantPipework('plant_pool_01').runs],
  ['plant_pool_02', () => olympicRoom().runs],
  ['loading_bay', () => loadingBayPlumbing()],
];

describe.each(ROOMS)('%s’s CO₂ fittings', (room, runsOf) => {
  const layout = layoutRoom(room)!;
  const fittings = layout.placed.filter((p) =>
    CO2_WALL_ITEMS.includes(p.item.key),
  );

  it('has its fittings on its walls', () => {
    expect(fittings.length).toBeGreaterThan(0);
    for (const p of fittings) expect(p.side, p.item.label).not.toBe('island');
  });

  it('runs no pipe, tube or cable across a fitting’s face', () => {
    const runs = runsOf();
    const across: string[] = [];
    for (const p of fittings)
      for (const front of frontsOf(p))
        for (const r of runs)
          if (lengths(r).some((l) => overlaps(l, front)))
            across.push(`${r.name} across ${p.item.label}`);
    expect(across).toEqual([]);
  });

  it('runs no pipe, tube or cable through a fitting, but into it at an end', () => {
    const runs = runsOf();
    const through: string[] = [];
    for (const p of fittings) {
      const body = bodyOf(p);
      const inside = (q: readonly number[]) =>
        [0, 1, 2].every(
          (k) =>
            q[k] >= body.min[k] - 2 * EDGE && q[k] <= body.max[k] + 2 * EDGE,
        );
      for (const r of runs) {
        const last = r.points.length - 2;
        // A line ending at the fitting (at its port, in its body) meets it
        // on its last length; any other length in it passes through.
        const hit = lengths(r).some(
          (l, i) =>
            overlaps(l, body) &&
            !(i === 0 && inside(r.points[0])) &&
            !(i === last && inside(r.points[last + 1])),
        );
        if (hit) through.push(`${r.name} through ${p.item.label}`);
      }
    }
    expect(through).toEqual([]);
  });

  it('stands nothing else in front of a fitting’s face', () => {
    const across: string[] = [];
    for (const p of fittings)
      for (const front of frontsOf(p))
        for (const q of layout.placed) {
          if (q === p) continue;
          const f = q.footprint;
          const y0 = q.item.mount === 'wall' ? q.y - q.item.h / 2 : 0;
          const y1 = q.item.mount === 'wall' ? q.y + q.item.h / 2 : q.item.h;
          const box = { min: [f.minX, y0, f.minZ], max: [f.maxX, y1, f.maxZ] };
          if (overlaps(box, front))
            across.push(`${q.item.label} before ${p.item.label}`);
        }
    expect(across).toEqual([]);
  });
});

describe('the loading bay’s CO₂ fittings and the dock’s fittings', () => {
  const layout = layoutRoom('loading_bay')!;
  const fittings = layout.placed.filter((p) =>
    CO2_WALL_ITEMS.includes(p.item.key),
  );

  it('keeps them clear of the east shutter’s hand chain', () => {
    // As `createRollerShutter` hangs it: on its drive's end plate, 0.37 m
    // past the opening's east side (`dock-parts.ts`).
    const east = SHELL_ROOMS.loading_bay.apertures!.filter(
      (a) => a.wall === 'north' && !('door' in a && a.door) && a.at > 0,
    );
    for (const a of east) {
      const chain = a.at + a.w / 2 + 0.3 + 0.07;
      for (const p of fittings)
        expect(
          p.footprint.minX > chain + 0.1 || p.footprint.maxX < chain - 0.1,
          p.item.label,
        ).toBe(true);
    }
  });

  it('hangs the dock’s signs on that stretch of wall over them', () => {
    // A portrait safety sign is 0.3 m tall (`SIGN_SIZES`).
    const signsFoot = CO2_LOADING_BAY.signs - 0.15;
    for (const p of fittings)
      expect(p.y + p.item.h / 2, p.item.label).toBeLessThan(signsFoot);
    expect(CO2_LOADING_BAY.line).toBeLessThan(signsFoot);
  });
});
