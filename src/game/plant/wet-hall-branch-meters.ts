import { POOL_IDS } from './pools';
import type { PoolId, PoolStepFlows } from './pools';

/** Eight branch transmitters: four on boosted make-up, four on pit-bound waste. */
export interface BranchMeter {
  /** Water that actually crossed the branch in the last world step, m³/h. */
  actual: number;
  /** A transmitter's damped indication, m³/h. */
  indicated: number;
}

export type WetHallBranchMeters = Record<
  PoolId,
  { fresh: BranchMeter; dirty: BranchMeter; waste: number; drain: number }
>;

const stopped = (): BranchMeter => ({ actual: 0, indicated: 0 });

export function newWetHallBranchMeters(): WetHallBranchMeters {
  return Object.fromEntries(
    POOL_IDS.map((id) => [
      id,
      { fresh: stopped(), dirty: stopped(), waste: 0, drain: 0 },
    ]),
  ) as WetHallBranchMeters;
}

/** A two-second converter time constant stops a float valve chattering on the display. */
const RESPONSE_SECONDS = 2;

export function stepWetHallBranchMeters(
  previous: WetHallBranchMeters,
  flows: Record<PoolId, PoolStepFlows>,
  dt: number,
): WetHallBranchMeters {
  if (dt <= 0) return previous;
  const hours = dt / 3600;
  const response = 1 - Math.exp(-dt / RESPONSE_SECONDS);
  const meter = (old: BranchMeter, volume: number): BranchMeter => {
    const actual = Math.max(0, volume / hours);
    return {
      actual,
      indicated: old.indicated + response * (actual - old.indicated),
    };
  };
  return Object.fromEntries(
    POOL_IDS.map((id) => [
      id,
      {
        fresh: meter(previous[id].fresh, flows[id].madeUp),
        dirty: meter(previous[id].dirty, flows[id].pit),
        waste: Math.max(0, flows[id].pitWaste / hours),
        drain: Math.max(0, flows[id].pitDrain / hours),
      },
    ]),
  ) as WetHallBranchMeters;
}

export const branchTotal = (
  branches: WetHallBranchMeters,
  side: 'fresh' | 'dirty',
  value: 'actual' | 'indicated',
) => POOL_IDS.reduce((total, id) => total + branches[id][side][value], 0);
