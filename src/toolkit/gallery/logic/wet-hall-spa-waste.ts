import type { PipeRun } from './room-pipes';
import { MAIN_CORRIDOR } from './main-corridor';
import { WET_HALL } from './shell-rooms';

/** The visible falling ends of the two spa gravity branches, from their
 * west-wall sleeves into the pit. The corridor portions end at the same
 * sleeves; their levels use the corridor floor as the common datum. */
export function wetHallSpaWasteRuns(): PipeRun[] {
  const centre = MAIN_CORRIDOR.side / 2;
  const local = (x: number, y: number, z: number): [number, number, number] => [
    x - centre,
    y + WET_HALL.drop,
    z - centre,
  ];
  return [
    ['Jacuzzi', 20.4, -1.97, -2.1, -2.2, 20.4],
    ['Footbath', 17.6, -1.92, -2.04, -2.15, 18.5],
  ].map(([pool, z, inlet, buried, pit, pitZ]) => ({
    name: `${pool} gravity waste into pit`,
    kind: 'pvc-drain' as const,
    od: 0.075,
    service: 'drainage' as const,
    joins: [`${pool} pit-waste`, 'holding'],
    label: `${String(pool).toUpperCase()} PIT WASTE`,
    points: [
      local(3.8, Number(inlet) + 0.02, Number(z)),
      local(4.2, Number(inlet), Number(z)),
      local(4.2, Number(buried), Number(z)),
      local(4.2, Number(buried) - 0.02, Number(pitZ)),
      local(9.9, Number(pit), Number(pitZ)),
    ],
    through: [
      {
        at: local(4, Number(inlet) + 0.01, Number(z)),
        normal: [1, 0, 0] as const,
        thickness: 0.2,
        kind: 'fire-collar' as const,
      },
    ],
    valves: [],
    model: { link: `${pool} gravity waste into pit` },
  }));
}

/** The Olympic balance tank's maintenance drain bypasses the pit: its
 * underfloor foul line follows the wet hall's east edge to the sewer drop. */
export function wetHallOlympicFoulRun(): PipeRun {
  return {
    name: 'Olympic tank drain to foul sewer',
    kind: 'pvc-drain',
    od: 0.11,
    service: 'drainage',
    joins: ['olympic-foul-inlet', 'sewer'],
    label: 'OLYMPIC TANK FOUL DRAIN',
    points: [
      [6.2, -0.25, -10.2],
      [6.2, -0.3, -9.8],
      [6.2, -0.55, 7.6],
    ],
    through: [
      {
        at: [6.2, -0.275, -10],
        normal: [0, 0, 1],
        thickness: 0.2,
        kind: 'fire-collar',
      },
    ],
    valves: [],
    model: { link: 'Olympic tank drain to foul sewer' },
  };
}

/** The large pools' common low waste line drops from its north-wall
 * sleeve, stays beneath the ramp and floor, and enters the pit on its
 * west edge. The inlet carries both backwash and gravity filter drains. */
export function wetHallLargePoolWasteRun(): PipeRun {
  return {
    name: 'Backwash main to the holding tank',
    kind: 'pvc-drain',
    od: 0.25,
    service: 'drainage',
    joins: ['plant-rooms', 'holding'],
    label: 'LARGE-POOL PIT WASTE',
    points: [
      [-5.5, 0.65, -10.2],
      [-5.5, 0.5, -9.8],
      [-5.5, -0.15, -9.8],
      [-5.5, -0.38, 3.5],
      [-4.1, -0.42, 3.5],
    ],
    through: [
      {
        at: [-5.5, 0.575, -10],
        normal: [0, 0, 1],
        thickness: 0.2,
        kind: 'fire-collar',
      },
    ],
    valves: [],
    model: { link: 'Backwash main to the holding tank' },
  };
}
