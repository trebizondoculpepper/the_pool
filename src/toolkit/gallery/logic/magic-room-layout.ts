/**
 * The magic room's generator (mission 130, `doc/plans/130-item-audit.md`):
 * a plain room sized round one item, the item free in its middle facing
 * the way in (south, +z), on the floor, on a stub of wall or hanging, with
 * room to walk all the way round it, and a signpost for its control panel
 * to its right. Metres, room centred on the origin. Pure.
 */

/** How an item is fixed: standing, on a wall, or hung from the ceiling. */
export type Mount = 'floor' | 'wall' | 'hanging';

export interface ItemSize {
  /** Width (x), depth (z) and height, metres. */
  w: number;
  d: number;
  h: number;
  mount: Mount;
  /** A wall item's middle above the floor, metres. */
  y?: number;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MagicRoomLayout {
  halfX: number;
  halfZ: number;
  height: number;
  /** The item's origin (floor: on the floor at its footprint's middle; wall: its back's middle; hanging: its top's middle), facing +z. */
  item: { x: number; y: number; z: number };
  /** The stub of wall a wall item hangs on, if any: its footprint and height. */
  stub?: Rect & { height: number };
  /** The signpost's foot, facing +z; none when there is no panel. */
  signpost?: { x: number; z: number };
  /** Where the walker starts: by the south wall, facing the item. */
  start: { x: number; z: number; yaw: number };
  /** What the walker cannot walk through, besides the walls. */
  solids: Rect[];
}

/** The walker's radius (as `first-person.ts`'s), metres. */
export const WALKER_RADIUS = 0.175;
/** The least clear way round an item: the walker's width and a margin. */
export const MIN_CLEARANCE = 1.2;
/** The most extra clearance a large item gets, metres. */
export const MAX_EXTRA = 3;
/** The smallest room, metres a side, and its least height. */
export const MIN_SIDE = 4;
export const MIN_HEIGHT = 3;
/** A stub wall's thickness, and a signpost's footprint, metres. */
export const STUB_THICKNESS = 0.2;
export const SIGNPOST = { w: 0.5, d: 0.3, gap: 0.6 };

/**
 * The clearance round an item: at least `MIN_CLEARANCE`, more for a large
 * item (a quarter of its larger plan extent, up to `MAX_EXTRA` more).
 */
export const clearanceFor = (size: ItemSize) =>
  MIN_CLEARANCE + Math.min(MAX_EXTRA, Math.max(size.w, size.d) / 4);

/** The magic room for an item of `size`, with a signpost when it has a panel. */
export function magicRoomLayout(
  size: ItemSize,
  { panel = false }: { panel?: boolean } = {},
): MagicRoomLayout {
  const clear = clearanceFor(size);
  // A wall item hangs on a stub of wall, as wide as it and a little more,
  // which stands in the room so the walker can go behind it.
  const stubW = size.w + 0.2;
  const stubH =
    size.mount === 'wall' ? Math.max(2, (size.y ?? 1.5) + size.h / 2 + 0.2) : 0;
  const planW = size.mount === 'wall' ? Math.max(size.w, stubW) : size.w;
  const planD = size.mount === 'wall' ? size.d + STUB_THICKNESS : size.d;
  // The signpost to the item's right, beside its front.
  const postSpan = panel ? SIGNPOST.gap + SIGNPOST.w : 0;
  const halfX = Math.max(MIN_SIDE / 2, planW / 2 + postSpan + clear);
  const halfZ = Math.max(MIN_SIDE / 2, planD / 2 + clear);
  // Tall enough to stand under a hung item, or to look down on a tall one
  // from a step back: at least a metre over its top.
  const top =
    size.mount === 'wall'
      ? Math.max(stubH, (size.y ?? 1.5) + size.h / 2)
      : size.mount === 'hanging'
        ? 2.2 + size.h
        : size.h;
  const height = Math.max(MIN_HEIGHT, top + 1);
  // Origins, its plan centred on the room's middle.
  const front = planD / 2;
  const item =
    size.mount === 'floor'
      ? { x: 0, y: 0, z: 0 }
      : size.mount === 'wall'
        ? { x: 0, y: size.y ?? 1.5, z: front - size.d }
        : { x: 0, y: height, z: 0 };
  const solids: Rect[] = [];
  let stub: MagicRoomLayout['stub'];
  if (size.mount === 'wall') {
    const back: Rect = {
      minX: -stubW / 2,
      maxX: stubW / 2,
      minZ: -planD / 2,
      maxZ: -planD / 2 + STUB_THICKNESS,
    };
    stub = { ...back, height: stubH };
    // The stub and the item on it, as one.
    solids.push({ ...back, maxZ: planD / 2 });
  } else if (size.mount === 'floor')
    solids.push({
      minX: -size.w / 2,
      maxX: size.w / 2,
      minZ: -size.d / 2,
      maxZ: size.d / 2,
    });
  let signpost: MagicRoomLayout['signpost'];
  if (panel) {
    signpost = {
      x: planW / 2 + SIGNPOST.gap + SIGNPOST.w / 2,
      z: front - SIGNPOST.d / 2,
    };
    solids.push({
      minX: signpost.x - SIGNPOST.w / 2,
      maxX: signpost.x + SIGNPOST.w / 2,
      minZ: signpost.z - SIGNPOST.d / 2,
      maxZ: signpost.z + SIGNPOST.d / 2,
    });
  }
  return {
    halfX,
    halfZ,
    height,
    item,
    ...(stub ? { stub } : {}),
    ...(signpost ? { signpost } : {}),
    // By the south wall, facing north (yaw 0) at the item.
    start: { x: 0, z: halfZ - Math.min(0.8, clear / 2), yaw: 0 },
    solids,
  };
}

/** Whether a walker at (x, z) is clear of every solid and inside the walls. */
export function walkable(layout: MagicRoomLayout, x: number, z: number) {
  const r = WALKER_RADIUS;
  if (Math.abs(x) > layout.halfX - r || Math.abs(z) > layout.halfZ - r)
    return false;
  return layout.solids.every(
    (s) =>
      x + r <= s.minX || x - r >= s.maxX || z + r <= s.minZ || z - r >= s.maxZ,
  );
}
