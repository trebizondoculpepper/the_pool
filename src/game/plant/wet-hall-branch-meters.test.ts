import { describe, expect, it } from 'vite-plus/test';
import { POOL_IDS } from './pools';
import {
  branchTotal,
  newWetHallBranchMeters,
  stepWetHallBranchMeters,
} from './wet-hall-branch-meters';
import type { PoolId, PoolStepFlows } from './pools';

const flows = (
  fresh: number[],
  dirty: number[],
): Record<PoolId, PoolStepFlows> =>
  Object.fromEntries(
    POOL_IDS.map((id, i) => [
      id,
      {
        madeUp: fresh[i],
        pit: dirty[i],
        pitWaste: dirty[i],
        pitDrain: 0,
        sewer: 0,
        evaporated: 0,
        uv: false,
      },
    ]),
  ) as Record<PoolId, PoolStepFlows>;

describe('wet-hall branch transmitters', () => {
  it('conserves the actual water while damping each indicated rate', () => {
    const volume = flows([0.001, 0.002, 0, 0.003], [0.01, 0, 0.02, 0]);
    const next = stepWetHallBranchMeters(newWetHallBranchMeters(), volume, 1);
    expect(branchTotal(next, 'fresh', 'actual')).toBeCloseTo(21.6);
    expect(branchTotal(next, 'dirty', 'actual')).toBeCloseTo(108);
    expect(next.pool_01.fresh.indicated).toBeGreaterThan(0);
    expect(next.pool_01.fresh.indicated).toBeLessThan(
      next.pool_01.fresh.actual,
    );
    expect(next.pool_02.dirty.actual).toBe(0);
    const stopped = stepWetHallBranchMeters(
      next,
      flows([0, 0, 0, 0], [0, 0, 0, 0]),
      1,
    );
    expect(stopped.pool_01.fresh.actual).toBe(0);
    expect(stopped.pool_01.fresh.indicated).toBeLessThan(
      next.pool_01.fresh.indicated,
    );
  });

  it('does not divide by zero for a paused world step', () => {
    const before = newWetHallBranchMeters();
    expect(
      stepWetHallBranchMeters(before, flows([1, 0, 0, 0], [0, 0, 0, 0]), 0),
    ).toBe(before);
  });
});
