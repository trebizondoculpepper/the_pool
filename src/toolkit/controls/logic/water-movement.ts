/** One modelled, enterable water volume at a horizontal point, in scene units. */
export interface WaterSample {
  id: string;
  floorY: number;
  surfaceY: number;
}

export type WaterMode = 'dry' | 'wading' | 'swimming';

export const STANDING_DEPTH_METRES = 1.2;
export const WADE_METRES_PER_SECOND = 0.9;
export const SWIM_METRES_PER_SECOND = 0.8;
export const MAX_WATER_ENTRY_DROP_METRES = 1;
export const MAX_DRY_STEP_METRES = 0.5;

export function waterMode(
  sample: WaterSample | null,
  metre: number,
): WaterMode {
  if (!sample || sample.surfaceY <= sample.floorY + 0.01 * metre) return 'dry';
  return sample.surfaceY - sample.floorY <= STANDING_DEPTH_METRES * metre
    ? 'wading'
    : 'swimming';
}

/** The swimmer's eye stays just above the live water plane. */
export function swimmingEyeY(sample: WaterSample, metre: number): number {
  return sample.surfaceY + 0.12 * metre;
}

/** A dry deck must not lead into a fall, and deep water needs an exit. */
export function mayCrossWaterEdge(
  from: WaterSample | null,
  to: WaterSample | null,
  fromFloorY: number,
  toFloorY: number,
  metre: number,
  allowHighWaterFall = false,
): boolean {
  if (from?.id === to?.id) return true;
  const fromMode = waterMode(from, metre);
  const toMode = waterMode(to, metre);
  if (!from && !to) return true;
  if (fromMode === 'swimming' && (!to || toMode === 'dry')) return false;
  // Standing in water grants the pool's simplified edge clamber, even if a
  // lowered surface makes the basin floor farther below the deck.
  if (from && !to && fromMode === 'wading') return true;
  if (from && !to && fromMode === 'dry')
    return toFloorY - fromFloorY <= MAX_DRY_STEP_METRES * metre;
  if (!from && to) {
    const landingY = toMode === 'dry' ? toFloorY : to.surfaceY;
    return (
      (allowHighWaterFall && toMode !== 'dry') ||
      fromFloorY - landingY <= MAX_WATER_ENTRY_DROP_METRES * metre
    );
  }
  return true;
}
