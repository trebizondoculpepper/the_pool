import { expect, test } from 'vite-plus/test';
import main from '../../../main.ts?raw';

const SOURCES = import.meta.glob<string>(
  ['../rooms/*.ts', '../views/magic-room.ts', '../../../rendering/*.ts'],
  { query: '?raw', import: 'default', eager: true },
);

test('every room starter gets its controller through the room factory', () => {
  const bypasses: string[] = [];
  let starters = 0;
  let factoryCalls = 0;
  for (const [name, source] of Object.entries(SOURCES)) {
    if (
      /import\s*\{[^}]*\bcreateFirstPerson\b[^}]*\}/s.test(source) ||
      /\bcreateFirstPerson\s*\(/.test(source)
    )
      bypasses.push(name);
    const count = (source.match(/\bcreateRoomController\s*\(/g) ?? []).length;
    if (count) starters++;
    factoryCalls += count;
  }
  expect(bypasses).toEqual([]);
  expect(starters).toBe(41);
  expect(factoryCalls).toBe(42); // lift-rooms has two controllers.

  expect(main).toContain('roomControllerOn(surface)');
  expect(main).not.toContain('firstPersonOn');
});
