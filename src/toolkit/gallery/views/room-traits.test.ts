import { BoxGeometry, Group, Mesh } from 'three';
import { expect, test } from 'vite-plus/test';
import { markEquipmentKind } from '../../components/core/views/equipment-kind';
import {
  kindIsBinLike,
  kindIsHoldable,
  makeHoldablesPortable,
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
