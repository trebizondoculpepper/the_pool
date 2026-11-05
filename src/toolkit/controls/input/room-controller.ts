import type { Object3D } from 'three';
import { createFirstPerson, firstPersonOn } from './first-person';
import type { FirstPersonOptions } from './first-person';
import type { PortableObject, SupportSurface } from './object-handling';

/** A named room style may be approved later; every room uses the standard style now. */
export type RoomStyle = 'standard';

/**
 * What the game's object registry says about a room's things, for carrying
 * (missions 189 and 181): this layer imports nothing of ours, so the game
 * registers it once (`useRoomTraits`) and every room's controller asks it.
 */
export interface RoomTraits {
  /** Whether `object` is of a holdable kind; null when it has no kind. */
  holdable(object: Object3D): boolean | null;
  /** The tops (metres) that things let go of in `root` rest on. */
  supports(root: Object3D, metre: number): readonly SupportSurface[];
}

let registered: RoomTraits | null = null;

/** Register the registry's traits for every room controller made after this. */
export const useRoomTraits = (traits: RoomTraits | null) => {
  registered = traits;
};

export interface RoomControllerOptions extends FirstPersonOptions {
  roomStyle?: RoomStyle;
  /**
   * Whether the owner of a thing of a holdable kind lets it go now (a desk
   * while its box is in use, a cupboard whose drawer is shut): true or
   * false, or null when it has no say. Things with no kind keep the
   * room's `allowPickup`.
   */
  ownerAllows?: (object: Object3D, portable: PortableObject) => boolean | null;
}

/**
 * The single entry for a room's controls (mission 159). With the
 * registry's traits registered and the room carrying things (`objects`),
 * a thing's kind decides whether it may be picked up (holdable or not; its
 * owner may still say not now), and things let go of rest on the room's
 * supportable tops besides any supports the room gives.
 */
export function createRoomController(options: RoomControllerOptions) {
  const traits = registered;
  const root = options.objects;
  if (!traits || !root) return createFirstPerson(options);
  const scene = options.scene ?? root;
  const roomSupports = options.supports;
  return createFirstPerson({
    ...options,
    allowPickup(object, portable) {
      const holdable = traits.holdable(object);
      if (holdable === false) return false;
      if (holdable === true)
        return options.ownerAllows?.(object, portable) ?? true;
      return options.allowPickup ? options.allowPickup(object, portable) : true;
    },
    supports: () => [
      ...(roomSupports?.() ?? []),
      ...traits.supports(scene, options.metre),
    ],
  });
}

/** The controller attached by a starter, for the main room-mount seam. */
export const roomControllerOn = firstPersonOn;
