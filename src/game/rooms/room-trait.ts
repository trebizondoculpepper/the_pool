import type { RoomId } from '../../toolkit/gallery/logic/dev-room-links';
import type { ROOM_TRAIT_IDS } from './traits/index';

/**
 * Room traits (mission 228, #102): special room behaviour as reusable,
 * composable pieces that rooms declare as data (`defineRoom`'s `traits`),
 * so a behaviour from one room can be given to another without copying
 * code or testing a room's id. Each trait is one typed file,
 * `rooms/traits/<trait>.ts`, `export default defineRoomTrait({ … })`,
 * listed by `traits/index.ts`. Not object traits (`plant/traits.ts`),
 * which say what a kind of object is; a room trait says what a room does.
 *
 * Like an object trait, every room trait has a gameplay reason (the owner,
 * 2026-11-04), and its behaviour lives in the trait, never per room. It
 * lives for one visit: set up when the room is entered, stepped by world
 * simulation time (so pausing stops it), and torn down on leaving. Pure.
 */

/** A room trait's configuration: plain data. */
export type RoomTraitConfig = Readonly<
  Record<string, string | number | boolean | readonly (string | number)[]>
>;

/** The name of a registered room trait. */
export type RoomTraitId = (typeof ROOM_TRAIT_IDS)[number];

/** A room's use of a trait: which, and its configuration. */
export interface RoomTraitUse<Id extends string = RoomTraitId> {
  trait: Id;
  config?: RoomTraitConfig;
}

/** What a trait is given for a visit. */
export interface RoomTraitContext {
  /** The room visited. */
  room: RoomId;
}

/** A trait's live part for one visit. */
export interface RoomTraitVisit {
  /** Advance by `dt` seconds of world simulation time. */
  step?(dt: number): void;
  /** Tear down, on leaving the room. */
  dispose?(): void;
}

export interface RoomTraitDefinition<Id extends string = string> {
  id: Id;
  /** What is exceptional about a room with it, and what gameplay follows. */
  reason: string;
  /** For development rooms only. */
  devOnly?: boolean;
  /** Its configuration's defaults, overridden by a room's own. */
  defaults?: RoomTraitConfig;
  /** Set it up for a visit, with the room's configuration over the defaults. */
  visit(config: RoomTraitConfig, context: RoomTraitContext): RoomTraitVisit;
}

/** Type a room trait's file. */
export function defineRoomTrait<const Id extends string>(
  definition: RoomTraitDefinition<Id>,
): RoomTraitDefinition<Id> {
  return definition;
}

/**
 * Installs a room's declared traits for each visit (the room factory's
 * part, wired in `main.ts`): `enter` sets up the room's traits, tearing
 * down the last room's; `step` advances them by world time; `leave` tears
 * them down. A trait a room names but nobody defines is an error.
 */
export function createRoomTraitHost(
  definitions: Readonly<Record<string, RoomTraitDefinition>>,
) {
  let visits: RoomTraitVisit[] = [];
  let current: RoomId | null = null;
  const leave = () => {
    for (const visit of visits) visit.dispose?.();
    visits = [];
    current = null;
  };
  return {
    enter(room: RoomId, uses: readonly RoomTraitUse<string>[] = []) {
      leave();
      current = room;
      visits = uses.map((use) => {
        const definition = definitions[use.trait];
        if (!definition)
          throw new Error(`Room ${room}: unknown room trait ${use.trait}`);
        return definition.visit(
          { ...definition.defaults, ...use.config },
          { room },
        );
      });
    },
    step(dt: number) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      for (const visit of visits) visit.step?.(dt);
    },
    leave,
    /** The room whose traits are set up, if any. */
    room: () => current,
  };
}

/**
 * The clock that steps a visit's room traits from world time (#118). It
 * is anchored to one world: when the room's world is swapped (a magic
 * room installs its own) or a new visit begins, the first reading only
 * re-anchors, so no time is lost to the wrong clock and no difference
 * between two worlds' times arrives as one burst.
 */
export function createRoomTraitClock() {
  let world: unknown = null;
  let last: number | null = null;
  return {
    /** The seconds to step since the last reading of the same world, or 0. */
    read(of: unknown, time: number): number {
      const dt = of === world && last !== null ? Math.max(0, time - last) : 0;
      world = of;
      last = time;
      return dt;
    },
    /** Forget the anchor (a new visit starts). */
    reset() {
      world = null;
      last = null;
    },
  };
}
