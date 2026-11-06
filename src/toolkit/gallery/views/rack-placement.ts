import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { PortableObject } from '../../controls/input/object-handling';
import type { PlacementTarget } from '../../controls/input/placement-target';
import { rackRow } from '../../controls/logic/rack';
import type { RackSpec } from '../../controls/logic/rack';
import { EQUIPMENT_KINDS, isKindId } from '../../../game/plant/equipment-kinds';
import {
  compositeTraits,
  expand,
  resolveMeta,
} from '../../../game/plant/traits';
import { EQUIPMENT_KIND } from '../../components/core/views/equipment-kind';

/**
 * A room's racks (mission 206, `doc/prompts/206-trait-rackable.md`): every
 * placed object of a `rack` kind is a placement target, so a held rackable
 * item aimed at the rack within reach goes on it — and the rack's whole row
 * compacts, centred, with the new item to a randomly chosen end (`rackRow`,
 * `controls/logic/rack.ts`, the pure rule). Built once for the room by
 * `room-traits.ts` (which reads the registry) and read by every room's
 * controller, exactly as bins are (mission 205); no room names a kind or an
 * object. A rack's board plane is its local y = 0, its row along local x,
 * its depth along local z.
 */

/** What the rack knows of a rackable item at rest on it. */
interface Rackful {
  object: Object3D;
  /** Its width along the rack's row, metres. */
  width: number;
  /** Its depth across the row, metres. */
  depth: number;
  /** The local face carrying its label, to turn toward the rack's facing. */
  outward: string;
}

/** Whether a kind has the `rackable` trait, by its expanded traits. */
export function kindIsRackable(kind: string | undefined): boolean {
  const id = kind ?? '';
  if (!isKindId(id)) return false;
  const k = EQUIPMENT_KINDS[id];
  if (!k.traits?.length) return false;
  return (expand(k.traits, compositeTraits()).primitives as string[]).includes(
    'rackable',
  );
}

/** A rack's usable run, from its `rack` kind's metadata; null when not a rack. */
function rackSpecOf(group: Object3D): RackSpec | null {
  const kind = group.userData[EQUIPMENT_KIND] as string | undefined;
  const id = kind ?? '';
  if (!isKindId(id)) return null;
  const k = EQUIPMENT_KINDS[id];
  if (!k.traits?.length) return null;
  const ps = expand(k.traits, compositeTraits()).primitives as string[];
  if (!ps.includes('rack')) return null;
  const meta = resolveMeta(k.traits, k.meta ?? {}, compositeTraits()).values;
  return {
    rowWidth: Number(meta.rowWidth ?? 0.28),
    rowDepth: Number(meta.rowDepth ?? 0.1),
    facing: String(meta.facing ?? '+z'),
    gap: Number(meta.gap ?? 0.006),
  };
}

/** A rackable item's body and `outward` face, or null when not rackable. */
function rackableOf(object: Object3D): Rackful | null {
  const kind = object.userData[EQUIPMENT_KIND] as string | undefined;
  const id = kind ?? '';
  if (!isKindId(id) || !kindIsRackable(id)) return null;
  const k = EQUIPMENT_KINDS[id];
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  return {
    object,
    width: size.x,
    depth: size.z,
    outward: String(
      resolveMeta(k.traits ?? [], k.meta ?? {}, compositeTraits()).values
        .outward ?? '+z',
    ),
  };
}

/** The yaw that turns an item's `outward` local face toward the rack's `facing`. */
const yawFor = (outward: string, _facing: string): number => {
  const side = outward === '+x' || outward === '-x';
  // A spine (+x) lies along the row's width; turn it to face out along the
  // rack's depth. A front/back label (±z) already faces the depth.
  return side ? (outward === '+x' ? Math.PI / 2 : -Math.PI / 2) : 0;
};

/**
 * The rackable portables of a room at rest on `rack`'s board (its local
 * y = 0 plane, within its row run).
 */
function occupantsOf(
  root: Object3D,
  rack: Object3D,
  spec: RackSpec,
): Rackful[] {
  rack.updateMatrixWorld(true);
  const inverse = rack.matrixWorld.clone().invert();
  const out: Rackful[] = [];
  root.traverse((o) => {
    if (o === rack) return;
    const portable = o.userData.portable as PortableObject | undefined;
    if (!portable || portable.component.phase.value === 'held') return;
    const item = rackableOf(o);
    if (!item) return;
    // Its bottom, in the rack's board plane (its local y = 0), and its
    // centre along the row's depth.
    o.updateMatrixWorld(true);
    const box = new Box3().setFromObject(o);
    const min = box.min.clone().applyMatrix4(inverse);
    if (Math.abs(min.y) > 0.03) return;
    const centre = box.getCenter(new Vector3()).applyMatrix4(inverse);
    if (Math.abs(centre.z) > spec.rowDepth / 2) return;
    out.push(item);
  });
  return out;
}

/**
 * Register a room's racks (mission 206): every `rack`-kind object in `root`
 * becomes a placement target carrying the shared racking. Pure to ask; only
 * `place` moves things. Called by `room-traits.ts`.
 */
export function registerRacks(
  root: Object3D,
  random: () => number = Math.random,
) {
  root.traverse((o) => {
    const spec = rackSpecOf(o);
    if (!spec || o.userData.placementTarget) return;
    o.userData.placementTarget = rackTarget(root, o, spec, random);
  });
}

function rackTarget(
  root: Object3D,
  rack: Object3D,
  spec: RackSpec,
  random: () => number,
): PlacementTarget {
  const occupants = () => occupantsOf(root, rack, spec);
  const rowRun = (add: Rackful) => {
    const run = rackRow(
      spec,
      occupants().map((r) => ({
        width: r.width,
        depth: r.depth,
        outward: r.outward,
      })),
      { width: add.width, depth: add.depth, outward: add.outward },
      random,
      yawFor,
    );
    return run;
  };
  return {
    cue: 'fit',
    accepts(object) {
      const item = rackableOf(object);
      if (!item) return false;
      return rowRun(item).ok;
    },
    place(object, portable: PortableObject) {
      const item = rackableOf(object);
      if (!item) return;
      const on = occupants();
      // One random draw, shared with `rackRow`, so we know which end it chose.
      const flip = random();
      const run = rackRow(
        spec,
        on.map((r) => ({
          width: r.width,
          depth: r.depth,
          outward: r.outward,
        })),
        { width: item.width, depth: item.depth, outward: item.outward },
        () => flip,
        yawFor,
      );
      if (!run.ok) return;
      // The new item went to the left end (index 0) or the right (the last).
      const rowOrder: Object3D[] =
        flip < 0.5
          ? [object, ...on.map((r) => r.object)]
          : [...on.map((r) => r.object), object];
      // Everything on the rack is the rack's (its local board plane):
      // re-parent the whole row under it, then set each to its row pose.
      rack.updateMatrixWorld(true);
      for (const each of rowOrder) rack.attach(each);
      const axis = new Vector3(0, 1, 0);
      run.row.forEach((pose, at) => {
        rowOrder[at].position.set(pose.x, 0, 0);
        rowOrder[at].quaternion.setFromAxisAngle(axis, pose.yaw);
        rowOrder[at].updateMatrixWorld(true);
      });
      portable.component.drop();
      portable.component.settle();
      portable.component.motion(0, true);
    },
  };
}
