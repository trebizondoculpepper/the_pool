import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import type { Object3D } from 'three';
import { EQUIPMENT_KINDS, isKindId } from '../../../game/plant/equipment-kinds';
import {
  compositeTraits,
  expand,
  resolveMeta,
} from '../../../game/plant/traits';
import { isNonBody } from '../../components/core/views/non-body';
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
    const s = objectSurface(o, metre, traits);
    if (s) surfaces.push(s);
  });
  cache.set(root, { signature, surfaces });
  return surfaces;
}

/** Forget a room's surfaces, so they are derived afresh (after something has moved). */
export const forgetSurfaces = (root: Object3D) => cache.delete(root);
