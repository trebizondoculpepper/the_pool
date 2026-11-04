import { expect, test } from 'vite-plus/test';
import { kindCatalogue } from '../logic/kind-catalogue';
import { placedRoomItems } from '../logic/room-usage';
import { adapterFor } from './magic-adapters';

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

/**
 * Kinds drawn outside the room layouts (by the plumber, the electrical
 * feeders or inside an assembly) have no 3D form yet: listed so a new gap
 * fails here and a closed one is removed.
 */
const NO_3D_FORM_YET = [
  'boiler',
  'butterfly-valve',
  'cabinet-switch',
  'cartridge-filter',
  'dosing-set',
  'filing',
  'flowmeter',
  'gas-ball-valve',
  'level-transmitter',
  'ozone-monitor',
  'penstock',
  'pipework',
  'pump',
  'switch-fuse',
  'tanker-stand',
  'temperature-sensor',
  'valve',
];

test('the kinds still without a 3D form are exactly the known ones', () => {
  const none = kindCatalogue()
    .map((k) => k.key)
    .filter((k) => !adapterFor(k))
    .sort();
  expect(none).toEqual(NO_3D_FORM_YET);
});

test('a layout-built kind uses the rooms’ builder at the layout item’s size', () => {
  const tank = adapterFor('balance-tank');
  expect(tank?.source).toBe('layout');
  expect(tank?.size.mount).toBe('floor');
  expect(tank?.size.w).toBeGreaterThan(1);
});
