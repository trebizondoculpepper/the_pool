import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import { RETIRED_ROOMS, retiredFrom } from './retired-rooms';
import { cabinetBalanceTank, cabinetPipes } from './cabinet-pipes';

describe('retired1, the jacuzzi plant room before its re-plumbing (2026-10-25)', () => {
  it('keeps its layout and its cabinet runs, whatever the generators do now', () => {
    expect(retiredFrom('retired1')).toBe('plant_pool_03');
    expect(layoutRoom('retired1')).toBe(RETIRED_ROOMS.retired1.layout);
    expect(cabinetPipes('retired1')).toBe(RETIRED_ROOMS.retired1.cabinetRuns);
    expect(cabinetPipes('retired1')).toHaveLength(16);
    expect(cabinetBalanceTank('retired1')).not.toBeNull();
  });
});
