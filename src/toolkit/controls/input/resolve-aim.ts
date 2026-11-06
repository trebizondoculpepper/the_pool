import { Matrix4, Mesh, Raycaster, Vector2, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { useRegistrationOf, visibleAll } from './use-marking';
import type { UseRegistration } from './use-marking';

/**
 * The one aim resolution (mission 161, step 2): the click and the crosshair's
 * cue both come from here, so they cannot disagree. One raycast from the eye
 * through a normalised screen point, the first visible mesh it meets, and
 * that hit's one registration (`useRegistrationOf`: the nearest `usable`,
 * and that same object's action, never a separate walk). The cue answers the
 * registration; the click runs its action only when the answer is possible.
 *
 * The hit is cached while the eye stands still (the aim moves show it); the
 * answer is asked afresh every probe, because a use changes it without a
 * move. #10's interactive gate slots into this one function.
 */

/** Enough of the eye's state to tell whether the aim has moved. */
export interface AimEye {
  /** The eye's world matrix when the hit was cast. */
  matrix: Matrix4;
}

/** What the aim resolved to: the hit and its registration. */
export interface AimResolution {
  /** The first visible mesh the ray met (an occluder in front hides the rest). */
  hit: Object3D;
  /** The thing under the aim: how it answers, and what a click does. */
  registration: UseRegistration;
  /** The world point the ray met. */
  point: Vector3;
}

/** A resolution's cached state, kept while the aim stands still. */
export interface AimCache {
  x: number;
  y: number;
  reach: number;
  since: number;
  eye: Matrix4;
  found: AimResolution | null;
  /** How long a hit is kept while the aim stands still, ms. */
  keptFor: number;
}

/** An empty cache: the next `resolveAim` casts the eye's own ray. */
export function aimCache(keptFor = 500): AimCache {
  return {
    x: 0,
    y: 0,
    reach: 0,
    since: -Infinity,
    eye: new Matrix4(),
    found: null,
    keptFor,
  };
}

/**
 * Resolve a use aim at a normalised screen point (centre 0, 0) to the first
 * visible thing and its registration, or null when nothing is met or nothing
 * is registered there. Asking changes nothing. `ray` and `pointer` are the
 * caller's own, so the caller and this function share one raycast when they
 * can: the caller's `cache` is refreshed here and reused by the next call at
 * the same aim.
 */
export function resolveAim(
  scene: Object3D,
  camera: Camera,
  metre: number,
  x: number,
  y: number,
  reach: number,
  now: number,
  ray: Raycaster,
  pointer: Vector2,
  cache: AimCache,
): AimResolution | null {
  camera.updateMatrixWorld();
  const still =
    cache.x === x &&
    cache.y === y &&
    cache.reach === reach &&
    now - cache.since < cache.keptFor &&
    cache.eye.equals(camera.matrixWorld);
  if (!still) {
    ray.setFromCamera(pointer.set(x, y), camera);
    ray.far = reach * metre;
    const first = ray
      .intersectObject(scene, true)
      .find((h) => (h.object as Mesh).isMesh && visibleAll(h.object));
    cache.eye.copy(camera.matrixWorld);
    cache.x = x;
    cache.y = y;
    cache.reach = reach;
    cache.since = now;
    if (!first) {
      cache.found = null;
    } else {
      const registration = useRegistrationOf(first.object);
      cache.found = registration
        ? { hit: first.object, registration, point: first.point.clone() }
        : null;
    }
  }
  const found = cache.found;
  if (!found || !visibleAll(found.registration.object)) return null;
  return found;
}

/** Whether a thing at `hit` would register at all (a decoration never). */
export const hasRegistration = (object: Object3D) =>
  useRegistrationOf(object) !== null;
