import { describe, expect, it } from 'vite-plus/test';
import { simGraph } from './index';

describe('relations', () => {
  const r = simGraph().relations;
  it('resolves the drain valve’s handle to its fitting', () => {
    expect(
      r.controls.some(
        (c) =>
          c.target === 'plant_pool_03/fitting:jacuzzi.drain' &&
          c.named === 'fitting:jacuzzi.drain',
      ),
    ).toBe(true);
  });
  it('reads a valve’s position lamp, and leaves an unknown reading unknown', () => {
    expect(
      r.readings.some(
        (x) => x.target === 'plant_pool_03/fitting:jacuzzi.drain',
      ),
    ).toBe(true);
    expect(r.readings.some((x) => x.target === 'unknown')).toBe(true);
  });
  it('gives ACCEPT and RESET in both control rooms to every window', () => {
    const on = r.controls.filter(
      (c) => c.target === 'control_room/alarm:mains-fail',
    );
    expect(
      new Set(on.map((c) => `${c.control.room} ${c.control.label}`)),
    ).toEqual(
      new Set([
        'control_room ACCEPT',
        'control_room RESET',
        'bridge ACCEPT',
        'bridge RESET',
      ]),
    );
  });
});
