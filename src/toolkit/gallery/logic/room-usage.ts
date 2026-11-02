import { EQUIPPED_ROOMS, layoutRoom } from './room-equipment';
import type { Item } from './room-equipment';

/**
 * Every equipped room's placed items, as its layout places them (the
 * scene is built from the same layout): from data, no scene. Shared by
 * the component benchmark's usage counts and the catalogue (mission 126),
 * so the two count alike.
 */
export interface RoomItems {
  room: (typeof EQUIPPED_ROOMS)[number];
  items: readonly Item[];
}

let cached: readonly RoomItems[] | undefined;

/** Each equipped room's placed items, worked out once (the layouts are fixed while the game runs). */
export function placedRoomItems(): readonly RoomItems[] {
  cached ??= EQUIPPED_ROOMS.map((room) => ({
    room,
    items: (layoutRoom(room)?.placed ?? []).map((p) => p.item),
  }));
  return cached;
}

/** Each equipped room's placed item keys, as `countUsage` takes them. */
export const roomKeys = () =>
  placedRoomItems().map(({ room, items }) => ({
    room,
    keys: items.map((item) => item.key),
  }));
