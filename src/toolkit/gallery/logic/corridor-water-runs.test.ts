import { describe, expect, it } from 'vite-plus/test';
import { schematicExpansion } from '../../../game/plant/schematics';
import { corridorWaterRuns } from './corridor-water-runs';

describe('the modelled corridor water branches', () => {
  it('places eight unique transmitters on their own pipe before any join', () => {
    const { runs, transmitters } = corridorWaterRuns();
    expect(transmitters).toHaveLength(8);
    expect(new Set(transmitters.map((t) => t.tag)).size).toBe(8);
    const network = schematicExpansion('main_corridor')!;
    for (const run of runs)
      expect(
        run.link
          ? network.edges.some((edge) => edge.id === run.link)
          : network.nodes.some((node) => node.id === run.node),
        run.link ?? run.node,
      ).toBe(true);
    for (const meter of transmitters) {
      expect(network.nodes.some((node) => node.id === meter.id)).toBe(true);
      const name = `${meter.pool} ${meter.side === 'fresh' ? 'make-up' : 'pit waste'}`;
      expect(runs.some((run) => run.link === `${name} upstream`)).toBe(true);
      expect(runs.some((run) => run.link === `${name} downstream`)).toBe(true);
    }
  });

  it('keeps the spa waste and Olympic tank drain falling to their destinations', () => {
    const { runs } = corridorWaterRuns();
    for (const run of runs.filter((r) =>
      /pit waste|large-pool waste|Olympic tank drain/.test(r.link ?? ''),
    )) {
      for (let i = 1; i < run.points.length; i++)
        expect(run.points[i][1]).toBeLessThanOrEqual(run.points[i - 1][1]);
    }
    const olympic = runs.find(
      (r) => r.link === 'Olympic tank drain to wet hall foul inlet',
    )!;
    const joined = runs.find(
      (r) => r.link === 'Joined large-pool waste to pit',
    )!;
    expect(olympic.points.at(-1)?.[1]).toBeLessThan(-1.75);
    expect(joined.points.at(-1)?.[1]).toBeLessThan(joined.points[0][1]);
  });
});
