import type { Object3D } from 'three';

/**
 * A scene object's registered kind (missions 175, 189): set by whoever
 * builds or places it, read by the room's trait behaviour (a supportable
 * top, a holdable thing) so no room names a kind or an object. Where the
 * registry binds the object to a specific `thing` of its kind (mission
 * 160), the mark carries it too, as the overlay's tag.
 */
export const EQUIPMENT_KIND = 'equipmentKind';

/** A kind mark's bound thing, when the builder knows the registry's instance. */
export const BOUND_THING = 'boundThing';

/** Mark a placed object with its kind, so its traits can be read from the scene. */
export function markEquipmentKind<T extends Object3D>(
  object: T,
  kind: string,
  /** The registry's bound thing for this object, where one exists (160). */
  boundThing?: string,
): T {
  object.userData[EQUIPMENT_KIND] = kind;
  if (boundThing) object.userData[BOUND_THING] = boundThing;
  return object;
}

/** The kind of `object` or of the nearest ancestor that has one. */
export function equipmentKindOf(object: Object3D | null): string | undefined {
  for (let o = object; o; o = o.parent) {
    const kind = o.userData[EQUIPMENT_KIND];
    if (typeof kind === 'string' && kind) return kind;
  }
  return undefined;
}

/** The marked owner of `object`'s kind, itself or up its parents. */
export function kindOwnerOf(object: Object3D | null): Object3D | null {
  for (let o = object; o; o = o.parent) {
    if (typeof o.userData[EQUIPMENT_KIND] === 'string') return o;
  }
  return null;
}
