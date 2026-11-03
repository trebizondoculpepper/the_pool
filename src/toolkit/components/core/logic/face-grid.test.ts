import { describe, expect, it } from 'vite-plus/test';
import { faceGrid } from './face-grid';

describe('faceGrid', () => {
  it('places a whole-face region across the full padding box', () => {
    // A 3-column, 2-row grid with padding but no gap: 0.36 × 0.21, pad 0.02.
    const g = faceGrid(0.36, 0.21, {
      pad: 0.02,
      gap: 0,
      rows: [1, 1],
      cols: [1, 1, 1],
      areas: [
        ['all', 'all', 'all'],
        ['all', 'all', 'all'],
      ],
    });
    // content: 0.36−0.04=0.32 wide, 0.21−0.04=0.17 high. One region spans all.
    const all = g.cell('all')!;
    expect(all.cx).toBe(0);
    expect(all.cy).toBe(0);
    expect(all.w).toBeCloseTo(0.32, 12);
    expect(all.h).toBeCloseTo(0.17, 12);
    expect(g.cells).toHaveLength(1);
  });

  it('lays out separate regions with gap between tracks', () => {
    // 0.36 × 0.21, no pad, gap 0.01, rows [1,1], cols [1,1,1].
    const g = faceGrid(0.36, 0.21, {
      pad: 0,
      gap: 0.01,
      rows: [1, 1],
      cols: [1, 1, 1],
      areas: [
        ['a', 'a', 'b'],
        ['c', 'd', 'e'],
      ],
    });
    // content 0.36 wide, 0.21 high.
    // colW = (0.36 − 2·0.01)/3 = 0.1133…; rowH = (0.21 − 0.01)/2 = 0.10.
    const colW = (0.36 - 2 * 0.01) / 3;
    const rowH = (0.21 - 0.01) / 2;
    // a: row 0, cols 0..1 → left −0.18, top 0.105, w 2·colW+0.01, h 0.10.
    const a = g.cell('a')!;
    expect(a.w).toBeCloseTo(2 * colW + 0.01, 12);
    expect(a.h).toBeCloseTo(0.1, 12);
    expect(a.cx).toBeCloseTo(-0.18 + a.w / 2, 12);
    expect(a.cy).toBeCloseTo(0.105 - rowH / 2, 12);
    // b: row 0, col 2.
    const b = g.cell('b')!;
    expect(b.cx).toBeCloseTo(-0.18 + 2 * colW + 2 * 0.01 + colW / 2, 12);
    // c: row 1, col 0 → below a.
    const c = g.cell('c')!;
    expect(c.cy).toBeCloseTo(0.105 - rowH - 0.01 - rowH / 2, 12);
    expect(c.cx).toBeCloseTo(-0.18 + colW / 2, 12);
    expect(g.cells).toHaveLength(5);
  });

  it('derives every region from its span: the top and bottom text bands, the rest subdivided', () => {
    // The mission 146 controller face: top and bottom bands over a middle
    // that splits into readouts and three dials, all inside a 0.36 × 0.21
    // fascia. Regions are the ones the face places components into.
    const g = faceGrid(0.36, 0.21, {
      rows: [1, 1, 1, 1],
      cols: [1],
      areas: [['head'], ['rset'], ['d1'], ['valve']],
    });
    // One column: every region spans the full width, heights equal.
    const rows = g.cells;
    expect(rows.map((c) => c.name)).toEqual(['head', 'rset', 'd1', 'valve']);
    const head = g.cell('head')!;
    const valve = g.cell('valve')!;
    expect(head.cx).toBe(0);
    expect(head.cy).toBeGreaterThan(0);
    expect(valve.cy).toBeLessThan(0);
    // Equal flexible rows ⇒ equal heights, one column ⇒ same width.
    expect(head.h).toBeCloseTo(valve.h, 12);
    expect(head.w).toBeCloseTo(valve.w, 12);
  });

  it('lets readouts share a half and dials three equal columns of the middle', () => {
    // 0.36 × 0.21 fascia, the 4-row × 6-column controller face.
    const g = faceGrid(0.36, 0.21, {
      rows: [1, 1, 1, 1],
      cols: [1, 1, 1, 1, 1, 1],
      areas: [
        ['logo', 'logo', 'name', 'name', 'name', 'name'],
        ['rset', 'rset', 'rset', 'ract', 'ract', 'ract'],
        ['d1', 'd1', 'd2', 'd2', 'd3', 'd3'],
        ['valve', 'valve', 'valve', 'brand', 'brand', 'brand'],
      ],
    });
    // The three dials must be equal and centred about the middle.
    const d1 = g.cell('d1')!;
    const d2 = g.cell('d2')!;
    const d3 = g.cell('d3')!;
    expect(d1.h).toBeCloseTo(d2.h, 12);
    expect(d1.w).toBeCloseTo(d2.w, 12);
    expect(d2.w).toBeCloseTo(d3.w, 12);
    expect(d2.cx).toBeCloseTo(0, 12);
    expect(d1.cx).toBeCloseTo(-d3.cx, 12);
    // The readout halves are equal and the logo is top-left of the name.
    expect(g.cell('rset')!.w).toBeCloseTo(g.cell('ract')!.w, 12);
    const logo = g.cell('logo')!;
    const name = g.cell('name')!;
    expect(logo.cx).toBeLessThan(name.cx);
    expect(logo.cy).toBeCloseTo(name.cy, 12);
  });

  it('rejects an area whose rows or columns disagree with the tracks', () => {
    expect(() =>
      faceGrid(0.36, 0.21, {
        rows: [1, 1],
        cols: [1, 1, 1],
        areas: [['a', 'a']],
      }),
    ).toThrow(/area rows for 2 grid rows/);
  });

  it('rejects a region that is not one filled rectangle (an L shape)', () => {
    expect(() =>
      faceGrid(0.36, 0.21, {
        rows: [1, 1],
        cols: [1, 1, 1],
        areas: [
          ['a', 'a', 'b'],
          ['a', 'c', 'c'],
        ],
      }),
    ).toThrow(/'a' is not one filled rectangle/);
  });

  it('gives undefined for a name that is not in the grid', () => {
    const g = faceGrid(0.36, 0.21, {
      rows: [1, 1],
      cols: [1, 1],
      areas: [
        ['a', 'a'],
        ['b', 'c'],
      ],
    });
    expect(g.cell('missing')).toBeUndefined();
  });

  it('treats dots as unused cells', () => {
    const g = faceGrid(0.36, 0.21, {
      rows: [1, 1],
      cols: [1, 1, 1],
      areas: [
        ['a', '.', 'b'],
        ['c', 'c', 'c'],
      ],
    });
    expect(g.cells.map((c) => c.name)).toEqual(['a', 'b', 'c']);
  });
});
