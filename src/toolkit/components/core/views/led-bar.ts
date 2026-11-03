import { BoxGeometry, Group, Mesh } from 'three';
import type { PanelKit } from './eighties-controls';
import { kitGlow, kitPaint } from './eighties-controls';

/**
 * A reusable indicator: a horizontal row of LED segments lit by count (the
 * Soft Starter's bar, or this mission's valve-open bar). Built in metres,
 * facing +z, the row centred on the group's origin; the caller positions
 * the `group`, adds it to its face, and calls `setLit(n)` as the value
 * changes. A repeating pattern, given its own component (the owner,
 * 2026-11-03).
 */
export interface LedBar {
  /** The whole bar; position and parent this on the face. */
  group: Group;
  /** The segments, so a caller can name them for the inspector. */
  segments: Mesh[];
  /** Light `n` segments (0..`segments.length`). */
  setLit(n: number): void;
}

export function createLedBar(
  kit: PanelKit,
  options: {
    /** How many LEDs across the row. Default 10. */
    segments?: number;
    /** How many are lit to start. Default 0. */
    lit?: number;
    /** The lit colour. Default the Soft Starter's amber. */
    on?: string;
    /** The unlit colour. Default a dark, off-lamp perspex. */
    off?: string;
    /** The row's whole width in metres (first to last segment centres). */
    width?: number;
    /** Each segment's width in metres. Default 0.005. */
    segW?: number;
    /** Each segment's height in metres. Default 0.011. */
    segH?: number;
  } = {},
): LedBar {
  const n = options.segments ?? 10;
  const onMat = kitGlow(kit, options.on ?? '#ffb22a');
  const offMat = kitPaint(kit, options.off ?? '#3a3226');
  const segW = options.segW ?? 0.005;
  const segH = options.segH ?? 0.011;
  const width = options.width ?? segW * n;
  const pitch = n > 1 ? (width - segW) / (n - 1) : 0;
  const group = new Group();
  const segments = Array.from({ length: n }, (_, i) => {
    const seg = new Mesh(new BoxGeometry(segW, segH, 0.003), offMat);
    seg.position.x = -width / 2 + segW / 2 + i * pitch;
    group.add(seg);
    return seg;
  });
  const setLit = (count: number) => {
    segments.forEach((seg, i) => {
      seg.material = i < count ? onMat : offMat;
    });
  };
  setLit(options.lit ?? 0);
  return { group, segments, setLit };
}
