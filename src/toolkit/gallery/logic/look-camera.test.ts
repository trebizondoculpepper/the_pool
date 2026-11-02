import { describe, expect, it } from 'vite-plus/test';
import {
  LOOK_LIMITS,
  aim,
  centreOf,
  chooseLook,
  fitDistance,
  lookCandidates,
  neededTan,
} from './look-camera';
import type { LookInput } from './look-camera';

const DEG = Math.PI / 180;
/** A cabinet 0.6 wide, 1.8 tall, 0.4 deep, its front facing south (+z). */
const cabinet: LookInput = {
  box: { min: { x: -0.3, y: 0, z: -0.2 }, max: { x: 0.3, y: 1.8, z: 0.2 } },
  front: { x: 0, y: 0, z: 1 },
  mode: 'front',
  fit: 0.8,
  fov: 60,
  aspect: 16 / 9,
  room: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
  floorY: 0,
};

describe('fitting', () => {
  it('fills fit in its tighter dimension and no more in the other', () => {
    const d = fitDistance(cabinet.box, { x: 0, y: 0, z: 1 }, 0.8, 60, 16 / 9);
    const eye = { x: 0, y: 0.9, z: d };
    // At the fit distance the needed half-angle is the field of view's.
    expect(neededTan(cabinet.box, eye, 0.8, 16 / 9)).toBeCloseTo(
      Math.tan(30 * DEG),
      4,
    );
    // Tall and narrow: the height is the tighter; the width fills less.
    const tan = Math.tan(30 * DEG);
    const widthShare = neededTan(cabinet.box, eye, 1, 1) / (16 / 9) / tan;
    expect(widthShare).toBeLessThan(0.8);
  });

  it('aims the pitch at the centre', () => {
    const [front] = lookCandidates(cabinet);
    const centre = centreOf(cabinet.box);
    const expected = Math.atan2(
      centre.y - front.y,
      Math.hypot(front.x - centre.x, front.z - centre.z),
    );
    expect(front.pitch).toBeCloseTo(expected, 6);
    expect(front.yaw).toBeCloseTo(aim(front, centre).yaw, 6);
    // Standing south of it, it looks north.
    expect(Math.abs(front.yaw)).toBeLessThan(1e-6);
  });

  it('a camera pulled nearer widens its zoom rather than cropping', () => {
    const tight = {
      ...cabinet,
      room: { minX: -5, maxX: 5, minZ: -5, maxZ: 1 },
    };
    const [front] = lookCandidates(tight);
    expect(front.z).toBeLessThanOrEqual(1 - LOOK_LIMITS.radius + 1e-9);
    expect(front.zoom).toBeLessThan(1);
    const [free] = lookCandidates(cabinet);
    expect(free.zoom).toBeCloseTo(1, 1);
  });
});

describe('candidates', () => {
  it('stay inside the room rectangle', () => {
    for (const mode of ['front', 'left', 'right', 'room', 'above'] as const) {
      const input = {
        ...cabinet,
        mode,
        room: { minX: -1.5, maxX: 1.5, minZ: -1, maxZ: 1.2 },
      };
      for (const c of lookCandidates(input)) {
        expect(c.x).toBeGreaterThanOrEqual(-1.5 + LOOK_LIMITS.radius - 1e-9);
        expect(c.x).toBeLessThanOrEqual(1.5 - LOOK_LIMITS.radius + 1e-9);
        expect(c.z).toBeGreaterThanOrEqual(-1 + LOOK_LIMITS.radius - 1e-9);
        expect(c.z).toBeLessThanOrEqual(1.2 - LOOK_LIMITS.radius + 1e-9);
        expect(c.y).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(c.y).toBeLessThanOrEqual(2.2 + 1e-9);
      }
    }
  });

  it('left and right are symmetric', () => {
    const [left] = lookCandidates({ ...cabinet, mode: 'left' });
    const [right] = lookCandidates({ ...cabinet, mode: 'right' });
    expect(left.x).toBeCloseTo(-right.x, 6);
    expect(left.z).toBeCloseTo(right.z, 6);
    expect(left.yaw).toBeCloseTo(-right.yaw, 6);
    // Facing north at it, its left is west.
    expect(left.x).toBeLessThan(0);
  });

  it('above looks down at 45°', () => {
    const low = {
      ...cabinet,
      box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 0.4, z: 0.3 } },
      mode: 'above' as const,
    };
    const [above] = lookCandidates(low);
    expect(above.pitch).toBeCloseTo(-45 * DEG, 1);
  });

  it('room looks from the middle of the room', () => {
    const [room] = lookCandidates({
      ...cabinet,
      mode: 'room',
      box: { min: { x: 3, y: 0, z: 3 }, max: { x: 3.6, y: 1.8, z: 3.4 } },
    });
    expect(room.label).toBe('room');
    expect(room.x).toBe(0);
    expect(room.z).toBe(0);
  });

  it('are the same twice', () => {
    expect(lookCandidates(cabinet)).toEqual(lookCandidates(cabinet));
  });
});

describe('choosing', () => {
  it('takes the first that sees 8 of 9', () => {
    expect(
      chooseLook([
        { walkable: false, seen: 9 },
        { walkable: true, seen: 7 },
        { walkable: true, seen: 8 },
      ]),
    ).toEqual({ index: 2, noclip: false, warnings: [] });
  });

  it('takes the asked mode on a tie, with a warning', () => {
    const choice = chooseLook([
      { walkable: true, seen: 5 },
      { walkable: true, seen: 5 },
    ]);
    expect(choice.index).toBe(0);
    expect(choice.warnings).toHaveLength(1);
  });

  it('falls back to the free camera when none walks', () => {
    const choice = chooseLook([{ walkable: false, seen: 9 }]);
    expect(choice.noclip).toBe(true);
  });
});
