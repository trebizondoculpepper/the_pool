/**
 * Dev8's layout (the Brands and Logos room, `../rooms/brands-room.ts`),
 * worked out from how many brands it has to show: a board for every brand,
 * round the walls and on a row of freestanding double-sided boards down the
 * middle, the room as long as that row needs. Pure logic.
 */

/** Each brand's board, metres, and the height of its middle. */
export const BRAND_PANEL = { w: 2.1, h: 1.5, y: 1.6 };
/** The room's half-width (north to south), metres. */
export const BRANDS_ROOM_HALF_DEPTH = 7;
/** How far a wall board's face stands off the wall's centre line. */
export const WALL_OFF = 0.15 + 0.06;
/** How far each face of a freestanding board stands off its middle. */
export const STAND_OFF = 0.03;
/** The room is never shorter than this either side of its middle. */
const MIN_HALF_LENGTH = 12;
/** Between neighbouring freestanding boards, metres. */
const MIDDLE_GAP = 0.525;
/** A freestanding board's posts and feet reach this far past its edge. */
const POST_REACH = 0.1;
/**
 * Clear floor between the middle row's ends and the end walls, so a board
 * on an end wall can be seen from 3 m in front of it without the end of
 * the row standing edge-on in the view.
 */
const END_CLEAR = 3;
const NORTH_COUNT = 6;
const SOUTH_COUNT = 5;
/** On each end wall, clear of the portal near the west end's south corner. */
const ENDS = [-4.5, -1.5, 1.5];

/** Where a board hangs: its centre line, facing into the room. */
export interface Hang {
  x: number;
  z: number;
  facing: number;
  off: number;
}

export interface BrandsRoomLayout {
  floor: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** The freestanding boards' middles, west to east, on z = 0. */
  middle: number[];
  /** Every board's place, in the order the brands are numbered. */
  hangs: Hang[];
}

/** `count` points spread evenly along `-half … half`, each in its own share. */
const spread = (count: number, half: number) =>
  Array.from(
    { length: count },
    (_, i) => -half + ((i + 0.5) * 2 * half) / count,
  );

/** The boards on the walls, however long the room. */
export const WALL_BOARDS = NORTH_COUNT + SOUTH_COUNT + 2 * ENDS.length;

/**
 * The room for `brands` brands. Numbered in order walking round: along the
 * north wall from the west, down the east end, back along the south wall,
 * up the west end, each run left to right as it is seen; then the middle
 * row's south faces west to east, and its north faces east to west.
 */
export function brandsRoomLayout(brands: number): BrandsRoomLayout {
  const columns = Math.max(0, Math.ceil((brands - WALL_BOARDS) / 2));
  const pitch = BRAND_PANEL.w + MIDDLE_GAP;
  const rowHalf = columns
    ? ((columns - 1) * pitch) / 2 + BRAND_PANEL.w / 2 + POST_REACH
    : 0;
  const half = Math.max(MIN_HALF_LENGTH, Math.ceil(rowHalf + END_CLEAR));
  const floor = {
    minX: -half,
    maxX: half,
    minZ: -BRANDS_ROOM_HALF_DEPTH,
    maxZ: BRANDS_ROOM_HALF_DEPTH,
  };
  const middle = Array.from(
    { length: columns },
    (_, i) => (i - (columns - 1) / 2) * pitch,
  );
  const along = spread(SOUTH_COUNT, half);
  const hangs: Hang[] = [
    ...spread(NORTH_COUNT, half).map((x) => ({
      x,
      z: floor.minZ,
      facing: 0,
      off: WALL_OFF,
    })),
    ...ENDS.map((z) => ({
      x: floor.maxX,
      z,
      facing: -Math.PI / 2,
      off: WALL_OFF,
    })),
    ...[...along]
      .reverse()
      .map((x) => ({ x, z: floor.maxZ, facing: Math.PI, off: WALL_OFF })),
    ...[...ENDS].reverse().map((z) => ({
      x: floor.minX,
      z,
      facing: Math.PI / 2,
      off: WALL_OFF,
    })),
    ...middle.map((x) => ({ x, z: 0, facing: 0, off: STAND_OFF })),
    ...[...middle]
      .reverse()
      .map((x) => ({ x, z: 0, facing: Math.PI, off: STAND_OFF })),
  ];
  return { floor, middle, hangs };
}
