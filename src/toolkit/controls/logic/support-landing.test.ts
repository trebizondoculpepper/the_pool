import { expect, it } from 'vite-plus/test';
import { landingGround } from './support-landing';

// A desk 1.6 by 0.8 m, its top 0.73 m up.
const desk = { minX: -0.8, maxX: 0.8, minZ: -0.4, maxZ: 0.4, top: 0.73 };

it('puts a thing let go above a top on it', () => {
  expect(landingGround([desk], 0, 0, 0.9, 0)).toBeCloseTo(0.73);
});

it('puts a thing held low over a top, partly below it, on it (the owner’s bug)', () => {
  // A box 0.2 m tall, its bottom 0.65 m up: its bottom is under the top.
  const release = { x: 0.1, z: 0, top: 0.85 };
  expect(landingGround([desk], 0.1, 0, 0.65, 0, release)).toBeCloseTo(0.73);
});

it('lets a thing let go wholly under a top fall to the floor', () => {
  const release = { x: 0, z: 0, top: 0.5 };
  expect(landingGround([desk], 0, 0, 0.3, 0, release)).toBe(0);
});

it('never lifts a thing onto a top from beside it', () => {
  // Let go beside the desk, low; sliding under its edge later.
  const release = { x: 1.2, z: 0, top: 0.85 };
  expect(landingGround([desk], 0.7, 0, 0.65, 0, release)).toBe(0);
});

it('lets a thing whose middle is past a top’s edge fall to the floor (the owner, 2026-11-05)', () => {
  // A box 0.3 m long let go above the desk's edge, mostly over the desk
  // but its middle (its centre of gravity) 1 cm past the edge.
  const release = { x: 0.81, z: 0, top: 0.95 };
  expect(landingGround([desk], 0.81, 0, 0.8, 0, release)).toBe(0);
  // Its middle 1 cm inside the edge: it stays on the desk.
  const inside = { x: 0.79, z: 0, top: 0.95 };
  expect(landingGround([desk], 0.79, 0, 0.8, 0, inside)).toBeCloseTo(0.73);
});
