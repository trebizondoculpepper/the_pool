import {
  Box3,
  InstancedMesh,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import {
  componentOf,
  owningComponent,
} from '../../components/core/views/component-identity';
import { centreOf } from '../logic/look-camera';
import { auditRoom, lookTargets } from '../logic/look-audit';
import type {
  ExpectedControl,
  ExpectedEntry,
  FrontLook,
  HiddenSign,
  LooseMesh,
  RoomAudit,
  RoomInventory,
  ScannedOwner,
} from '../logic/look-audit';
import { lookCatalogue } from '../logic/look-catalogue';
import type { KindCatalogueInput } from '../logic/kind-catalogue';
import { objectClass } from '../logic/object-class';
import { INSTALLED_ASSET_IDS } from '../../../game/plant/installed-asset-ids';
import { objectDescriptors } from '../../../game/descriptors/registry';
import { blocks, boxOf, lookAt } from './look-scene';
import type { LookRoom } from './look-scene';

/**
 * The look audit's scene scanner (mission 127), shared with 129's room
 * audit: one walk of a built room's scene for every marked owner (125's
 * `lookOwners`, with fabric skipped and architectural components kept) and
 * every mesh with no marked owner; then each target's front look. The
 * room is built by the game itself (the room-build adapter, `?audit=look`
 * in `main.ts`), so what is scanned is what the game draws.
 */

/** Whether `o` or a parent is drawn as an effect, or is the services ceiling: set dressing by rule. */
const dressing = (o: Object3D) => {
  for (let p: Object3D | null = o; p; p = p.parent)
    if (p.name === 'Services ceiling' || p.userData.effect) return true;
  return false;
};

const WORDED = /\b(sign|notice|poster|plaque|placard)\b/i;

/** The nearest named ancestor's name, with up to two named above it. */
function placeOf(o: Object3D) {
  const names: string[] = [];
  for (let p: Object3D | null = o; p && names.length < 3; p = p.parent)
    if (p.name && p.type !== 'Scene') names.unshift(p.name);
  return names.length ? names.join(' / ') : '(unnamed)';
}

/** Every owner and loose mesh of `scene`, in metres. */
export function scanScene(scene: Object3D, metre: number) {
  const owners: ScannedOwner[] = [];
  const objects: Object3D[] = [];
  const loose: LooseMesh[] = [];
  const hiddenSigns: HiddenSign[] = [];
  const index = new Map<Object3D, number>();
  scene.updateMatrixWorld(true);
  const box = new Box3();
  scene.traverse((o) => {
    const identity = componentOf(o);
    if (identity?.decorative && WORDED.test(o.name) && !identity.architectural)
      hiddenSigns.push({ name: o.name });
    if (
      identity &&
      !identity.decorative &&
      !identity.fabric &&
      (identity.tag || identity.name || identity.model || identity.part)
    ) {
      const ancestors: number[] = [];
      for (let p = o.parent; p; p = p.parent) {
        const i = index.get(p);
        if (i !== undefined) ancestors.unshift(i);
      }
      index.set(o, owners.length);
      objects.push(o);
      owners.push({
        ...(identity.tag ? { tag: identity.tag } : {}),
        ...(identity.name ? { name: identity.name } : {}),
        ...(identity.model ? { model: identity.model } : {}),
        ...(identity.part ? { part: { label: identity.part.label } } : {}),
        ...(identity.key ? { key: identity.key } : {}),
        ...(identity.architectural ? { architectural: true } : {}),
        ancestors,
        box: boxOf([o], metre),
      });
    }
    if (!(o instanceof Mesh) && !(o instanceof InstancedMesh)) return;
    if (owningComponent(o) || dressing(o)) return;
    box.setFromObject(o);
    if (box.isEmpty()) return;
    const sx = (box.max.x - box.min.x) / metre,
      sy = (box.max.y - box.min.y) / metre,
      sz = (box.max.z - box.min.z) / metre;
    loose.push({
      under: placeOf(o),
      size: Math.max(sx, sy, sz),
      volume: sx * sy * sz,
    });
  });
  return { owners, objects, loose, hiddenSigns };
}

/** Whether something solid stands within 0.3 m in front of the target. */
function wallAhead(
  scene: Object3D,
  target: readonly Object3D[],
  metre: number,
): boolean {
  const b = boxOf(target, metre);
  if (!b) return false;
  const q = new Quaternion();
  target[0].getWorldQuaternion(q);
  const dir = new Vector3(0, 0, 1).applyQuaternion(q);
  dir.y = 0;
  if (dir.lengthSq() < 0.01) return false;
  dir.normalize();
  const c = centreOf(b);
  const half =
    (Math.abs(dir.x) * (b.max.x - b.min.x) +
      Math.abs(dir.z) * (b.max.z - b.min.z)) /
    2;
  const own = new Set(target);
  const inside = (o: Object3D) => {
    for (let p: Object3D | null = o; p; p = p.parent)
      if (own.has(p)) return true;
    return false;
  };
  const ray = new Raycaster(
    new Vector3(c.x * metre, c.y * metre, c.z * metre),
    dir,
    0,
    (half + 0.3) * metre,
  );
  ray.camera = new PerspectiveCamera();
  return ray
    .intersectObject(scene, true)
    .some(
      (h) =>
        !inside(h.object) &&
        blocks(h.object) &&
        h.distance > half * metre * 0.5,
    );
}

/** What the data expects in `room`: its catalogue entries (126) and the register's. */
export function expectedIn(
  room: string,
  input: KindCatalogueInput = {},
): ExpectedEntry[] {
  const entries: ExpectedEntry[] = lookCatalogue(room, input).map((e) => ({
    ref: e.ref,
    title: e.title,
    kind: e.kind,
    look: e.look,
    source: 'catalogue',
  }));
  const refs = new Set(entries.map((e) => e.ref.toLowerCase()));
  for (const [key, a] of Object.entries(INSTALLED_ASSET_IDS)) {
    const [r, item, label] = key.split('|');
    if (r !== room || refs.has(a.tag.toLowerCase())) continue;
    entries.push({
      ref: a.tag,
      title: label,
      kind: item.split(':')[0],
      look: 'expected',
      source: 'register',
    });
  }
  return entries;
}

/** The descriptors' (131) controls in `room`. */
export const controlsIn = (room: string): ExpectedControl[] =>
  objectDescriptors(room).flatMap((d) =>
    d.controls.map((c) => ({ ref: c.ref, label: c.label })),
  );

/** Audit a built room: scan it, look at each target from the front, and judge. */
export function auditBuiltRoom(
  look: LookRoom,
  room: string,
  options: {
    hook: boolean;
    input?: KindCatalogueInput;
    build?: number;
    fronts?: boolean;
  },
): RoomAudit {
  const t0 = performance.now();
  const scan = scanScene(look.scene, look.metre);
  const fronts: Record<string, FrontLook> = {};
  if (options.fronts !== false)
    for (const t of lookTargets(scan.owners)) {
      const outcome = lookAt(look, scan.objects, t, 'front', 0.8, true);
      if (!outcome.ok || !outcome.pose) continue;
      fronts[t.ref] = {
        seen: outcome.seen ?? 0,
        noclip: outcome.pose.noclip,
        wallAhead: wallAhead(
          look.scene,
          t.members.map((i) => scan.objects[i]),
          look.metre,
        ),
      };
    }
  const inventory: RoomInventory = {
    room,
    hook: options.hook,
    owners: scan.owners,
    loose: scan.loose,
    hiddenSigns: scan.hiddenSigns,
    fronts,
    expected: expectedIn(room, options.input),
    controls: controlsIn(room),
    timing: {
      build: Math.round(options.build ?? 0),
      scan: Math.round(performance.now() - t0),
    },
  };
  return auditRoom(inventory, objectClass);
}
