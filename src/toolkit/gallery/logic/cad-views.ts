/**
 * The CAD drawing sheet's pure parts (the owner, 2026-11-02; missions 130
 * and 133): the grid styles the magic room and the CAD views draw, and
 * where their lines fall so they measure world metres.
 */

/** One level of ruling: lines `perMetre` to the metre, `pixels` wide on a tile. */
export interface GridLevel {
  perMetre: number;
  pixels: number;
  colour: string;
}

/** A grid style: one metre-square tile, its ground and its levels, finest first. */
export interface GridStyle {
  pixelsPerMetre: number;
  ground: string;
  levels: readonly GridLevel[];
}

/** The CAD grid: light grey, 1 m major squares, 10 cm minor lines fainter. */
export const CAD_GRID: GridStyle = {
  pixelsPerMetre: 512,
  ground: '#dcdedf',
  levels: [
    { perMetre: 10, pixels: 2, colour: '#b9bdc0' },
    { perMetre: 1, pixels: 6, colour: '#6c7378' },
  ],
};

/**
 * Graph paper, for the wall a wall-mounted item hangs on (the owner,
 * 2026-11-02): pale paper, blue-grey lines every centimetre, heavier
 * every 10 cm and heaviest every metre.
 */
export const GRAPH_PAPER: GridStyle = {
  pixelsPerMetre: 2000,
  ground: '#f3f1e6',
  levels: [
    { perMetre: 100, pixels: 2, colour: '#c6d0d8' },
    { perMetre: 10, pixels: 5, colour: '#8197aa' },
    { perMetre: 1, pixels: 10, colour: '#3f5870' },
  ],
};

/** Where a level's lines fall on a tile of `px` pixels: 0 and each pitch after, rounded. */
export function gridLinePixels(px: number, perMetre: number): number[] {
  return Array.from({ length: perMetre }, (_, i) =>
    Math.round((i * px) / perMetre),
  );
}

/**
 * The texture offset, in tiles, that puts a tile's edge on every whole
 * world metre for a plane whose texture starts at world coordinate `start`
 * and repeats once a metre (texture coordinate `x - start + offset`): the
 * fraction of `start`, in [0, 1), so the coordinate is `x - floor(start)`.
 */
export function gridOffset(start: number): number {
  return start - Math.floor(start);
}
