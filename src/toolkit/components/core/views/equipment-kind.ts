import type { Object3D } from 'three';

/**
 * A scene object's registered kind (missions 175, 189): set by whoever
 * builds or places it, read by the room's trait behaviour (a supportable
 * top, a holdable thing) so no room names a kind or an object.
 */
export const EQUIPMENT_KIND = 'equipmentKind';

/** Mark a placed object with its kind, so its traits can be read from the scene. */
export function markEquipmentKind<T extends Object3D>(
  object: T,
  kind: string,
): T {
  object.userData[EQUIPMENT_KIND] = kind;
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
