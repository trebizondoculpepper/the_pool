/**
 * Racking (mission 206, `doc/prompts/206-trait-rackable.md`): a designated
 * rack holds one centred, compact row of rackable items it — a shelf of
 * software boxes, a future library of manuals. Pure; the views supply the
 * row's frame and the yaw convention and upload poses.
 */

/** A rack's usable run, from its `rack` trait metadata. */
export interface RackSpec {
  /** Usable row width along the row, metres. */
  rowWidth: number;
  /** Usable row depth, metres; every item's four bottom corners must fit it. */
  rowDepth: number;
  /** The local face the row's labels turn toward the room (`DIRS`). */
  facing: string;
  /** The gap between items in the row, metres. */
  gap: number;
}

/** A rackable item, from its `rackable` kind's metadata and its body. */
export interface RackItem {
  /** Its width along the row, metres. */
  width: number;
  /** Its depth across the row, metres; four bottom corners must fit the rack. */
  depth: number;
  /** The local face carrying its label, to turn toward the room (`DIRS`). */
  outward: string;
}

/**
 * Where each item stands along the rack's row, in the rack's frame: its
 * centre's x along the row (y = the rack's plane), and its yaw turning its
 * `outward` face toward the rack's `facing` (given by the caller's
 * convention).
 */
export interface RackPose {
  x: number;
  yaw: number;
}

/**
 * Fit `items` into one compact, centred row with `add` placed at a randomly
 * chosen end (mission 206): the items already on the rack keep their order
 * and compact; `add` goes left or right at random; the row is centred. Pure.
 * Returns the row's poses, or `{ ok: false }` when `add`'s depth exceeds the
 * rack's, or the row (widths plus gaps) does not fit its row width.
 */
export function rackRow(
  rack: RackSpec,
  on: readonly RackItem[],
  add: RackItem,
  random: () => number,
  yawFor: (outward: string, facing: string) => number,
): { ok: true; row: RackPose[] } | { ok: false } {
  const all = [...on, add];
  if (all.some((i) => i.depth > rack.rowDepth + 1e-9)) return { ok: false };
  const widths = all.map((i) => i.width);
  const total =
    widths.reduce((a, b) => a + b, 0) + rack.gap * (widths.length - 1);
  if (total > rack.rowWidth + 1e-9) return { ok: false };
  // The new item to a randomly chosen end; the existing keep their order.
  const row = random() < 0.5 ? [add, ...on] : [...on, add];
  const poses: RackPose[] = [];
  let x = -total / 2;
  for (const it of row) {
    poses.push({ x: x + it.width / 2, yaw: yawFor(it.outward, rack.facing) });
    x += it.width + rack.gap;
  }
  return { ok: true, row: poses };
}
