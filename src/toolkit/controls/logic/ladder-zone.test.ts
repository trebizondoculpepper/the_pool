import { describe, expect, it } from 'vite-plus/test';
import {
  climb,
  ladderMountPose,
  ladderToUse,
  LADDER_MOUNT_SECONDS,
  yawFacingLadder,
} from './ladder-zone';

const zone = {
  minX: 1.75,
  maxX: 2.35,
  minZ: 0.5,
  maxZ: 1.3,
  bottom: -3.5,
  top: 0,
  bottomExit: { x: 2.25, z: 0.9 },
  topExit: { x: 1.6, z: 0.9 },
  rung: { x: 2, z: 0.9 },
};

describe('ladder controls', () => {
  it('mounts with Use only when near an end at the right height', () => {
    expect(ladderToUse([zone], 2.3, -3.5, 0.9, 1)).toEqual({
      zone,
      end: 'bottom',
    });
    expect(ladderToUse([zone], 1.6, 0, 0.9, 1)).toEqual({
      zone,
      end: 'top',
    });
    expect(ladderToUse([zone], 2.7, 0, 0.9, 1)).toBeNull();
    expect(ladderToUse([zone], 4, -3.5, 0.9, 1)).toBeNull();
  });

  it('can close the upper entry while preserving escape from below', () => {
    const maintenance = { ...zone, canUseTop: false };
    expect(ladderToUse([maintenance], 1.6, 0, 0.9, 1)).toBeNull();
    expect(ladderToUse([maintenance], 2.25, -3.5, 0.9, 1)?.end).toBe('bottom');
  });

  it('climbs with W and descends with S independent of view pitch', () => {
    expect(climb(zone, -2, 1, 1, 1)).toBeCloseTo(-1.1);
    expect(climb(zone, -2, -1, 1, 1)).toBeCloseTo(-2.9);
    expect(climb(zone, -2, 0, 1, 1)).toBe(-2);
  });

  it('stops at the ends', () => {
    expect(climb(zone, -0.2, 1, 10, 1)).toBe(0);
    expect(climb(zone, -3.3, -1, 10, 1)).toBe(-3.5);
  });
});

describe('stepping onto a ladder (eased)', () => {
  const from = { x: 0, z: 0, y: 0, yaw: 0 };
  const to = { x: 1, z: 2, y: 0.5, yaw: Math.PI / 2 };
  it('starts where the walker stood and ends on the ladder', () => {
    expect(ladderMountPose(from, to, 0)).toEqual(from);
    expect(ladderMountPose(from, to, 1)).toEqual(to);
    expect(ladderMountPose(from, to, 3)).toEqual(to);
  });
  it('moves steadily on, slowly at each end', () => {
    const xs = [0, 1, 2, 3, 4, 5, 6].map(
      (f) => ladderMountPose(from, to, f / 6).x,
    );
    for (let i = 1; i < xs.length; i++)
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    expect(xs[1] - xs[0]).toBeLessThan(xs[3] - xs[2]);
    expect(xs[6] - xs[5]).toBeLessThan(xs[3] - xs[2]);
  });
  it('turns the shorter way round', () => {
    const half = ladderMountPose(
      { ...from, yaw: 0.1 },
      { ...to, yaw: 2 * Math.PI - 0.1 },
      0.5,
    );
    expect(half.yaw).toBeCloseTo(0, 6);
  });
  it('takes ten frames from the top, six from the foot, at 30 fps', () => {
    expect(LADDER_MOUNT_SECONDS.top).toBeCloseTo(10 / 30);
    expect(LADDER_MOUNT_SECONDS.bottom).toBeCloseTo(6 / 30);
  });
  it('faces the ladder from the climbing line', () => {
    const yaw = yawFacingLadder({
      ...zone,
      rung: { x: 0, z: 0 },
      topExit: { x: 0, z: -1 },
    });
    expect(Math.sin(yaw)).toBeCloseTo(0);
    expect(-Math.cos(yaw)).toBeCloseTo(-1);
  });
});
