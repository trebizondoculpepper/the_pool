import type { Object3D } from 'three';
import type { PortableObject } from './object-handling';

/** A component-owned destination for the shared carrying interaction. */
export interface PlacementTarget {
  inRange?(object: Object3D, portable: PortableObject): boolean;
  accepts(object: Object3D, portable: PortableObject): boolean;
  place(object: Object3D, portable: PortableObject): void;
  /** Ordinary surfaces use normal use reach; magnetic bins use their own rule. */
  reach?: number;
  /**
   * What putting a thing here is, for the crosshair's cue (mission 116):
   * fitting it into a socket (the default), putting it back in its own
   * place, into a bin or carton, or down on a surface.
   */
  cue?: 'fit' | 'put-back' | 'put-in' | 'put-down';
  /**
   * Taken by LET GO as well as by use (mission 209: a bin aimed at takes
   * what is let go of, as it takes what is used on it).
   */
  letGo?: boolean;
}

/** Contents attached to a plinth remain occupants, including respawn animations. */
export function plinthOccupied(plinth: Object3D, ignore?: Object3D) {
  let occupied = false;
  plinth.traverse((object) => {
    if (occupied || object === ignore) return;
    const portable = object.userData.portable as PortableObject | undefined;
    if (!portable || portable.component.phase.value === 'held') return;
    for (let at: Object3D | null = object; at; at = at.parent)
      if (!at.visible || at === ignore) return;
    occupied = true;
  });
  return occupied;
}
