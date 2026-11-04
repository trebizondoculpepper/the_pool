import { expect, test } from 'vite-plus/test';
import { kindCatalogue } from '../logic/kind-catalogue';
import { placedRoomItems } from '../logic/room-usage';
import { adapterFor } from './magic-adapters';
import { KIND_BUILDERS, NO_STANDALONE_FORM } from './magic-builders';

/**
 * Every kind a room layout places has a magic room and CAD views with no
 * work of its own (the owner, 2026-11-04): explicit, from its model, or
 * from the rooms' own item builder.
 */
test('every kind a room layout places has a 3D form', () => {
  const placed = new Set(
    placedRoomItems().flatMap(({ items }) =>
      items.map((i) => i.key.split(':')[0]),
    ),
  );
  expect([...placed].filter((k) => !adapterFor(k))).toEqual([]);
});

test('every kind has a 3D form or a recorded reason it has none', () => {
  const none = kindCatalogue()
    .map((k) => k.key)
    .filter((k) => !adapterFor(k))
    .sort();
  expect(none).toEqual(Object.keys(NO_STANDALONE_FORM).sort());
});

test('each standalone builder builds an object', async () => {
  for (const kind of Object.keys(KIND_BUILDERS))
    expect(adapterFor(kind)?.source, kind).toBe('builder');
});

test('a layout-built kind uses the rooms’ builder at the layout item’s size', () => {
  const tank = adapterFor('balance-tank');
  expect(tank?.source).toBe('layout');
  expect(tank?.size.mount).toBe('floor');
  expect(tank?.size.w).toBeGreaterThan(1);
});
