/**
 * Stacking (mission 212, `doc/prompts/212-trait-stackable.md`): a box-like
 * stackable item may be placed on any supportable top, another loose item
 * too, aligned to its centre of gravity with a small, imperfect offset.
 * Pure; the views supply the lower top's frame and the random source.
 */

/** A box-like item's footprint, metres along x and z. */
export interface StackItem {
  width: number;
  depth: number;
}

/**
 * Where a stackable item rests on a lower item's top (mission 212): centred
 * on the lower's footprint, plus independent X and Z offsets, each normally
 * distributed with a standard deviation of 5% of the smaller item's size
 * along that axis. No pile limit; the small errors make taller stacks look
 * imperfect.
 */
export function stackPose(
  upper: StackItem,
  lower: StackItem,
  random: () => number,
): { ok: boolean; x: number; z: number; yaw: number } {
  // The upper's horizontal area may be at most 5% larger than the lower's.
  const upperArea = upper.width * upper.depth;
  const lowerArea = lower.width * lower.depth;
  if (upperArea > lowerArea * 1.05 + 1e-9)
    return { ok: false, x: 0, z: 0, yaw: 0 };
  const sdX = 0.05 * Math.min(upper.width, lower.width);
  const sdZ = 0.05 * Math.min(upper.depth, lower.depth);
  // Box–Muller: a gaussian from the uniform source (two draws at a time);
  // a fresh 0.5-second draw wastes nothing for a rare one-off call.
  const gauss = () => {
    const u = Math.max(1e-12, random());
    const v = Math.max(1e-12, random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return {
    ok: true,
    x: gauss() * sdX,
    z: gauss() * sdZ,
    yaw: 0,
  };
}
