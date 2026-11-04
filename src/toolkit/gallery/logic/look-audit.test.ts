import { describe, expect, it } from 'vite-plus/test';
import {
  LOOSE_CUTOFF,
  auditRoom,
  boxGap,
  lookTargets,
  splitsApart,
  summaryOf,
  totalsOf,
  unlabelledGroups,
} from './look-audit';
import type { RoomInventory, ScannedOwner } from './look-audit';
import { objectClass } from './object-class';

const box = (x: number, s = 1) => ({
  min: { x, y: 0, z: 0 },
  max: { x: x + s, y: s, z: s },
});

const inv = (over: Partial<RoomInventory>): RoomInventory => ({
  room: 'test_room',
  hook: true,
  owners: [],
  loose: [],
  hiddenSigns: [],
  fronts: {},
  expected: [],
  controls: [],
  ...over,
});

describe('lookTargets', () => {
  it('groups by tag, then by binding, and folds same-named pieces into their whole', () => {
    const owners: ScannedOwner[] = [
      { tag: 'AB-P1', ancestors: [], box: box(0) },
      { tag: 'AB-P1', ancestors: [], box: box(0.5) },
      { model: { link: 'l1' }, ancestors: [], box: box(3) },
      { model: { link: 'l1' }, name: 'marking', ancestors: [], box: box(3) },
      { name: 'Mimic', ancestors: [], box: box(5) },
      { name: 'Mimic', ancestors: [4], box: box(5, 0.5) },
      { part: { label: 'Start' }, ancestors: [4], box: box(5, 0.1) },
    ];
    const t = lookTargets(owners);
    expect(t.map((x) => x.ref)).toEqual(['AB-P1', 'link:l1', 'Mimic']);
    expect(t[0].members).toEqual([0, 1]);
    expect(t[2].members).toEqual([4, 5]);
  });
});

describe('duplicate tags', () => {
  it('a pipe and its markings, touching, are one; two apart are two', () => {
    expect(boxGap(box(0), box(1))).toBe(0);
    const near = [
      { tag: 'T', ancestors: [], box: box(0) },
      { tag: 'T', ancestors: [], box: box(1.5) },
    ];
    expect(splitsApart(near)).toBe(false);
    const far = [near[0], { tag: 'T', ancestors: [], box: box(5) }];
    expect(splitsApart(far)).toBe(true);
    const bound = [
      { tag: 'T', model: { node: 'a' }, ancestors: [], box: box(0) },
      { tag: 'T', model: { node: 'b' }, ancestors: [], box: box(0) },
    ];
    expect(splitsApart(bound)).toBe(true);
  });
});

describe('unlabelledGroups', () => {
  it('groups under the nearest named ancestor, largest first, the tiny left out', () => {
    const g = unlabelledGroups('r', [
      { under: 'Rack', size: 2, volume: 1 },
      { under: 'Rack', size: 1, volume: 0.5 },
      { under: 'Boiler', size: 3, volume: 6 },
      { under: 'Screw', size: LOOSE_CUTOFF / 2, volume: 0 },
    ]);
    expect(g.map((x) => [x.under, x.meshes])).toEqual([
      ['Boiler', 1],
      ['Rack', 2],
    ]);
  });
});

describe('auditRoom', () => {
  it('reports unreachable, unverified, duplicate names, bad fronts and controls', () => {
    const owners: ScannedOwner[] = [
      { tag: 'TR-P1', ancestors: [], box: box(0) },
      {
        part: { label: 'Start' },
        key: 'start',
        ancestors: [0],
        box: box(0, 0.1),
      },
      { name: 'Exit sign', architectural: true, ancestors: [], box: box(4) },
      { name: 'Lamp', ancestors: [], box: box(6) },
      { name: 'Lamp', ancestors: [], box: box(8) },
    ];
    const a = auditRoom(
      inv({
        owners,
        loose: [{ under: 'Shelf', size: 1, volume: 1 }],
        fronts: { 'TR-P1': { seen: 3, wallAhead: false, noclip: false } },
        expected: [
          {
            ref: 'TR-P1',
            title: 'Pump',
            kind: 'pump',
            look: 'expected',
            source: 'catalogue',
          },
          {
            ref: 'TR-P2',
            title: 'Pump 2',
            look: 'expected',
            source: 'register',
          },
          {
            ref: 'TR-V9',
            title: 'Valve',
            look: 'unverified',
            source: 'catalogue',
          },
          { ref: 'sign', title: 'Sign', look: 'none', source: 'catalogue' },
        ],
        controls: [
          { ref: 'TR-P1/start', label: 'START' },
          { ref: 'TR-P1/stop', label: 'STOP' },
        ],
      }),
      objectClass,
    );
    expect(a.unreachable.map((u) => u.ref)).toEqual(['TR-P2']);
    expect(a.unverified.map((u) => u.ref)).toEqual(['TR-V9']);
    expect(a.duplicateNames).toEqual([{ name: 'Lamp', count: 2 }]);
    expect(a.badFronts).toEqual(['TR-P1']);
    expect(a.unmarkedControls.map((c) => c.ref)).toEqual(['TR-P1/stop']);
    const pump = a.targets.find((t) => t.ref === 'TR-P1')!;
    expect(pump).toMatchObject({
      class: 'plant',
      catalogue: 'expected',
      parts: ['Start'],
    });
    expect(a.targets.find((t) => t.ref === 'Exit sign')!.class).toBe(
      'architectural',
    );
    expect(a.failing).toBe(2);
    const s = summaryOf(a);
    expect(totalsOf([s])).toMatchObject({
      rooms: 1,
      passing: 0,
      unreachable: 1,
    });
  });
});

describe('objectClass', () => {
  it('makes signs and fire fittings architectural, never decorative', () => {
    expect(objectClass('sign:no-entry')).toBe('architectural');
    expect(objectClass('fire-point')).toBe('architectural');
    expect(objectClass('desk')).toBe('non-plant');
    expect(objectClass('spill-kit')).toBe('decorative');
    expect(objectClass('balance-tank:3x2x2')).toBe('plant');
    expect(objectClass('nonsense')).toBeUndefined();
  });
});
