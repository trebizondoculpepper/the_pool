import type { Object3D } from 'three';
import { EQUIPMENT_KINDS, isKindId } from '../../../game/plant/equipment-kinds';
import { compositeTraits, expand } from '../../../game/plant/traits';
import { EQUIPMENT_KIND } from '../../components/core/views/equipment-kind';
import { useRoomTraits } from '../../controls/input/room-controller';
import type { RoomTraits } from '../../controls/input/room-controller';
import { surfaceSupports } from '../logic/derived-surface';
import { forgetSurfaces, roomSurfaces } from './derived-surfaces';

/**
 * The registry's traits as the rooms' carrying behaviour (missions 189 and
 * 181; the owner, 2026-11-05): a thing of a `holdable` kind may be picked
 * up in any room, a thing of a kind that is not may not, and whatever is
 * let go of rests on the tops of the room's `supportable` objects, derived
 * from their bodies (175). Registered once for the game (`installRoomTraits`)
 * and read by every room's controller (`createRoomController`); no room
 * names a kind or an object.
 */

const holdableKinds = new Map<string, boolean>();

/** Whether a registered kind is holdable, by its expanded traits. */
export function kindIsHoldable(kind: string): boolean | null {
  if (!isKindId(kind)) return null;
  const known = holdableKinds.get(kind);
  if (known !== undefined) return known;
  const traits = EQUIPMENT_KINDS[kind].traits ?? [];
  const holdable = (
    expand(traits, compositeTraits()).primitives as readonly string[]
  ).includes('holdable');
  holdableKinds.set(kind, holdable);
  return holdable;
}

/**
 * What the room's supportable objects are made of, cheaply: their mesh
 * count, so a model that loads after the walker was made (the engineer's
 * desk) brings its top with it.
 */
function bodySignature(root: Object3D): string {
  let objects = 0;
  let meshes = 0;
  root.traverse((o) => {
    if (o.userData.equipmentKind) objects++;
    if ((o as { isMesh?: boolean }).isMesh) meshes++;
  });
  return `${objects}:${meshes}`;
}

const signatures = new WeakMap<Object3D, string>();

export const roomTraits: RoomTraits = {
  holdable(object) {
    // The carried thing's own kind, never one it is fitted in: a fuse in a
    // switch-fuse is the fuse's to answer, not the switch-fuse's.
    const kind = object.userData[EQUIPMENT_KIND] as string | undefined;
    return kind ? kindIsHoldable(kind) : null;
  },
  supports(root, metre) {
    const signature = bodySignature(root);
    if (signatures.get(root) !== signature) {
      forgetSurfaces(root);
      signatures.set(root, signature);
    }
    // The derived surfaces are in scene units; carrying's supports are metres.
    return surfaceSupports(roomSurfaces(root, metre)).map((s) => ({
      minX: s.minX / metre,
      maxX: s.maxX / metre,
      minZ: s.minZ / metre,
      maxZ: s.maxZ / metre,
      top: s.top / metre,
    }));
  },
};

/** Give every room's controller the registry's carrying behaviour. */
export const installRoomTraits = () => useRoomTraits(roomTraits);
