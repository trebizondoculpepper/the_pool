import { Box3, Vector3 } from 'three';
import { createPortableBoard } from '../../controls/logic/portable-board';
import { createDropProfile } from '../../controls/logic/drop-profile';
import type { PortableObject } from '../../controls/input/object-handling';
import type { Camera, Object3D } from 'three';
import {
  BIN_MARK,
  createBinTossing,
} from '../../components/site-dressing/parts/bin-tossing';
import type {
  BinMark,
  TossBin,
} from '../../components/site-dressing/parts/bin-tossing';
import { EQUIPMENT_KINDS, isKindId } from '../../../game/plant/equipment-kinds';
import { compositeTraits, expand } from '../../../game/plant/traits';
import { EQUIPMENT_KIND } from '../../components/core/views/equipment-kind';
import { useRoomTraits } from '../../controls/input/room-controller';
import type {
  RoomBins,
  RoomTraits,
} from '../../controls/input/room-controller';
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
const binKinds = new Map<string, boolean>();

/** Whether a registered kind is bin-like (mission 205), by its expanded traits. */
export function kindIsBinLike(kind: string): boolean {
  if (!isKindId(kind)) return false;
  const known = binKinds.get(kind);
  if (known !== undefined) return known;
  const traits = EQUIPMENT_KINDS[kind].traits ?? [];
  const bin = (
    expand(traits, compositeTraits()).primitives as readonly string[]
  ).includes('bin-like');
  binKinds.set(kind, bin);
  return bin;
}

/**
 * A room's bins (mission 205; the owner, 2026-11-05): every placed object
 * of a `bin-like` kind, found in the room as it fills, given to one shared
 * bin tossing. A thing let go near one, facing it, flies in through its
 * opening (its target plane) and stays, until picked out again. A bin a
 * room still adds by hand (it already has a placement target) is left to
 * that room.
 */
export function roomBins(
  root: Object3D,
  camera: Camera,
  metre: number,
): RoomBins {
  const tossing = createBinTossing({ camera, metre, keep: false });
  const known = new WeakSet<Object3D>();
  let signature = '';
  const at = new Vector3();
  const find = () => {
    const now = String(root.children.length);
    if (now === signature) return;
    signature = now;
    root.traverse((o) => {
      if (known.has(o)) return;
      const kind = o.userData[EQUIPMENT_KIND] as string | undefined;
      const mark = o.userData[BIN_MARK] as BinMark | undefined;
      if (!kind || !mark || !kindIsBinLike(kind)) return;
      known.add(o);
      if (o.userData.placementTarget) return;
      o.getWorldPosition(at);
      const bin: TossBin = {
        name: o.name || kind,
        group: o,
        shape: mark.shape,
        footprint: mark.footprint,
        x: at.x / metre,
        z: at.z / metre,
      };
      tossing.add(bin);
    });
  };
  return {
    divert(object, portable) {
      find();
      return tossing.divert(object, portable);
    },
    targetFeedback(object) {
      find();
      return tossing.targetFeedback(object);
    },
    update(delta) {
      find();
      tossing.update(delta);
    },
    filled: () =>
      Object.fromEntries(tossing.bins.map((b) => [b.name, b.filled])),
    toss(object, portable) {
      find();
      const bin = tossing.bins[0];
      if (bin) tossing.toss(object, portable, bin.name);
    },
  };
}

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
const holdableSignatures = new WeakMap<Object3D, string>();

/**
 * Every thing of a holdable kind in `root` made carryable (mission 189; the
 * owner, 2026-11-05: "I just want to get holdable working"): one whose
 * builder gave it no carrying of its own gets a plain one, sized from its
 * body, so a kind gains carrying by its trait alone. Returns how many it made.
 */
export function makeHoldablesPortable(root: Object3D, metre: number): number {
  const signature = bodySignature(root);
  if (holdableSignatures.get(root) === signature) return 0;
  holdableSignatures.set(root, signature);
  let made = 0;
  const size = new Vector3();
  root.traverse((o) => {
    if (o.userData.portable) return;
    const kind = o.userData[EQUIPMENT_KIND] as string | undefined;
    if (!kind || !kindIsHoldable(kind)) return;
    // Inside something already carried (a disk in its box) it goes with it.
    for (let at = o.parent; at; at = at.parent)
      if (at.userData.portable) return;
    o.updateWorldMatrix(true, true);
    new Box3().setFromObject(o).getSize(size).divideScalar(metre);
    const span = Math.max(0.02, size.x, size.y, size.z);
    o.userData.portable = {
      component: createPortableBoard(createDropProfile('box', span, 'plastic')),
      flat: 'upright',
      detach: () => {},
    } satisfies PortableObject;
    made++;
  });
  return made;
}

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
  bins: roomBins,
  holdables: (root, metre) => {
    makeHoldablesPortable(root, metre);
  },
};

/** Give every room's controller the registry's carrying behaviour. */
export const installRoomTraits = () => useRoomTraits(roomTraits);
