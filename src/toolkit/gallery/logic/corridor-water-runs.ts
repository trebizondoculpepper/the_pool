import { corridorServices } from './corridor-services';
import type { Vec3 } from './corridor-services';
import { POOL_IDS } from '../../../game/plant/pools';
import type { PoolId } from '../../../game/plant/pools';
import { branchMeterTag } from '../../../game/plant/corridor-water-schematic';

/** Physical cross-room water lines. The existing service positions supply
 * the clean ring and the two large-pool legs; the new spa lines fall below
 * the corridor floor to the pit, clear of the walkway and overhead tiers. */
export interface CorridorWaterRun {
  link?: string;
  node?: string;
  points: Vec3[];
  od: number;
  kind: 'copper' | 'pvc-pressure' | 'pvc-drain';
}

export interface CorridorBranchTransmitter {
  id: string;
  tag: string;
  side: 'fresh' | 'dirty';
  pool: PoolId;
  at: Vec3;
  along: Vec3;
  od: number;
}

const distance = (a: Vec3, b: Vec3) =>
  Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const interpolate = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const direction = (a: Vec3, b: Vec3): Vec3 => {
  const d = distance(a, b);
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d];
};

function splitAt(points: readonly Vec3[], length: number) {
  let left = length;
  for (let i = 1; i < points.length; i++) {
    const span = distance(points[i - 1], points[i]);
    if (left > span && i < points.length - 1) {
      left -= span;
      continue;
    }
    const at = interpolate(
      points[i - 1],
      points[i],
      Math.min(1, Math.max(0, left / span)),
    );
    return {
      upstream: [...points.slice(0, i), at],
      downstream: [at, ...points.slice(i)],
      at,
      along: direction(points[i - 1], points[i]),
    };
  }
  throw new Error('water run has no length');
}

export function corridorWaterRuns() {
  const services = corridorServices();
  const find = (name: string) => {
    const run = services.find((r) => r.name === name);
    if (!run) throw new Error(`missing corridor water run: ${name}`);
    return run;
  };
  const runs: CorridorWaterRun[] = [];
  const transmitters: CorridorBranchTransmitter[] = [];
  const feed = find('Make-up from the wet hall');
  for (const ring of services.filter((r) => r.name.startsWith('Make-up ring,')))
    runs.push({
      node: 'make-up-ring',
      points: ring.points,
      od: ring.od,
      kind: 'copper',
    });
  runs.push({
    link: 'Wet hall booster to make-up ring',
    points: feed.points,
    od: feed.od,
    kind: 'copper',
  });
  const branch = (
    side: 'fresh' | 'dirty',
    pool: PoolId,
    points: Vec3[],
    od: number,
    kind: CorridorWaterRun['kind'],
  ) => {
    const { upstream, downstream, at, along } = splitAt(
      points,
      Math.min(0.65, distance(points[0], points[1]) / 2),
    );
    runs.push(
      {
        link: `${pool} ${side === 'fresh' ? 'make-up' : 'pit waste'} upstream`,
        points: upstream,
        od,
        kind,
      },
      {
        link: `${pool} ${side === 'fresh' ? 'make-up' : 'pit waste'} downstream`,
        points: downstream,
        od,
        kind,
      },
    );
    transmitters.push({
      id: `${side}-${pool}`,
      tag: branchMeterTag(side, pool),
      side,
      pool,
      at,
      along,
      od,
    });
  };

  for (const pool of POOL_IDS) {
    const room = `plant_pool_${pool.slice(-2)}`;
    branch('fresh', pool, find(`Make-up to ${room}`).points, 0.054, 'copper');
  }
  // All filter waste and the Lounge balance-tank drain can reach these
  // low lines by gravity. The former 3.15 m overhead backwash display
  // route could not carry the Lounge's tank drain uphill.
  const join: Vec3 = [8.5, -1.1, 3.6];
  branch(
    'dirty',
    'pool_01',
    [
      [6.2, -0.4, 28.2],
      [6.2, -0.42, 27.8],
      [2.6, -0.55, 27.8],
      [2.6, -0.88, 3.6],
      join,
    ],
    0.16,
    'pvc-drain',
  );
  branch(
    'dirty',
    'pool_02',
    [[11.2, -0.5, -0.2], [11.2, -0.55, 1.0], join],
    0.315,
    'pvc-drain',
  );
  runs.push({
    link: 'Joined large-pool waste to pit',
    points: [join, [8.5, -1.25, 4.2]],
    od: 0.25,
    kind: 'pvc-drain',
  });

  // The cabinets and filter washes discharge into their own buried branch
  // at the plant-room boundary. The branches fall into the pit through its
  // west wall, below the wet-hall floor (1.75 m below corridor level).
  branch(
    'dirty',
    'pool_04',
    [
      [0.2, -0.22, 18.9],
      [1.2, -0.27, 18.9],
      [1.2, -0.38, 17.6],
      [3.8, -0.5, 17.6],
      [3.8, -1.9, 17.6],
      [4.2, -1.92, 17.6],
    ],
    0.075,
    'pvc-drain',
  );
  branch(
    'dirty',
    'pool_03',
    [
      [0.2, -0.22, 25.6],
      [1.8, -0.3, 25.6],
      [1.8, -0.5, 20.4],
      [3.8, -0.65, 20.4],
      [3.8, -1.95, 20.4],
      [4.2, -1.97, 20.4],
    ],
    0.075,
    'pvc-drain',
  );

  runs.push({
    link: 'Olympic tank drain to wet hall foul inlet',
    points: [
      [11.2, -0.2, -0.2],
      [20.2, -0.6, -0.2],
      [20.2, -2.0, 4.2],
    ],
    od: 0.11,
    kind: 'pvc-drain',
  });
  return { runs, transmitters };
}
