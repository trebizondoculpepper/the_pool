import {
  Box3,
  InstancedMesh,
  Mesh,
  Quaternion,
  Raycaster,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { componentOf } from '../../components/core/views/component-identity';
import { overlaps } from '../../controls/logic/walk-collision';
import type { Footprint } from '../../controls/logic/walk-collision';
import type { FlightBounds } from '../../controls/logic/noclip';
import {
  LOOK_LIMITS,
  centreOf,
  chooseLook,
  cornersOf,
  lookCandidates,
} from '../logic/look-camera';
import type { LookBox, LookCandidate, Vec3 } from '../logic/look-camera';
import { resolveLookRef } from '../logic/look-ref';
import type { LookMode, LookOwner } from '../logic/look-ref';

/**
 * A look link's work in a room's scene (mission 125,
 * `doc/plans/125-look-links.md`): find the marked owners the ref names,
 * their bounds and front, test the pure module's candidates against the
 * room's walk collision and by nine rays each, and choose. Everything here
 * is in the scene's units except what it hands back, which is in metres
 * (and the pose's yaw and pitch in radians).
 */

/** What the room gives a look: its scene and walk surface (`lookSurface`). */
export interface LookRoom {
  scene: Object3D;
  /** Scene units per metre. */
  metre: number;
  floorY: number;
  /** The floor under (x, z) nearest `near`, scene units (a room of several levels). */
  floorAt?: (x: number, z: number, near: number) => number;
  /** Its solids now: asked after its floor, as a room of several levels has each its own. */
  solids: () => readonly Footprint[];
  bounds: FlightBounds;
  /** Vertical field of view at zoom 1, degrees; width over height. */
  fov: number;
  aspect: number;
}

export interface LookOutcome {
  ok: boolean;
  /** The ref that names what it looked at, or why not. */
  ref?: string;
  reason?: string;
  matches?: readonly string[];
  /** Metres and radians; `y` the eye's height. */
  pose?: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    zoom: number;
    noclip: boolean;
  };
  seen?: number;
  /** What it framed: its world box, metres. */
  box?: LookBox;
  candidates?: readonly (LookCandidate & {
    walkable: boolean;
    seen: number;
  })[];
  warnings: string[];
}

/** Every marked owner in `root`, in scene order, with its marked ancestors. */
export function lookOwners(root: Object3D) {
  const owners: LookOwner[] = [];
  const objects: Object3D[] = [];
  const index = new Map<Object3D, number>();
  root.traverse((o) => {
    const identity = componentOf(o);
    if (!identity || identity.decorative) return;
    if (!identity.tag && !identity.name && !identity.model && !identity.part)
      return;
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
      ancestors,
    });
  });
  return { owners, objects };
}

/** The world box of `objects` and everything under them, in metres. */
function boxOf(objects: readonly Object3D[], metre: number): LookBox | null {
  const box = new Box3();
  for (const o of objects) {
    o.updateWorldMatrix(true, true);
    box.union(new Box3().setFromObject(o));
  }
  if (box.isEmpty()) return null;
  return {
    min: {
      x: box.min.x / metre,
      y: box.min.y / metre,
      z: box.min.z / metre,
    },
    max: {
      x: box.max.x / metre,
      y: box.max.y / metre,
      z: box.max.z / metre,
    },
  };
}

/** Its front: its own +z, in the world. */
function frontOf(object: Object3D): Vec3 {
  const q = new Quaternion();
  object.getWorldQuaternion(q);
  const v = new Vector3(0, 0, 1).applyQuaternion(q);
  return { x: v.x, y: v.y, z: v.z };
}

const shown = (object: Object3D) => {
  for (let o: Object3D | null = object; o; o = o.parent)
    if (!o.visible) return false;
  return true;
};

/** Whether a hit mesh hides what is behind it. */
function blocks(object: Object3D) {
  if (!(object instanceof Mesh) && !(object instanceof InstancedMesh))
    return false;
  if (!shown(object)) return false;
  for (let o: Object3D | null = object; o; o = o.parent)
    if (o.name === 'Services ceiling' || o.userData.effect) return false;
  const materials = (
    Array.isArray(object.material) ? object.material : [object.material]
  ) as Material[];
  return materials.some(
    (m) => m.visible && !(m.transparent && m.opacity < 0.5) && m.opacity >= 0.5,
  );
}

/** How many of the nine rays from `eye` reach the box (its centre and corners). */
function raysSeen(
  scene: Object3D,
  eye: Vec3,
  box: LookBox,
  target: ReadonlySet<Object3D>,
  metre: number,
) {
  const centre = centreOf(box);
  // The corners drawn a little in, so a ray grazing a neighbour's face
  // at the very edge does not count against it.
  const points = [
    centre,
    ...cornersOf(box).map((c) => ({
      x: centre.x + (c.x - centre.x) * 0.9,
      y: centre.y + (c.y - centre.y) * 0.9,
      z: centre.z + (c.z - centre.z) * 0.9,
    })),
  ];
  const ray = new Raycaster();
  const from = new Vector3(eye.x * metre, eye.y * metre, eye.z * metre);
  const inTarget = (o: Object3D) => {
    for (let p: Object3D | null = o; p; p = p.parent)
      if (target.has(p)) return true;
    return false;
  };
  let seen = 0;
  for (const p of points) {
    const to = new Vector3(p.x * metre, p.y * metre, p.z * metre);
    const far = from.distanceTo(to);
    ray.set(from, to.clone().sub(from).normalize());
    ray.far = far;
    const hit = ray
      .intersectObject(scene, true)
      .find((h) => h.distance < far * 0.995 && blocks(h.object));
    if (!hit || inTarget(hit.object)) seen++;
  }
  return seen;
}

/** Whether a walker could stand at (x, z), metres. */
function standable(
  room: LookRoom,
  solids: readonly Footprint[],
  x: number,
  z: number,
) {
  const m = room.metre;
  const b = room.bounds;
  const sx = x * m,
    sz = z * m;
  if (sx < b.minX || sx > b.maxX || sz < b.minZ || sz > b.maxZ) return false;
  return !solids.some((s) => overlaps(s, sx, sz, LOOK_LIMITS.radius * m));
}

/** Look at what `ref` names in `room`, in `mode`, filling `fit` of the frame. */
export function lookIn(
  room: LookRoom,
  roomId: string,
  ref: string,
  mode: LookMode,
  fit: number,
): LookOutcome {
  const { owners, objects } = lookOwners(room.scene);
  const resolved = resolveLookRef(owners, ref, roomId);
  if (!resolved.ok)
    return {
      ok: false,
      reason: resolved.reason,
      ...(resolved.matches ? { matches: resolved.matches } : {}),
      warnings: [],
    };
  const warnings: string[] = [];
  const { target } = resolved;
  if (mode === 'detail' && !target.part)
    warnings.push('detail wants a part (ref/part): framed the whole object');
  const framed = (target.part?.members ?? target.members).map(
    (i) => objects[i],
  );
  const box = boxOf(framed, room.metre);
  if (!box)
    return {
      ok: false,
      ref: target.ref,
      reason: `${target.ref} has nothing to see`,
      warnings,
    };
  const m = room.metre;
  // The floor it stands on: a room of several levels (a deck over a pit)
  // is looked at from its own level.
  const centre = centreOf(box);
  const floorY = room.floorAt
    ? room.floorAt(centre.x * m, centre.z * m, box.min.y * m) / m
    : room.floorY / m;
  const candidates = lookCandidates({
    box,
    front: frontOf(framed[0]),
    mode,
    fit,
    fov: room.fov,
    aspect: room.aspect,
    room: {
      minX: room.bounds.minX / m,
      maxX: room.bounds.maxX / m,
      minZ: room.bounds.minZ / m,
      maxZ: room.bounds.maxZ / m,
    },
    floorY,
  });
  if (!candidates.length)
    return {
      ok: false,
      ref: target.ref,
      reason: `no room to stand in to see ${target.ref}`,
      warnings,
    };
  // The whole target hides nothing of itself (a part's own panel included).
  const own = new Set(target.members.map((i) => objects[i]));
  const solids = room.solids();
  const results = candidates.map((c) => {
    const walkable = standable(room, solids, c.x, c.z);
    return {
      ...c,
      walkable,
      seen: walkable ? raysSeen(room.scene, c, box, own, m) : 0,
    };
  });
  const choice = chooseLook(results);
  warnings.push(...choice.warnings);
  const chosen = results[choice.index];
  const seen = choice.noclip
    ? raysSeen(room.scene, chosen, box, own, m)
    : chosen.seen;
  return {
    ok: true,
    ref: target.part?.ref ?? target.ref,
    pose: {
      x: chosen.x,
      y: chosen.y,
      z: chosen.z,
      yaw: chosen.yaw,
      pitch: chosen.pitch,
      zoom: chosen.zoom,
      noclip: choice.noclip,
    },
    seen,
    box,
    candidates: results,
    warnings,
  };
}
