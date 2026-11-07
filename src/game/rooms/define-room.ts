import type { RoomId } from '../../toolkit/gallery/logic/dev-room-links';
import type { RoomTraitUse } from './room-trait';

/**
 * The room registry (mission 228, #102; the owner, 2026-11-07: every room
 * exists in a room registry, kept by the audit command). Each room is one
 * typed file, `rooms/declarations/<id>.ts`, `export default defineRoom({ … })`,
 * listed by `declarations/index.ts`, as object kinds are (`define-kind.ts`).
 * A declaration says how the room is built and which room traits it has;
 * the game routes every room from it, so no shared code tests a room's id.
 * Pure: a builder is named, never imported, here.
 */

/** A value a room's starter is given after its surface: plain data only. */
export type RoomArg =
  | string
  | number
  | boolean
  | { readonly [key: string]: string | number | boolean };

/** How a room is built: which starter, and what it is given. */
export type RoomBuild =
  | {
      /**
       * A starter function exported by a room module, called as
       * `start(surface, ...args)`. `module` is the module's path from `src/`
       * without its extension (`toolkit/gallery/rooms/racks-room`).
       */
      kind: 'module';
      module: string;
      start: string;
      args?: readonly RoomArg[];
    }
  | {
      /**
       * A pool hall's plant room shell, its size from the hall's plant door
       * and its plan from the hall (`plant-room-shell-room.ts`).
       */
      kind: 'plant-hall-shell';
      hall: 'pool_01' | 'pool_02' | 'pool_03' | 'pool_04';
      /** A retired layout's equipment, kept as a reference. */
      equipment?: string;
      title?: string;
    };

export interface RoomDeclaration {
  id: RoomId;
  build: RoomBuild;
  /**
   * Another room this one is built with and shares a scene with (the
   * courtyard is walked into from the dev corridor): the room built is
   * that one.
   */
  sharesWorldWith?: RoomId;
  /**
   * Walked into from a neighbouring room's zone, with no doorway (the
   * poolrooms' stairs, corridors and pool): its zone events hand the
   * walker over (`pool-plant:room-zone`).
   */
  zoneWalk?: true;
  /** The room traits it has, each with its configuration. */
  traits?: readonly RoomTraitUse[];
}

/** Type a room's declaration file. */
export function defineRoom<const D extends RoomDeclaration>(declaration: D): D {
  return declaration;
}
