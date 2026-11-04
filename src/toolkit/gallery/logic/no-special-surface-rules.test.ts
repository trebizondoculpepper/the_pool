import { expect, test } from 'vite-plus/test';

/**
 * A guard against special rules for surfaces (the owner, 2026-11-04: the
 * hand-placed tank-roof rules "are terrible and they don't work"). Where the
 * walker can stand, and where a thing can be put down, comes only from a
 * kind's traits (`walkable`, `supportable`) and the geometry
 * (`views/derived-surfaces.ts`), the same for every object: never from a
 * marker mesh found by its name, a lookup naming one kind or object, or a
 * room's private exception. This test fails if such a rule comes back.
 */
const SOURCES = import.meta.glob<string>(
  ['../../../**/*.ts', '!../../../**/*.test.ts', '!../../../**/*.slow.test.ts'],
  { query: '?raw', import: 'default', eager: true },
);

const FORBIDDEN: readonly [RegExp, string][] = [
  [/['"`]Tank roof deck/, 'a named roof-deck marker'],
  [
    /\b(?:roomRoofDecks|tankRoofAt|tankRoofGuardSolids|addWalkableTankRoof)\b/,
    'a tank-roof special rule',
  ],
  [/walkable-deck/, 'the old hand-placed deck module'],
  [
    /(?:roof|deck|surface|floor)\w*[^\n]*\.name\.(?:startsWith|includes|endsWith)\(/i,
    'a walking surface found by an object’s name',
  ],
  [
    /floorAt[^\n]*['"`](?:balance-tank|break-tank|backwash-tank|desk|tank)['"`]/,
    'a floor rule naming a kind',
  ],
];

test('walking and support surfaces come from traits and geometry, never special rules', () => {
  const found: string[] = [];
  for (const [file, text] of Object.entries(SOURCES))
    for (const [pattern, what] of FORBIDDEN)
      if (pattern.test(text)) found.push(`${file}: ${what}`);
  expect(found).toEqual([]);
});
