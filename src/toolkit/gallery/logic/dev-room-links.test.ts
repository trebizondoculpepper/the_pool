import { describe, expect, it } from 'vite-plus/test';
import {
  CHAIN,
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  DEV_ROOMS,
  ROOMS,
  ROOM_ALIASES,
  devPortals,
  devWalls,
  resolveRoomId,
} from './dev-room-links';
import { slide } from '../../controls/logic/walk-collision';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
describe('the rooms', () => {
  it('lead every room in the chain back to dev59, its hub', () => {
    for (const id of CHAIN) {
      const to = devPortals(id, bounds, 1).map((p) => p.to);
      expect(to).toEqual(
        id === 'dev59' ? [] : id === 'dev16' ? ['dev59', 'dev18'] : ['dev59'],
      );
    }
  });

  it('opens the security office off dev16, and nowhere else', () => {
    expect(devPortals('dev18', bounds, 1).map((p) => p.to)).toEqual(['dev16']);
    expect(CHAIN).not.toContain('dev18');
    expect(ROOMS).toContain('dev18');
  });

  it('keeps PR_A, its dry stair and round room distinct without doors', () => {
    expect(devPortals('PR_A', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_UP', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_ROUND', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_ARCH', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_STEPS', bounds, 1)).toEqual([]);
    expect(
      ROOMS.filter((id) => id.startsWith('PR_') || id.startsWith('CR_')),
    ).toEqual([
      'PR_A',
      'CR_A_UP',
      'CR_A_ROUND',
      'CR_A_ARCH',
      'CR_A_STEPS',
      'CR_GREEN_STAIR',
    ]);
  });

  it('gives every room a name and a portal colour', () => {
    for (const id of ROOMS) {
      expect(DEV_ROOM_NAMES[id]).toBeTruthy();
      expect(DEV_ROOM_COLOURS[id]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('resolves only the rooms it has', () => {
    expect(resolveRoomId('dev7')).toBe('dev7');
    expect(resolveRoomId('nowhere')).toBeUndefined();
  });

  it('gives every dev room a number, and may give it a name', () => {
    const dev = ROOMS.filter((id) => id.startsWith('dev'));
    expect(dev).toEqual(expect.arrayContaining([...DEV_ROOMS]));
    for (const id of dev) {
      expect(id).toMatch(/^dev\d+[a-z]?(_\d+)?$/);
      expect(DEV_ROOM_NAMES[id]).toMatch(
        new RegExp(`^${id.replace(/_\d+$/, '').toUpperCase()}( · |$)`),
      );
    }
  });

  it('resolves every old name to the numbered room it became', () => {
    expect(Object.keys(ROOM_ALIASES).sort()).toEqual(
      [
        'dev_air',
        'dev_balance',
        'dev_boiler',
        'dev_chemicals',
        'dev_control',
        'dev_corridor',
        'dev_courtyard',
        'dev_dosing',
        'dev_electrical',
        'dev_ozone',
        'dev_pumps',
      ].sort(),
    );
    for (const [old, id] of Object.entries(ROOM_ALIASES)) {
      expect(ROOMS).not.toContain(old);
      expect(ROOMS).toContain(id);
      expect(resolveRoomId(old)).toBe(id);
    }
    expect(resolveRoomId('dev_boiler')).toBe('dev65');
    expect(DEV_ROOM_NAMES.dev65).toBe('DEV65 · BOILER ROOM');
    expect(resolveRoomId('toString')).toBeUndefined();
  });

  it('have solid walls all round, portals or none', () => {
    const walls = devWalls(bounds, 1, 3.2);
    const [west] = devPortals('dev1', bounds, 1);
    expect(slide(walls, -4, west.z, -2, 0, 0.25).x).toBeGreaterThan(-5);
    expect(slide(walls, 4, 0, 2, 0, 0.25).x).toBeLessThan(5);
  });
});
