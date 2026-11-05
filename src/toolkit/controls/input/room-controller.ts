import { createFirstPerson, firstPersonOn } from './first-person';
import type { FirstPersonOptions } from './first-person';

/** A named room style may be approved later; every room uses the standard style now. */
export type RoomStyle = 'standard';

export interface RoomControllerOptions extends FirstPersonOptions {
  roomStyle?: RoomStyle;
}

/** The single entry for a room's controls. Mission 159 preserves every option and its behaviour. */
export function createRoomController(options: RoomControllerOptions) {
  return createFirstPerson(options);
}

/** The controller attached by a starter, for the main room-mount seam. */
export const roomControllerOn = firstPersonOn;
