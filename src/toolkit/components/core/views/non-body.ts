import type { Object3D } from 'three';

/**
 * Parts that are not an object's body (mission 175; the owner, 2026-11-04):
 * a ladder, a guard rail, a cage. Derived surfaces (`gallery/views/
 * derived-surfaces.ts`) never find a top on them, so a tank's roof is its
 * roof, not its ladder's cage. One shared mark, set by the builders of such
 * parts, never by a room.
 */
export const NON_BODY = 'nonBody';

export function markNonBody<T extends Object3D>(object: T): T {
  object.userData[NON_BODY] = true;
  return object;
}

export const isNonBody = (object: Object3D): boolean =>
  object.userData[NON_BODY] === true;
