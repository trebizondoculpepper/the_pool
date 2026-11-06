/**
 * Stacking (mission 212, `doc/prompts/212-trait-stackable.md`): a box-like
 * stackable item may be placed on any supportable top, another loose item
 * too, aligned to its centre of gravity with a small, imperfect offset —
 * when the top it lands on is its own size. On a much larger top (a box on
 * a desk) that is ordinary placement, not a precarious pile: it centres,
 * and the error offsets are left out. Pure; the views supply the lower
 * top's frame and the random source.
 */

/** A box-like item's footprint, metres along x and z. */
export interface StackItem {
  width: number;
  depth: number;
}

/**
 * How many times the upper's size the lower's may be before the precarious
 * pile rule stops applying. A supportable thing within this narrow band of
 * the stackable one is a pile (centre of gravity + error offsets); beyond
 * it, the upper is put down ordinarily, centred, with no perilous error
 * (a book on a desk is not a book on a book).
 */
export const STACK_PILE_MAX_RATIO = 1.6;

/** Whether a lower top's size is within a pile's band of the upper's. */
export const isPile = (upper: StackItem, lower: StackItem): boolean => {
  const ratio = (a: number, b: number) =>
    Math.min(a, b) === 0 ? Infinity : Math.max(a, b) / Math.min(a, b);
  return (
    ratio(lower.width, upper.width) <= STACK_PILE_MAX_RATIO + 1e-9 &&
    ratio(lower.depth, upper.depth) <= STACK_PILE_MAX_RATIO + 1e-9
  );
};

/**
 * Where a stackable item rests on a lower item's top (mission 212): centred
 * on the lower's footprint, plus, when the lower is within a pile's size
 * band of the upper (`isPile`), independent X and Z offsets, each normally
 * distributed with a standard deviation of 5% of the smaller item's size
 * along that axis. No pile limit; the small errors make taller stacks look
 * imperfect.
 *
 * `ok: false` means "not a stack": the lower is far larger than the upper
 * (a book on a desk), so it is not a perilous pile — the resolver puts it
 * down ordinarily, with 210's exact aimed spot, and does not call this at
 * all (bala_qasim's point on PR #27). The area rule below still refuses an
 * upper too big for any top.
 */
export function stackPose(
  upper: StackItem,
  lower: StackItem,
  random: () => number,
): { ok: boolean; x: number; z: number; yaw: number } {
  // The upper's horizontal area may be at most 5% larger than the lower's,
  // whichever top it lands on.
  const upperArea = upper.width * upper.depth;
  const lowerArea = lower.width * lower.depth;
  if (upperArea > lowerArea * 1.05 + 1e-9)
    return { ok: false, x: 0, z: 0, yaw: 0 };
  // A book on a much larger desk is ordinary placement, not a pile: the
  // precarious centre-of-gravity offset stays for similar-sized stacks.
  if (!isPile(upper, lower)) return { ok: false, x: 0, z: 0, yaw: 0 };
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
