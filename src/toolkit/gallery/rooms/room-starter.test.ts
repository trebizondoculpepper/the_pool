import { describe, expect, it } from 'vite-plus/test';
import { ROOM_REGISTRY } from '../../../game/rooms/registry';
import { isRoomModule } from './room-starter';

/** Every room module's source, by path from `src/`. */
const SOURCES = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(
      [
        './*.ts',
        '!./*.test.ts',
        '../../../rendering/*-room.ts',
        '../../../rendering/shared-plant-layout.ts',
      ],
      { query: '?raw', import: 'default', eager: true },
    ),
  ).map(([path, source]) => [
    path
      .replace(/^\.\.\/\.\.\/\.\.\//, '')
      .replace(/^\.\//, 'toolkit/gallery/rooms/')
      .replace(/\.ts$/, ''),
    source,
  ]),
);

const MAIN = import.meta.glob<string>('../../../main.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})['../../../main.ts'];

describe('starting rooms from the registry (#102)', () => {
  it("every room's module is one a room may be built by, and exports its starter", () => {
    for (const room of Object.values(ROOM_REGISTRY)) {
      if (room.build.kind !== 'module') continue;
      expect(isRoomModule(room.build.module), room.id).toBe(true);
      expect(SOURCES[room.build.module], room.id).toMatch(
        new RegExp(
          `export (async function|function|const) ${room.build.start}\\b`,
        ),
      );
    }
  });

  it('main.ts routes rooms from the registry, testing no room id', () => {
    const ids = Object.keys(ROOM_REGISTRY);
    const tests = MAIN.split('\n').filter((line) =>
      ids.some(
        (id) => line.includes(`=== '${id}'`) || line.includes(`!== '${id}'`),
      ),
    );
    // The dry stair's look back at the pool is the pool's own (mission 112).
    expect(tests.map((line) => line.trim())).toEqual([
      "if (poolRoot && current !== 'PR_A') poolRoot.hidden = true;",
    ]);
    expect(MAIN).not.toMatch(/room\.startsWith\('/);
  });
});
