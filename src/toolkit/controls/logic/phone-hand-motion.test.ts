import { describe, expect, it } from 'vite-plus/test';
import { phoneHandMotion, phoneWalkActivity } from './phone-hand-motion';

describe('handheld phone motion', () => {
  it('is bounded across idle and walking poses', () => {
    let translation = 0;
    let rotation = 0;
    for (let tick = 0; tick < 3000; tick++) {
      const pose = phoneHandMotion(tick / 30, tick % 2);
      for (const value of [pose.x, pose.y, pose.z])
        translation = Math.max(translation, Math.abs(value));
      for (const value of [pose.pitch, pose.yaw, pose.roll])
        rotation = Math.max(rotation, Math.abs(value));
    }
    expect(translation).toBeLessThan(0.008);
    expect(rotation).toBeLessThan((0.5 * Math.PI) / 180);
  });

  it('depends on time and activity, not frame history', () => {
    expect(phoneHandMotion(12.5, 0.6)).toEqual(phoneHandMotion(12.5, 0.6));
    expect(phoneHandMotion(12.5, 0.6)).not.toEqual(phoneHandMotion(12.6, 0.6));
    expect(phoneHandMotion(12.5, 0)).not.toEqual(phoneHandMotion(12.5, 1));
  });

  it('stays steady when reduced motion is requested', () => {
    expect(phoneHandMotion(31, 1, true)).toEqual({
      x: 0,
      y: 0,
      z: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
    });
  });

  it('settles after walking at the same rate across frame sizes', () => {
    let fine = 0;
    for (let frame = 0; frame < 60; frame++)
      fine = phoneWalkActivity(fine, 1, 1 / 60);
    expect(fine).toBeCloseTo(phoneWalkActivity(0, 1, 1), 8);
    expect(phoneWalkActivity(fine, 0, 1)).toBeLessThan(0.001);
  });
});
