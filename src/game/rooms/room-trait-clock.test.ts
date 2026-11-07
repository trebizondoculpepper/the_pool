import { describe, expect, it } from 'vite-plus/test';
import { createRoomTraitClock } from './room-trait';

describe('room trait clock (#118)', () => {
  it('steps by the time since the last reading of the same world', () => {
    const clock = createRoomTraitClock();
    const a = {};
    expect(clock.read(a, 10)).toBe(0);
    expect(clock.read(a, 10.5)).toBe(0.5);
    expect(clock.read(a, 12)).toBe(1.5);
  });

  it('re-anchors on a world switch rather than stepping the difference', () => {
    const clock = createRoomTraitClock();
    const saved = {};
    const magic = {};
    clock.read(saved, 5000);
    expect(clock.read(magic, 3)).toBe(0);
    expect(clock.read(magic, 4)).toBe(1);
    expect(clock.read(saved, 5000.2)).toBe(0);
  });

  it('re-anchors after reset, for a new visit', () => {
    const clock = createRoomTraitClock();
    const a = {};
    clock.read(a, 1);
    clock.reset();
    expect(clock.read(a, 100)).toBe(0);
    expect(clock.read(a, 101)).toBe(1);
  });
});
