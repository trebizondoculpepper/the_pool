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

// Mission 133: the item audit page's CAD views.

/** An item's bounds, metres. */
export interface Bounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export type CadViewName = 'top' | 'front' | 'side' | 'perspective';
type Vec = readonly [number, number, number];

/** One view of the sheet: its label, and for the flat ones the way the camera looks and its up. */
export interface CadView {
  name: CadViewName;
  label: string;
  /** Unit vector from the item towards the camera (orthographic views). */
  from?: Vec;
  up?: Vec;
}

/**
 * The four views, as a drawing sheet lays them out (third-angle): TOP
 * looks down with the item's front (+z) at the bottom; FRONT looks at its
 * front along −z; SIDE at its right-hand side, as seen from the front,
 * along −x; PERSPECTIVE off its front right corner.
 */
export const CAD_VIEWS: readonly CadView[] = [
  { name: 'top', label: 'TOP', from: [0, 1, 0], up: [0, 0, -1] },
  { name: 'front', label: 'FRONT', from: [0, 0, 1], up: [0, 1, 0] },
  { name: 'side', label: 'SIDE', from: [1, 0, 0], up: [0, 1, 0] },
  { name: 'perspective', label: 'PERSPECTIVE' },
];

/** Overall sizes, millimetres: width (x), depth (z), height (y). */
export interface Dimensions {
  w: number;
  d: number;
  h: number;
}

export function dimensionsMm(b: Bounds): Dimensions {
  const mm = (v: number) => Math.round(v * 1000);
  return {
    w: mm(b.max.x - b.min.x),
    d: mm(b.max.z - b.min.z),
    h: mm(b.max.y - b.min.y),
  };
}

/** The two sizes a flat view shows, across then up, as its label words them. */
export function viewDimensions(
  view: CadViewName,
  d: Dimensions,
): { across: number; up: number; words: string } | null {
  const pair =
    view === 'top'
      ? { across: d.w, up: d.d }
      : view === 'front'
        ? { across: d.w, up: d.h }
        : view === 'side'
          ? { across: d.d, up: d.h }
          : null;
  return pair && { ...pair, words: `${pair.across} × ${pair.up} mm` };
}

/** The share of a frame left clear round the item, each side. */
export const CAD_MARGIN = 0.12;

/**
 * Pixels to the metre for every flat view of a `pixels`-square frame: the
 * largest that fits the item's biggest size inside the margin, so the
 * three views are to scale with one another.
 */
export function sheetScale(b: Bounds, pixels: number): number {
  const big = Math.max(
    b.max.x - b.min.x,
    b.max.y - b.min.y,
    b.max.z - b.min.z,
    1e-3,
  );
  return (pixels * (1 - 2 * CAD_MARGIN)) / big;
}

const centreOf = (b: Bounds): Vec => [
  (b.min.x + b.max.x) / 2,
  (b.min.y + b.max.y) / 2,
  (b.min.z + b.max.z) / 2,
];

/** A flat view's camera: where it looks, which way is up, and the half width it sees (metres). */
export function orthoFrame(b: Bounds, view: CadView, pixels: number) {
  if (!view.from || !view.up) throw new Error(`${view.name} is not flat`);
  const c = centreOf(b);
  const reach =
    Math.hypot(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) + 1;
  return {
    target: c,
    position: [
      c[0] + view.from[0] * reach,
      c[1] + view.from[1] * reach,
      c[2] + view.from[2] * reach,
    ] as Vec,
    up: view.up,
    half: pixels / 2 / sheetScale(b, pixels),
    near: 0.01,
    far: 2 * reach,
  };
}

/** The longest bar of 1, 2 or 5 × 10ⁿ mm no longer than `maxPixels`. */
export function scaleBar(pixelsPerMetre: number, maxPixels: number) {
  const maxMm = (maxPixels / pixelsPerMetre) * 1000;
  let mm = 1;
  for (let p = 0; p < 7; p++)
    for (const s of [1, 2, 5]) {
      const v = s * 10 ** p;
      if (v <= maxMm) mm = v;
    }
  const pixels = (mm / 1000) * pixelsPerMetre;
  const label = mm >= 1000 ? `${mm / 1000} m` : `${mm} mm`;
  return { mm, pixels, label };
}

/**
 * The perspective camera: off the front right corner, above the centre
 * line, far enough that the bounding sphere fills the field of view.
 */
export function perspectivePose(b: Bounds, fovDeg: number) {
  const c = centreOf(b);
  const radius =
    Math.hypot(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) / 2;
  const distance =
    Math.max(radius, 1e-3) / Math.sin(((fovDeg / 2) * Math.PI) / 180);
  const dir: Vec = [0.62, 0.48, 0.62];
  const n = Math.hypot(...dir);
  return {
    target: c,
    position: [
      c[0] + (dir[0] / n) * distance,
      c[1] + (dir[1] / n) * distance,
      c[2] + (dir[2] / n) * distance,
    ] as Vec,
    near: distance / 50,
    far: distance * 4,
  };
}

/** The drawing code's own version: bump it when the views are drawn differently. */
export const CAD_RENDER_VERSION = 1;

/** A short, stable hash of a list of words and numbers (FNV-1a, 32 bits, hex). */
export function fingerprint(parts: readonly (string | number)[]): string {
  let h = 0x811c9dc5;
  const text = parts
    .map((p) => (typeof p === 'number' ? p.toFixed(5) : p))
    .join('\u0001');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** What drew a kind's views: change any of it and they are drawn afresh. */
export interface CadKeyInput {
  kind: string;
  variant: string;
  version: string;
  build: string;
  /** The builder's identity: a fingerprint of what it built. */
  builder: string;
}

export function cadCacheKey(k: CadKeyInput): string {
  return [
    k.kind,
    k.variant,
    `r${CAD_RENDER_VERSION}`,
    k.version,
    k.build,
    k.builder,
  ].join('|');
}

/** The cache's entry name for a kind and variant (one entry each, replaced when stale). */
export const cadEntryId = (kind: string, variant: string) =>
  `${kind}#${variant}`;

/** Whether a cached entry may be shown: only when it was drawn under exactly this key. */
export function isFresh(
  entry: { key: string } | null | undefined,
  key: string,
): boolean {
  return !!entry && entry.key === key;
}
