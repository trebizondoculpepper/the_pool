import { describe, expect, it } from 'vite-plus/test';
import { WET_HALL_SCHEMATIC } from '../../../game/plant/wet-hall-schematic';
import { CORRIDOR_WATER_SCHEMATIC } from '../../../game/plant/corridor-water-schematic';
import { LOUNGE_BACKWASH_FLOW } from '../../../game/plant/lounge-valves';
import { BACKWASH_PIT } from '../../../game/plant/wet-hall';
import { spaWasteCollector } from './spa-waste-collector';
import { corridorWaterRuns } from './corridor-water-runs';
import {
  wetHallLargePoolWasteRun,
  wetHallOlympicFoulRun,
  wetHallSpaWasteRuns,
} from './wet-hall-spa-waste';

describe('the low drain routes', () => {
  it('collects each spa drain and filter wash before crossing to the corridor', () => {
    for (const room of ['plant_pool_03', 'plant_pool_04']) {
      const runs = spaWasteCollector(room);
      expect(runs.at(-1)?.link).toBe('Collected pit waste to corridor');
      expect(runs.length).toBe(room === 'plant_pool_03' ? 4 : 3);
      const junction = runs.at(-1)!.points[0];
      for (const run of runs.slice(0, -1)) {
        expect(run.points.at(-1)).toEqual(junction);
        expect(run.points.at(-1)![1]).toBeLessThan(run.points[0][1]);
      }
    }
  });

  it('falls into the pit from both spa wall sleeves and keeps the Olympic drain separate', () => {
    const corridor = corridorWaterRuns().runs;
    const spa = wetHallSpaWasteRuns();
    for (const run of spa) {
      const pool = run.name.startsWith('Jacuzzi') ? 'pool_03' : 'pool_04';
      const inCorridor = corridor.find(
        (r) => r.link === `${pool} pit waste downstream`,
      )!;
      const end = inCorridor.points.at(-1)!;
      const start = run.points[1];
      for (const [actual, expected] of [
        start[0] + 14,
        start[1] - 1.75,
        start[2] + 14,
      ].map((v, i) => [v, end[i]]))
        expect(actual).toBeCloseTo(expected, 6);
      for (let i = 1; i < run.points.length; i++)
        expect(run.points[i][1]).toBeLessThanOrEqual(run.points[i - 1][1]);
      expect(
        WET_HALL_SCHEMATIC.links.some(
          (l) => l.id === run.name && l.targetId === 'holding',
        ),
      ).toBe(true);
    }
    const foul = wetHallOlympicFoulRun();
    expect(foul.points.at(-1)?.[0]).toBeGreaterThan(2.8);
    expect(
      CORRIDOR_WATER_SCHEMATIC.links.some(
        (l) => l.id === 'Olympic tank drain to wet hall foul inlet',
      ),
    ).toBe(true);
    expect(
      WET_HALL_SCHEMATIC.links.some(
        (l) => l.id === foul.name && l.targetId === 'sewer',
      ),
    ).toBe(true);
  });

  it('has gravity capacity for one Olympic wash, both Lounge washes and the spas together', () => {
    const slopeOfLongest = (
      points: readonly (readonly [number, number, number])[],
    ) => {
      const spans = points
        .slice(1)
        .map((end, i) => {
          const start = points[i];
          const horizontal = Math.hypot(end[0] - start[0], end[2] - start[2]);
          return { horizontal, slope: (start[1] - end[1]) / horizontal };
        })
        .filter((span) => span.horizontal > 0.5);
      return spans.sort((a, b) => b.horizontal - a.horizontal)[0].slope;
    };
    // Full-pipe Manning estimate for smooth PVC-U, using inside bores
    // smaller than the specified outside diameters (n = 0.009).
    const capacity = (bore: number, slope: number) => {
      const area = (Math.PI * bore * bore) / 4;
      return (
        ((area * Math.pow(bore / 4, 2 / 3) * Math.sqrt(slope)) / 0.009) * 3600
      );
    };
    const lounge = corridorWaterRuns().runs.find(
      (r) => r.link === 'pool_01 pit waste downstream',
    )!;
    expect(capacity(0.15, slopeOfLongest(lounge.points))).toBeGreaterThan(
      2 * LOUNGE_BACKWASH_FLOW,
    );
    const wetHall = wetHallLargePoolWasteRun();
    expect(capacity(0.23, slopeOfLongest(wetHall.points))).toBeGreaterThan(
      210 + 2 * LOUNGE_BACKWASH_FLOW + 25,
    );
  });

  it('discharges each gravity branch above the pit top water', () => {
    const topWater = BACKWASH_PIT.topWater - BACKWASH_PIT.depth;
    for (const run of [...wetHallSpaWasteRuns(), wetHallLargePoolWasteRun()]) {
      const invert = run.points.at(-1)![1] - run.od / 2;
      expect(invert, run.name).toBeGreaterThan(topWater + 0.05);
    }
  });

  it('keeps each long gravity leg at least 1 in 80', () => {
    const corridor = corridorWaterRuns().runs.filter((run) =>
      /pit waste|large-pool waste|Olympic tank drain/.test(run.link ?? ''),
    );
    const wetHall = [
      ...wetHallSpaWasteRuns(),
      wetHallLargePoolWasteRun(),
      wetHallOlympicFoulRun(),
    ];
    for (const run of [...corridor, ...wetHall])
      for (let i = 1; i < run.points.length; i++) {
        const start = run.points[i - 1];
        const end = run.points[i];
        const horizontal = Math.hypot(end[0] - start[0], end[2] - start[2]);
        if (horizontal < 0.5) continue;
        expect(
          (start[1] - end[1]) / horizontal,
          ('name' in run ? run.name : run.link) ?? 'water run',
        ).toBeGreaterThanOrEqual(1 / 80);
      }
  });
});
