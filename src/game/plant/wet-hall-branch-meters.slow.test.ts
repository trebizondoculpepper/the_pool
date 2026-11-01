import { describe, expect, it } from 'vite-plus/test';
import { newWorld, stepWorld } from '../world';
import { branchTotal } from './wet-hall-branch-meters';
import { JACUZZI_VALVES } from './jacuzzi';

/** The meters observe the same moved water that the wet hall counts. */
describe('the four wet-hall branch meters over time', () => {
  it('reconciles fresh delivery and pit inflow on every world step', () => {
    let world = newWorld();
    world = {
      ...world,
      pools: {
        ...world.pools,
        pool_01: { ...world.pools.pool_01, balance: 0.35 },
        pool_02: { ...world.pools.pool_02, balance: 0.35 },
        pool_03: { ...world.pools.pool_03, balance: 0.35 },
        pool_04: { ...world.pools.pool_04, balance: 0.35 },
      },
      installedValves: {
        ...world.installedValves,
        [JACUZZI_VALVES.drain]: true,
      },
    };
    let sawFresh = false;
    let sawWaste = false;
    for (let second = 0; second < 600; second++) {
      world = stepWorld(world, 1);
      const fresh = branchTotal(world.wetHall.branches, 'fresh', 'actual');
      const dirty = branchTotal(world.wetHall.branches, 'dirty', 'actual');
      expect(fresh, `fresh at ${second}s`).toBeCloseTo(world.wetHall.flow, 6);
      expect(dirty, `pit at ${second}s`).toBeCloseTo(
        world.wetHall.pitInflow,
        6,
      );
      sawFresh ||= fresh > 0.1;
      sawWaste ||= dirty > 0.1;
    }
    expect(sawFresh).toBe(true);
    expect(sawWaste).toBe(true);
  }, 30_000);
});
