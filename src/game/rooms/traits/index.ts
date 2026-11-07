import type { RoomTraitDefinition } from '../room-trait';

/**
 * Every registered room trait, one per line, sorted (mission 228, #102):
 * kept by `npm run audit` with the trait files beside it, never by hand. A
 * test fails if it and the directory disagree. None yet: the first is the
 * timed-events work (#104, #105).
 */
export const ROOM_TRAIT_IDS = [] as const;

/** Each trait file's default export, by path. */
export const ROOM_TRAIT_FILES: Record<
  string,
  { default: RoomTraitDefinition }
> = import.meta.glob(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
});
