import { expect, test } from 'vite-plus/test';
import { THROW_REBOUND_KEEP, THROW_SPEED, launch, stepThrow } from './throw';

const fly = (
  start: ReturnType<typeof launch>,
  solids = [] as { minX: number; maxX: number; minZ: number; maxZ: number }[],
  floor = 0,
) => {
  let s = start;
  const path = [s];
  for (let i = 0; i < 1000 && s.y > floor; i++) {
    s = stepThrow(s, 1 / 120, solids, 0.05);
    path.push(s);
  }
  return { end: s, path };
};

test('a throw leaves at the one fixed speed along the aim', () => {
  const s = launch({ x: 0, y: 1.4, z: 0 }, { x: 0, y: 0, z: -2 });
  expect(Math.hypot(s.vx, s.vy, s.vz)).toBeCloseTo(THROW_SPEED);
  expect(s.vz).toBeLessThan(0);
});

test('it follows a parabola to the floor: level, a couple of metres; aimed down, a short drop', () => {
  const level = fly(launch({ x: 0, y: 1.4, z: 0 }, { x: 0, y: 0, z: -1 })).end;
  expect(-level.z).toBeGreaterThan(1.2);
  expect(-level.z).toBeLessThan(2.5);
  const down = fly(
    launch({ x: 0, y: 1.4, z: 0 }, { x: 0, y: -1, z: -0.3 }),
  ).end;
  expect(-down.z).toBeLessThan(0.5);
});

test('it rebounds off a solid side, losing speed, and never passes into it', () => {
  const wall = { minX: -5, maxX: 5, minZ: -1.1, maxZ: -1 };
  const { end, path } = fly(
    launch({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 0.3, z: -1 }),
    [wall],
  );
  expect(end.rebounds).toBe(1);
  expect(end.z).toBeGreaterThan(-1);
  for (const p of path) expect(p.z).toBeGreaterThanOrEqual(-1 + 0.05 - 1e-9);
  // After the rebound it travels back, slower.
  const after = path.find((p) => p.rebounds === 1)!;
  expect(after.vz).toBeGreaterThan(0);
  expect(Math.abs(after.vz)).toBeLessThanOrEqual(
    THROW_SPEED * THROW_REBOUND_KEEP + 1e-9,
  );
});
