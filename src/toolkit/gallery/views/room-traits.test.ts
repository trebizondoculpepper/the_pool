import { BoxGeometry, Group, Mesh } from 'three';
import type { PlacementTarget } from '../../controls/input/placement-target';
import type { Object3D } from 'three';
import {
  binRules,
  emptyBin,
  markBin,
} from '../../components/site-dressing/parts/bin-tossing';
import { WASTE_BIN_SHAPE } from '../../components/site-dressing/views/waste-bin';
import { createDropProfile } from '../../controls/logic/drop-profile';
import { createPortableBoard } from '../../controls/logic/portable-board';
import type { PortableObject } from '../../controls/input/object-handling';
import { expect, test } from 'vite-plus/test';
import { markEquipmentKind } from '../../components/core/views/equipment-kind';
import {
  kindIsBinLike,
  kindIsHoldable,
  makeHoldablesPortable,
  roomBins,
  roomTraits,
} from './room-traits';

test('a kind is holdable by its expanded traits, composites included', () => {
  // software-box names `holdable-small`, a composite that extends holdable.
  expect(kindIsHoldable('software-box')).toBe(true);
  expect(kindIsHoldable('desk')).toBe(false);
  expect(kindIsHoldable('no-such-kind')).toBeNull();
});

test('a thing answers by its own kind, never one it is fitted in', () => {
  const desk = markEquipmentKind(new Group(), 'desk');
  const box = markEquipmentKind(new Group(), 'software-box');
  const loose = new Group();
  desk.add(box, loose);
  expect(roomTraits.holdable(box)).toBe(true);
  expect(roomTraits.holdable(desk)).toBe(false);
  // No kind of its own: the room's own rule decides, as before.
  expect(roomTraits.holdable(loose)).toBeNull();
});

test('a thing of a holdable kind is made carryable by its trait alone (mission 189)', () => {
  const room = new Group();
  const kit = markEquipmentKind(new Group(), 'spill-kit');
  kit.add(new Mesh(new BoxGeometry(0.4, 0.5, 0.3)));
  const desk = markEquipmentKind(new Group(), 'desk');
  desk.add(new Mesh(new BoxGeometry(1.6, 0.73, 0.8)));
  room.add(kit, desk);
  expect(makeHoldablesPortable(room, 1)).toBe(1);
  const portable = kit.userData.portable;
  expect(portable).toBeTruthy();
  expect(portable.component.dropProfile.span).toBeCloseTo(0.5);
  expect(desk.userData.portable).toBeUndefined();
  // Asked again with nothing changed, it makes nothing new.
  expect(makeHoldablesPortable(room, 1)).toBe(0);
  expect(kit.userData.portable).toBe(portable);
});

test('a skip is bin-like by its kind (mission 205)', () => {
  expect(kindIsBinLike('skip')).toBe(true);
  expect(kindIsBinLike('desk')).toBe(false);
});

test('a dustbin is bin-like by its kind (mission 205)', () => {
  expect(kindIsBinLike('dustbin')).toBe(true);
});

test("a placed bin's own rules come from its placement, not a room's tossing (mission 205)", () => {
  const scene = new Group();
  // A dustbin as its builder marks it (the model itself draws on a canvas).
  const group = markBin(markEquipmentKind(new Group(), 'dustbin'), {
    shape: WASTE_BIN_SHAPE,
    footprint: { x: 0.56, z: 0.56 },
  });
  group.name = 'bin';
  group.position.set(2, 0.15, -1);
  const find = new Group();
  find.add(new Mesh(new BoxGeometry(0.1, 0.1, 0.1)));
  const stray = new Group();
  stray.add(new Mesh(new BoxGeometry(0.1, 0.1, 0.1)));
  const landed: Object3D[] = [];
  binRules(group, {
    keep: true,
    takes: (o) => o === find,
    onLanded: (o) => landed.push(o),
  });
  scene.add(group, find, stray);
  const bins = roomBins(scene, 1);
  // Found as the room steps: then it is a placement target (209).
  bins.update(0);
  const target = group.userData.placementTarget as PlacementTarget;
  expect(target.letGo).toBe(true);
  const portable = (o: Object3D) => {
    void o;
    const component = createPortableBoard(createDropProfile('box', 0.1));
    return { component, flat: 'upright', detach() {} } satisfies PortableObject;
  };
  find.position.set(2, 1, -0.5);
  stray.position.set(2, 1, -0.5);
  expect(target.accepts(stray, portable(stray))).toBe(false);
  const p = portable(find);
  expect(target.accepts(find, p)).toBe(true);
  p.component.pickUp();
  target.place(find, p);
  for (let i = 0; i < 60; i++) bins.update(0.05);
  expect(landed).toEqual([find]);
  expect(bins.filled().bin).toBe(1);
  expect(p.component.locked.value).toBe(true);
  // Landed on its floor, raised with its foot.
  expect(find.position.y).toBeGreaterThan(0.15);
  emptyBin(group);
  expect(bins.filled().bin).toBe(0);
});

test('a rack registers its shared placement target by kind alone (mission 206)', () => {
  const scene = new Group();
  // A wall shelf, as the office builds it (a rack, not drawn here).
  const rack = markEquipmentKind(new Group(), 'office-shelf');
  rack.name = 'Wall shelf';
  scene.add(rack);
  expect(rack.userData.placementTarget).toBeUndefined();
  roomTraits.racks?.(scene, 1);
  const target = rack.userData.placementTarget as PlacementTarget | undefined;
  expect(target).toBeTruthy();
  // It accepts only rackable things (a software box fits; a floppy disk not).
  const box = markEquipmentKind(new Group(), 'software-box');
  box.add(new Mesh(new BoxGeometry(0.05, 0.2, 0.04)));
  box.updateMatrixWorld(true);
  const flat = markEquipmentKind(new Group(), 'floppy-disk');
  flat.add(new Mesh(new BoxGeometry(0.09, 0.003, 0.094)));
  flat.updateMatrixWorld(true);
  // A rack's `accepts` needs a portable to judge by; the kind decides.
  const portable = () =>
    ({
      component: createPortableBoard(),
      flat: 'upright',
      detach() {},
    }) as PortableObject;
  expect(target!.accepts(box, portable())).toBe(true);
  expect(target!.accepts(flat, portable())).toBe(false);
  // Nothing without the rack trait gains one.
  const desk = markEquipmentKind(new Group(), 'desk');
  scene.add(desk);
  expect(desk.userData.placementTarget).toBeUndefined();
});
