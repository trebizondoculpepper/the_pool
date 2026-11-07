import type { RoomId } from '../../toolkit/gallery/logic/dev-room-links';
import type { RoomDeclaration } from './define-room';
import { ROOM_FILES, ROOM_IDS } from './declarations/index';
import { ROOM_TRAIT_FILES, ROOM_TRAIT_IDS } from './traits/index';
import type { RoomTraitDefinition } from './room-trait';

/**
 * The room registry, compiled from the declaration files (mission 228,
 * #102): every room, how it is built, and its room traits. Pure.
 */
const fileId = (path: string) => path.replace(/^\.\//, '').replace(/\.ts$/, '');

export const ROOM_REGISTRY: Readonly<Record<string, RoomDeclaration>> =
  Object.fromEntries(
    Object.entries(ROOM_FILES).map(([path, file]) => [
      fileId(path),
      file.default,
    ]),
  );

/** Every room trait, compiled from the trait files. */
export const ROOM_TRAITS: Readonly<Record<string, RoomTraitDefinition>> =
  Object.fromEntries(
    Object.entries(ROOM_TRAIT_FILES).map(([path, file]) => [
      fileId(path),
      file.default,
    ]),
  );

/** A room's declaration, or null if it is not registered. */
export function roomDeclaration(id: string): RoomDeclaration | null {
  return Object.hasOwn(ROOM_REGISTRY, id) ? ROOM_REGISTRY[id] : null;
}

/**
 * The room whose scene `id` is part of: itself, or the room it shares a
 * world with (the courtyard is built with the dev corridor).
 */
export function worldRoomOf(id: RoomId): RoomId {
  return roomDeclaration(id)?.sharesWorldWith ?? id;
}

/**
 * What is wrong with the registry, as sentences; none when it is sound:
 * the index and the files agree, each file is named by its id, a shared
 * world is a registered room that shares no other, and every trait a room
 * names is registered.
 */
export function registryProblems(
  files: Readonly<Record<string, { default: RoomDeclaration }>> = ROOM_FILES,
  ids: readonly string[] = ROOM_IDS,
  traitIds: readonly string[] = ROOM_TRAIT_IDS,
): string[] {
  const problems: string[] = [];
  const byId = new Map<string, RoomDeclaration>();
  for (const [path, file] of Object.entries(files)) {
    const id = fileId(path);
    if (file.default.id !== id)
      problems.push(`${path} declares ${file.default.id}, not ${id}`);
    byId.set(id, file.default);
  }
  for (const id of ids)
    if (!byId.has(id)) problems.push(`${id} is indexed but has no file`);
  for (const id of byId.keys())
    if (!ids.includes(id)) problems.push(`${id} has a file but is not indexed`);
  const sorted = [...ids].sort();
  if (sorted.some((id, i) => id !== ids[i]))
    problems.push('the index is not sorted');
  for (const [id, room] of byId) {
    const host = room.sharesWorldWith;
    if (host !== undefined) {
      if (!byId.has(host))
        problems.push(`${id} shares an unregistered ${host}`);
      else if (byId.get(host)!.sharesWorldWith !== undefined)
        problems.push(`${id} shares ${host}, which shares another`);
    }
    for (const use of room.traits ?? [])
      if (!traitIds.includes(use.trait))
        problems.push(
          `${id} names an unregistered room trait ${String(use.trait)}`,
        );
  }
  return problems;
}
