import { describe, expect, it } from 'vite-plus/test';
import { BRANDS } from '../../components/core/logic/brands';
import {
  BRAND_PANEL,
  STAND_OFF,
  WALL_BOARDS,
  brandsRoomLayout,
} from './brands-room-layout';

/** A board's extent along its wall or row, and which line it is on. */
const extent = (hang: { x: number; z: number; facing: number }) => {
  const alongX = Math.abs(Math.sin(hang.facing)) < 0.5;
  const centre = alongX ? hang.x : hang.z;
  return {
    line: `${alongX ? 'z' : 'x'}${alongX ? hang.z : hang.x}:${hang.facing.toFixed(2)}`,
    from: centre - BRAND_PANEL.w / 2,
    to: centre + BRAND_PANEL.w / 2,
  };
};

describe("dev8's layout", () => {
  const layout = brandsRoomLayout(BRANDS.length);

  it('gives every brand a board, with at most one spare', () => {
    expect(layout.hangs.length).toBeGreaterThanOrEqual(BRANDS.length);
    expect(layout.hangs.length - BRANDS.length).toBeLessThanOrEqual(1);
  });

  it('keeps every board inside the room, none overlapping on its wall or row', () => {
    const { floor } = layout;
    const lines = new Map<string, { from: number; to: number }[]>();
    for (const hang of layout.hangs) {
      const e = extent(hang);
      const alongX = e.line.startsWith('z');
      const [min, max] = alongX
        ? [floor.minX, floor.maxX]
        : [floor.minZ, floor.maxZ];
      expect(e.from).toBeGreaterThan(min);
      expect(e.to).toBeLessThan(max);
      const others = lines.get(e.line) ?? [];
      for (const o of others)
        expect(e.to <= o.from || e.from >= o.to).toBe(true);
      lines.set(e.line, [...others, e]);
    }
  });

  it('leaves 3 m clear before each end wall, so its boards can be seen', () => {
    const row = layout.hangs.filter((h) => h.off === STAND_OFF);
    const reach =
      Math.max(...row.map((h) => Math.abs(h.x))) + BRAND_PANEL.w / 2;
    expect(layout.floor.maxX - reach).toBeGreaterThanOrEqual(3);
  });

  it('grows the room with the brands, and keeps it 24 m long when few', () => {
    expect(brandsRoomLayout(WALL_BOARDS).floor.maxX).toBe(12);
    expect(brandsRoomLayout(WALL_BOARDS).middle).toHaveLength(0);
    const more = brandsRoomLayout(BRANDS.length + 6);
    expect(more.floor.maxX).toBeGreaterThan(layout.floor.maxX);
    expect(more.hangs.length).toBeGreaterThanOrEqual(BRANDS.length + 6);
  });
});
