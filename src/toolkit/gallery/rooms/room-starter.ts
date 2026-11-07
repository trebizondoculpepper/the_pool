import type { RoomBuild } from '../../../game/rooms/define-room';

/**
 * Start a room from its registry declaration (mission 228, #102): the
 * one place a room's builder is found, so the game routes every room from
 * the registry (`game/rooms/`) and tests no room's id. A `module` build
 * loads its module on demand and calls its starter with the surface and
 * the declaration's arguments.
 */
type Starter = (surface: HTMLCanvasElement, ...args: unknown[]) => unknown;

/** Every module a room may be built by, loaded on demand, by path from `src/`. */
const MODULES = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, unknown>>([
      './*.ts',
      '!./*.test.ts',
      '!./room-starter.ts',
      '../../../rendering/*-room.ts',
      '../../../rendering/shared-plant-layout.ts',
    ]),
  ).map(([path, load]) => [
    path
      .replace(/^\.\.\/\.\.\/\.\.\//, '')
      .replace(/^\.\//, 'toolkit/gallery/rooms/')
      .replace(/\.ts$/, ''),
    load,
  ]),
);

/** Whether `module` is one a room may be built by. */
export const isRoomModule = (module: string) => Object.hasOwn(MODULES, module);

/** The function that starts a room built by `build`, loaded on demand. */
export async function roomStarter<Handle>(
  build: RoomBuild,
): Promise<(surface: HTMLCanvasElement) => Handle> {
  if (build.kind === 'plant-hall-shell') {
    const [{ startPlantRoomShell }, { POOL_HALLS }] = await Promise.all([
      import('./plant-room-shell-room'),
      import('../logic/pool-halls'),
    ]);
    const size = POOL_HALLS[build.hall].plantDoor!.size;
    if (build.equipment)
      return (surface) =>
        startPlantRoomShell(surface, size, build.hall, {
          equipment: build.equipment as never,
          ...(build.title ? { title: build.title } : {}),
        }) as Handle;
    // The Olympic's and the lounge's own shells (prompt 033).
    const plan =
      build.hall === 'pool_02'
        ? (await import('../logic/olympic-plan')).olympicShellPlan()
        : build.hall === 'pool_01'
          ? (await import('../logic/lounge-plant-plan')).loungeShellPlan()
          : undefined;
    return (surface) =>
      startPlantRoomShell(
        surface,
        size,
        build.hall,
        plan ? { plan } : {},
      ) as Handle;
  }
  const load = MODULES[build.module];
  if (!load) throw new Error(`No room module ${build.module}`);
  const start = (await load())[build.start] as Starter | undefined;
  if (typeof start !== 'function')
    throw new Error(`${build.module} exports no starter ${build.start}`);
  const args = build.args ?? [];
  return (surface) => start(surface, ...args) as Handle;
}
