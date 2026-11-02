import { describe, expect, it } from 'vite-plus/test';
import {
  MIN_CLEARANCE,
  MIN_HEIGHT,
  MIN_SIDE,
  clearanceFor,
  magicRoomLayout,
  walkable,
} from './magic-room-layout';
import type { ItemSize, MagicRoomLayout } from './magic-room-layout';

/** Whether a walker can go all the way round the item's footprint. */
function canWalkRound(l: MagicRoomLayout) {
  const s = l.solids[0];
  const out = 0.4;
  const ring = [
    [s.minX - out, s.minZ - out],
    [s.maxX + out, s.minZ - out],
    [s.maxX + out, s.maxZ + out],
    [s.minX - out, s.maxZ + out],
  ];
  // Every corner of a ring just outside it is walkable, and the room's
  // sides beside it too (the signpost stands only at its front right).
  return ring.every(([x, z]) => walkable(l, x, z));
}

describe('magicRoomLayout', () => {
  it('gives the smallest item a room you can walk round', () => {
    const l = magicRoomLayout({
      w: 0.1,
      d: 0.05,
      h: 0.1,
      mount: 'wall',
      y: 1.4,
    });
    expect(2 * l.halfX).toBeGreaterThanOrEqual(MIN_SIDE);
    expect(2 * l.halfZ).toBeGreaterThanOrEqual(MIN_SIDE);
    expect(l.height).toBeGreaterThanOrEqual(MIN_HEIGHT);
    expect(canWalkRound(l)).toBe(true);
  });

  it('gives a large item a large room, with more clearance', () => {
    const boiler: ItemSize = { w: 4.2, d: 1.4, h: 2.1, mount: 'floor' };
    const l = magicRoomLayout(boiler, { panel: true });
    expect(clearanceFor(boiler)).toBeGreaterThan(MIN_CLEARANCE);
    expect(l.halfX).toBeGreaterThan(boiler.w / 2 + clearanceFor(boiler));
    expect(l.halfZ).toBeGreaterThanOrEqual(boiler.d / 2 + clearanceFor(boiler));
    expect(l.height).toBeGreaterThanOrEqual(boiler.h + 1);
    expect(canWalkRound(l)).toBe(true);
  });

  it('caps the extra clearance of a very large item', () => {
    expect(clearanceFor({ w: 40, d: 40, h: 5, mount: 'floor' })).toBe(
      MIN_CLEARANCE + 3,
    );
  });

  it('stands a floor item on the floor in the middle and the walker facing it', () => {
    const l = magicRoomLayout({ w: 1, d: 1, h: 1, mount: 'floor' });
    expect(l.item).toEqual({ x: 0, y: 0, z: 0 });
    expect(l.start.z).toBeGreaterThan(0);
    expect(l.start.yaw).toBe(0);
    expect(walkable(l, l.start.x, l.start.z)).toBe(true);
    expect(walkable(l, 0, 0)).toBe(false);
  });

  it('hangs a wall item on a stub of wall, its back on the stub’s face', () => {
    const size: ItemSize = { w: 0.6, d: 0.2, h: 0.8, mount: 'wall', y: 1.5 };
    const l = magicRoomLayout(size);
    expect(l.stub).toBeDefined();
    expect(l.item.y).toBe(1.5);
    expect(l.item.z).toBeCloseTo(l.stub!.maxZ);
    expect(l.stub!.height).toBeGreaterThanOrEqual(1.5 + 0.4);
    expect(walkable(l, 0, l.stub!.minZ - 0.4)).toBe(true);
  });

  it('hangs a hanging item from the ceiling, high enough to stand under', () => {
    const l = magicRoomLayout({ w: 1, d: 1, h: 0.5, mount: 'hanging' });
    expect(l.item.y).toBe(l.height);
    expect(l.height - 0.5).toBeGreaterThanOrEqual(2.2);
    expect(l.solids).toHaveLength(0);
    expect(walkable(l, 0, 0)).toBe(true);
  });

  it('puts the signpost to the item’s right, clear of it, only with a panel', () => {
    const size: ItemSize = { w: 1, d: 0.6, h: 1.5, mount: 'floor' };
    expect(magicRoomLayout(size).signpost).toBeUndefined();
    const l = magicRoomLayout(size, { panel: true });
    expect(l.signpost!.x).toBeGreaterThan(size.w / 2);
    expect(l.signpost!.x).toBeLessThan(l.halfX - 1);
    expect(l.solids).toHaveLength(2);
    expect(walkable(l, l.signpost!.x, l.signpost!.z)).toBe(false);
  });
});
