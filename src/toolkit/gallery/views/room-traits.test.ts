import { Group } from 'three';
import { expect, test } from 'vite-plus/test';
import { markEquipmentKind } from '../../components/core/views/equipment-kind';
import { kindIsHoldable, roomTraits } from './room-traits';

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
