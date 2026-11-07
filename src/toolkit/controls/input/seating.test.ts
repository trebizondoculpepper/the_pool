import { describe, expect, it } from 'vite-plus/test';
import { Group, Mesh } from 'three';
import { declareSeat, seatDeclared, seatOfHit } from './seating';

/**
 * The seat a use lands on (mission 161, step 2's resolver): the chair a
 * thing the aim met belongs to, walked the same way for the cue and the
 * click, so they cannot disagree about what is a seat.
 */

describe('the seat a thing the aim met belongs to', () => {
  it('the chair itself, when the hit is the chair', () => {
    const chair = new Group();
    const returned = declareSeat(chair, { height: 0.45 });
    expect(returned).toBe(chair); // declareSeat returns the chair it marked.
    const found = seatOfHit(chair);
    expect(found?.chair).toBe(chair);
    expect(found?.seat).toEqual({ height: 0.45 });
  });

  it('a part of the chair (a mesh the ray met) walks up to the chair', () => {
    const chair = new Group();
    declareSeat(chair, { height: 0.45 });
    const leg = new Mesh();
    chair.add(leg);
    const found = seatOfHit(leg);
    expect(found?.chair).toBe(chair);
    expect(found?.seat.height).toBe(0.45);
  });

  it('the nearest declared seat wins (a nested one)', () => {
    const room = new Group();
    const chair = new Group();
    declareSeat(chair, { height: 0.45 });
    room.add(chair);
    const cushion = new Group();
    declareSeat(cushion, { height: 0.5 });
    chair.add(cushion);
    const found = seatOfHit(cushion);
    expect(found?.chair).toBe(cushion);
    // The chair behind the cushion is still found from the chair's own mesh.
    expect(seatOfHit(chair)?.chair).toBe(chair);
  });

  it('no seat anywhere up the chain: null (a decoration)', () => {
    const scene = new Group();
    const desk = new Group();
    scene.add(desk);
    const drawer = new Mesh();
    desk.add(drawer);
    expect(seatOfHit(drawer)).toBeNull();
    expect(seatDeclared(drawer)).toBeNull();
  });
});
