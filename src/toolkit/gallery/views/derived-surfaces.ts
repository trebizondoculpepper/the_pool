import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import type { Object3D } from 'three';
import {
  EQUIPMENT_KINDS,
  isKindId,
  kindAffordances,
} from '../../../game/plant/equipment-kinds';
import {
  compositeTraits,
  expand,
  resolveMeta,
} from '../../../game/plant/traits';
import { isNonBody } from '../../components/core/views/non-body';
import { boundsModelOf } from '../../components/core/views/bounds-model';
import {
  blocksWalker,
  boxBetween,
  primitiveFootprint,
  primitiveTop,
} from '../../components/core/logic/bounds-model';
import type { Footprint } from '../../controls/logic/walk-collision';
import type { BoundsModel } from '../../components/core/logic/bounds-model';
import { deriveSurface, planeSurface } from '../logic/derived-surface';
import type { DerivedSurface, SurfaceSample } from '../logic/derived-surface';

/**
 * Each room's supportable and walkable surfaces, derived from the objects
 * that have those traits (missions 175, 181, 182; the owner, 2026-11-04):
 * for every placed object whose kind's traits include `supportable`
 * (`walkable` implies it), its top is found by casting rays straight down
 * on its body (the default, `surface=raycast`), or taken as a fixed plane
 * (`surface=plane`, `surfaceY`) where the kind says so. Ladders, guard
 * rails and anything else marked not part of the body (`markNonBody`)
 * never count. No rule names a kind or an object: the trait decides
 * whether, the geometry where.
 */

export { markNonBody } from '../../components/core/views/non-body';
export { markEquipmentKind } from '../../components/core/views/equipment-kind';

/** The kinds' surface traits, resolved once. */
function surfaceTraitsOf(kind: string) {
  if (!isKindId(kind)) return null;
  const k = EQUIPMENT_KINDS[kind];
  if (!k.traits?.length) return null;
  const composites = compositeTraits();
  const ps = expand(k.traits, composites).primitives as string[];
  if (!ps.includes('supportable')) return null;
  const meta = resolveMeta(k.traits, k.meta ?? {}, composites).values;
  return {
    walkable: ps.includes('walkable'),
    // Mission 208: its tops from its bounds model, not rays on its body.
    bounded: ps.includes('bounds-model'),
    // Mission 177: a box-like thing's bounding box is its shape — its top
    // is the box's own, found without raycasting its (or its decoration's)
    // meshes, exactly as a bounds-model with no declared model is.
    boxed: ps.includes('box-like'),
    mode: meta.surface === 'plane' ? ('plane' as const) : ('raycast' as const),
    surfaceY: typeof meta.surfaceY === 'number' ? meta.surfaceY : undefined,
  };
}

/**
 * The visible meshes of an object's body (its non-body parts left out, and
 * anything portable resting on or in it: a box on a desk is not the desk).
 */
function bodyMeshes(object: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  const walk = (o: Object3D) => {
    if (isNonBody(o) || o.visible === false || o.userData.portable) return;
    if (o instanceof Mesh) {
      const m = o.material as { opacity?: number; visible?: boolean };
      if (m.visible !== false && (m.opacity ?? 1) > 0) meshes.push(o);
    }
    for (const c of o.children) walk(c);
  };
  walk(object);
  return meshes;
}

/**
 * An object's bounds model and the object it is declared on (mission 208):
 * declared on the object, or on the built item a room has wrapped; else
 * one box fitted to its body, in its own frame. Null when it has no body.
 */
export function boundsModelFor(
  object: Object3D,
): { holder: Object3D; model: BoundsModel } | null {
  object.updateWorldMatrix(true, true);
  let holder: Object3D = object;
  let model: BoundsModel | undefined;
  object.traverse((o) => {
    if (model) return;
    model = boundsModelOf(o);
    if (model) holder = o;
  });
  if (model) return { holder, model };
  const meshes = bodyMeshes(object);
  if (!meshes.length) return null;
  const inverse = object.matrixWorld.clone().invert();
  const box = new Box3();
  for (const m of meshes) {
    m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox!.clone();
    b.applyMatrix4(m.matrixWorld).applyMatrix4(inverse);
    box.union(b);
  }
  return { holder: object, model: [boxBetween(box.min, box.max)] };
}

/**
 * A bounds-modelled object's surfaces (mission 208): each shape's flat top,
 * carried into the room by the object's world matrix (its scale, turn and
 * the room's metre), as the axis-aligned footprint of its four corners. A
 * kind with the trait but an object with no declared model gets one box
 * fitted to its body, in its own frame.
 */
export function boundedSurfaces(
  object: Object3D,
  walkable: boolean,
): DerivedSurface[] {
  const found = boundsModelFor(object);
  if (!found) return [];
  const { holder, model } = found;
  const surfaces: DerivedSurface[] = [];
  const corner = new Vector3();
  for (const p of model) {
    const t = primitiveTop(p);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let y = 0;
    for (const [x, z] of [
      [t.minX, t.minZ],
      [t.maxX, t.minZ],
      [t.minX, t.maxZ],
      [t.maxX, t.maxZ],
    ] as const) {
      corner.set(x, t.y, z).applyMatrix4(holder.matrixWorld);
      minX = Math.min(minX, corner.x);
      maxX = Math.max(maxX, corner.x);
      minZ = Math.min(minZ, corner.z);
      maxZ = Math.max(maxZ, corner.z);
      y = corner.y;
    }
    surfaces.push(planeSurface({ minX, maxX, minZ, maxZ }, y, walkable));
  }
  return surfaces;
}

/** One object's surface, from its body, in the room's scene units. */
export function objectSurface(
  object: Object3D,
  metre: number,
  traits: { walkable: boolean; mode: 'raycast' | 'plane'; surfaceY?: number },
): DerivedSurface | null {
  object.updateWorldMatrix(true, true);
  const meshes = bodyMeshes(object);
  if (!meshes.length) return null;
  const box = new Box3();
  for (const m of meshes) box.expandByObject(m);
  if (traits.mode === 'plane' && traits.surfaceY !== undefined) {
    const origin = new Vector3().setFromMatrixPosition(object.matrixWorld);
    return planeSurface(
      { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z },
      origin.y + traits.surfaceY * metre,
      traits.walkable,
    );
  }
  const spacing = 0.1 * metre;
  const nx = Math.min(
    80,
    Math.max(2, Math.ceil((box.max.x - box.min.x) / spacing)),
  );
  const nz = Math.min(
    80,
    Math.max(2, Math.ceil((box.max.z - box.min.z) / spacing)),
  );
  const ray = new Raycaster();
  const down = new Vector3(0, -1, 0);
  const normal = new Vector3();
  const samples: SurfaceSample[] = [];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      const x = box.min.x + ((box.max.x - box.min.x) * i) / nx;
      const z = box.min.z + ((box.max.z - box.min.z) * j) / nz;
      ray.set(new Vector3(x, box.max.y + metre, z), down);
      let y: number | null = null;
      for (const hit of ray.intersectObjects(meshes, false)) {
        if (!hit.face) continue;
        normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        if (normal.y > 0.9) {
          y = hit.point.y;
          break;
        }
      }
      samples.push({ x, z, y });
    }
  return deriveSurface(samples, {
    tolerance: 0.01 * metre,
    step: 0.3 * metre,
    walkable: traits.walkable,
  });
}

const cache = new WeakMap<
  Object3D,
  { signature: string; surfaces: DerivedSurface[] }
>();

/**
 * What the room holds, cheaply (asked every frame): its top-level groups, so
 * a cache knows when machines have been added to it since.
 */
const signatureOf = (root: Object3D): string => String(root.children.length);

/**
 * A room's surfaces: every placed object with a supportable trait, derived
 * when first asked and again whenever the room's contents change (a room
 * may make its walker before its machines are added: an answer cached
 * then would be empty for ever).
 */
export function roomSurfaces(root: Object3D, metre: number): DerivedSurface[] {
  const signature = signatureOf(root);
  const known = cache.get(root);
  if (known && known.signature === signature) return known.surfaces;
  const surfaces: DerivedSurface[] = [];
  root.traverse((o) => {
    const kind = o.userData.equipmentKind as string | undefined;
    if (!kind) return;
    const traits = surfaceTraitsOf(kind);
    if (!traits) return;
    // A declared plane (`surface=plane`, `surfaceY`) wins over both the
    // raycast and the box-like/bounds box: it says exactly where the top
    // is (bala_qasim's point on PR #27).
    if (traits.mode === 'plane') {
      const s = objectSurface(o, metre, traits);
      if (s) surfaces.push(s);
      return;
    }
    if (traits.bounded || traits.boxed) {
      surfaces.push(...boundedSurfaces(o, traits.walkable));
      return;
    }
    const s = objectSurface(o, metre, traits);
    if (s) surfaces.push(s);
  });
  cache.set(root, { signature, surfaces });
  return surfaces;
}

/** Forget a room's surfaces, so they are derived afresh (after something has moved). */
export const forgetSurfaces = (root: Object3D) => {
  cache.delete(root);
  solidCache.delete(root);
};

/** How high above the floor a shape must reach to let the walker pass under, metres. */
export const SOLID_HEADROOM = 2;

/**
 * Whether a kind blocks the walker by its bounds model (mission 208, stage
 * 2): it is solid (the default; `open-frame`, `run-like` and decoration
 * opt out), it has the `bounds-model` trait, and it is not walkable (a
 * walkable top's edges are its drop rule's, 182). Resolved once per kind.
 */
const solidKinds = new Map<string, boolean>();
function blocksByBounds(kind: string): boolean {
  let known = solidKinds.get(kind);
  if (known === undefined) {
    known = false;
    if (isKindId(kind)) {
      const k = EQUIPMENT_KINDS[kind];
      if (k.traits?.length) {
        const ps = expand(k.traits, compositeTraits()).primitives as string[];
        known =
          ps.includes('bounds-model') &&
          !ps.includes('walkable') &&
          kindAffordances(kind).solid;
      }
    }
    solidKinds.set(kind, known);
  }
  return known;
}

/** One object's solid footprints, from its bounds model, in world units. */
export function boundedSolids(object: Object3D, metre: number): Footprint[] {
  const found = boundsModelFor(object);
  if (!found) return [];
  const { holder, model } = found;
  const at = new Vector3();
  const toWorld = (v: { x: number; y: number; z: number }) => {
    at.set(v.x, v.y, v.z).applyMatrix4(holder.matrixWorld);
    return { x: at.x, y: at.y, z: at.z };
  };
  // The floor it stands on: its own foot (the object's origin).
  const floor = object.getWorldPosition(new Vector3()).y;
  const out: Footprint[] = [];
  for (const p of model) {
    const f = primitiveFootprint(p, toWorld);
    if (!blocksWalker(f, floor, SOLID_HEADROOM * metre)) continue;
    out.push({ minX: f.minX, maxX: f.maxX, minZ: f.minZ, maxZ: f.maxZ });
  }
  return out;
}

const solidCache = new WeakMap<
  Object3D,
  { signature: string; solids: Footprint[] }
>();

/**
 * A room's solids from its objects' bounds models (mission 208, stage 2):
 * every placed object of a solid, bounds-modelled kind blocks the walker,
 * what is carried, and what is thrown (211's rebounds use the same
 * footprints), from its declared shapes. Cached like the surfaces, and
 * forgotten with them.
 */
export function roomSolids(root: Object3D, metre: number): Footprint[] {
  const signature = signatureOf(root);
  const known = solidCache.get(root);
  if (known && known.signature === signature) return known.solids;
  const solids: Footprint[] = [];
  root.traverse((o) => {
    const kind = o.userData.equipmentKind as string | undefined;
    if (kind && blocksByBounds(kind)) solids.push(...boundedSolids(o, metre));
  });
  solidCache.set(root, { signature, solids });
  return solids;
}
