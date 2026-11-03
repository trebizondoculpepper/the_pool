/**
 * A face divided like a CSS grid (the owner, 2026-11-03): a rectangle — a
 * controller's fascia, a mimic, a panel — is carved into `rows` and `cols`
 * tracks whose heights/widths are flexible weights (CSS `1fr`), with a
 * `pad` cleared all round and a uniform `gap` between tracks. A `template
 * areas` matrix names each cell; a region may span several cells, and
 * `cell(name)` returns the one region's bounds, centred on the face's
 * (0,0) with +y up (the same space the face builder places meshes in). So
 * a component is dropped into a named region and can never fall off the
 * face: its bounds come from the grid, never from hand-tuned numbers.
 *
 * Pure logic, no DOM or Three.js, tested beside this file. Row 0 is the
 * top of the face; CSS's downward +y maps to the world's −y.
 */
export interface FaceGridDef {
  /** One flexible height weight per row (CSS `1fr`). */
  rows: number[];
  /** One flexible width weight per column (CSS `1fr`). */
  cols: number[];
  /**
   * `rows.length` × `cols.length` region names. `.` (or empty) marks an
   * unused cell. A name's cells must form one filled rectangle (the same
   * rule as CSS `grid-template-areas`).
   */
  areas: string[][];
  /** Metres cleared on every side before the tracks begin. Default 0.012. */
  pad?: number;
  /** Metres of gutter between adjacent tracks. Default 0.006. */
  gap?: number;
}

/** One named region, its centre and size in the face's metres (0,0 centre). */
export interface FaceCell {
  name: string;
  /** World x of the region's centre. */
  cx: number;
  /** World y of the region's centre (0 = the face's centre, +y up). */
  cy: number;
  /** Metres across. */
  w: number;
  /** Metres high. */
  h: number;
}

export interface FaceGrid {
  /** The bounds of a named region, or undefined for a name not in the grid. */
  cell(name: string): FaceCell | undefined;
  /** Every named region (in row-major order of first appearance). */
  cells: FaceCell[];
}

export function faceGrid(w: number, h: number, def: FaceGridDef): FaceGrid {
  if (!(w > 0 && h > 0)) throw new Error('faceGrid: need a positive face');
  const nR = def.rows.length;
  const nC = def.cols.length;
  if (!nR || !nC) throw new Error('faceGrid: need at least one row and column');
  if (def.areas.length !== nR)
    throw new Error(
      `faceGrid: ${def.areas.length} area rows for ${nR} grid rows`,
    );
  for (const r of def.areas)
    if (r.length !== nC)
      throw new Error(
        `faceGrid: an area row has ${r.length} cells for ${nC} columns`,
      );
  if (def.rows.some((rt) => rt <= 0) || def.cols.some((ct) => ct <= 0))
    throw new Error('faceGrid: row and column weights must be positive');

  const pad = def.pad ?? 0.012;
  const gap = def.gap ?? 0.006;
  const contentW = w - 2 * pad;
  const contentH = h - 2 * pad;
  if (contentW <= 0 || contentH <= 0)
    throw new Error('faceGrid: the padding leaves no room for the tracks');

  const totalRow = def.rows.reduce((a, b) => a + b, 0);
  const totalCol = def.cols.reduce((a, b) => a + b, 0);
  const gapRow = gap * (nR - 1);
  const gapCol = gap * (nC - 1);
  const colW = (contentW - gapCol) / totalCol;
  const rowH = (contentH - gapRow) / totalRow;

  // Group the area cells by region name, tracking the extent each covers.
  interface Span {
    name: string;
    minR: number;
    maxR: number;
    minC: number;
    maxC: number;
    count: number;
  }
  const spans = new Map<string, Span>();
  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const name = def.areas[r][c];
      if (!name || name === '.') continue;
      const s = spans.get(name) ?? {
        name,
        minR: r,
        maxR: r,
        minC: c,
        maxC: c,
        count: 0,
      };
      s.minR = Math.min(s.minR, r);
      s.maxR = Math.max(s.maxR, r);
      s.minC = Math.min(s.minC, c);
      s.maxC = Math.max(s.maxC, c);
      s.count++;
      spans.set(name, s);
    }
  }

  const cells: FaceCell[] = [];
  for (const s of spans.values()) {
    const spanR = s.maxR - s.minR + 1;
    const spanC = s.maxC - s.minC + 1;
    if (s.count !== spanR * spanC)
      throw new Error(
        `faceGrid: region '${s.name}' is not one filled rectangle`,
      );
    // Row 0 is the top of the face; the left edge is at −w/2 + pad.
    const left = -w / 2 + pad + s.minC * colW + s.minC * gap;
    const top = h / 2 - pad - s.minR * rowH - s.minR * gap;
    const cellW = spanC * colW + (spanC - 1) * gap;
    const cellH = spanR * rowH + (spanR - 1) * gap;
    cells.push({
      name: s.name,
      cx: left + cellW / 2,
      cy: top - cellH / 2,
      w: cellW,
      h: cellH,
    });
  }

  const byName = new Map(cells.map((c) => [c.name, c]));
  return {
    cells,
    cell: (name: string) => byName.get(name),
  };
}
