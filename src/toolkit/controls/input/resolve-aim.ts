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
 * move. A click casts fresh (`fresh: true`) so it never acts on a thing
 * moved or removed within the cache window; it then refreshes the cache.
 * #10's interactive gate slots into this one function.
 */

/** What the aim resolved to: the hit and its registration. */
export interface AimResolution {
  /** The first visible mesh the ray met (an occluder in front hides the rest). */
  hit: Object3D;
  /** The thing under the aim: how it answers, and what a click does. */
  registration: UseRegistration;
  /** The world point the ray met (the click gets its own copy). */
  point: Vector3;
  /** The texture coordinates at the hit, for a touch surface's own questions. */
  uv?: { x: number; y: number } | null;
}

/** A resolution's cached state, kept while the aim stands still. */
export interface AimCache {
  x: number;
  y: number;
  reach: number;
  since: number;
  eye: Matrix4;
  projection: Matrix4;
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
    projection: new Matrix4(),
    found: null,
    keptFor,
  };
}

/** What a resolution is asked with: the scene, the eye and the aim's rule. */
export interface AimOptions {
  scene: Object3D;
  camera: Camera;
  /** Scene units per metre: the far plane is `reach` metres. */
  metre: number;
  /** The normalised screen point of the aim, -1 to 1 (centre 0, 0). */
  x: number;
  y: number;
  /** How far the aim reaches, metres. */
  reach: number;
  /** Now, ms: whether the cache is still valid. */
  now: number;
  /** The caller's own ray and pointer, so one raycast is shared. */
  ray: Raycaster;
  pointer: Vector2;
  cache: AimCache;
  /** Cast fresh whatever the cache says (a click, never on a stale hit). */
  fresh?: boolean;
}

/**
 * Resolve a use aim to the first visible thing and its registration, or null
 * when nothing is met or nothing is registered there. Asking changes nothing.
 * A resolution's `point` is the cache's own object: ask for a copy with the
 * same `fresh` reset (a click) before the answer is reused.
 */
export function resolveAim(options: AimOptions): AimResolution | null {
  const { scene, camera, metre, x, y, reach, now, ray, pointer, cache } =
    options;
  camera.updateMatrixWorld();
  const still =
    !options.fresh &&
    cache.x === x &&
    cache.y === y &&
    cache.reach === reach &&
    now - cache.since < cache.keptFor &&
    cache.eye.equals(camera.matrixWorld) &&
    cache.projection.equals(camera.projectionMatrix);
  if (!still) {
    ray.setFromCamera(pointer.set(x, y), camera);
    ray.far = reach * metre;
    const first = ray
      .intersectObject(scene, true)
      .find((h) => (h.object as Mesh).isMesh && visibleAll(h.object));
    cache.eye.copy(camera.matrixWorld);
    cache.projection.copy(camera.projectionMatrix);
    cache.x = x;
    cache.y = y;
    cache.reach = reach;
    cache.since = now;
    if (!first) {
      cache.found = null;
    } else {
      const registration = useRegistrationOf(first.object);
      cache.found = registration
        ? {
            hit: first.object,
            registration,
            point: first.point.clone(),
            uv: first.uv,
          }
        : null;
    }
  }
  const found = cache.found;
  if (!found || !visibleAll(found.registration.object)) return null;
  // A seen-but-unregistered thing (a mark removed, a decoration moved over)
  // is not the aim's: the registration is asked afresh each probe, so it is
  // refreshed here too rather than answered from a stale cache entry. The
  // cache is updated so the next probe does not re-walk.
  const registration = useRegistrationOf(found.hit);
  if (!registration) {
    cache.found = null;
    return null;
  }
  if (registration !== found.registration) {
    cache.found = {
      hit: found.hit,
      registration,
      point: found.point.clone(),
      uv: found.uv,
    };
    return cache.found;
  }
  return found;
}

/**
 * The click's decision from a resolution (mission 161, step 2): whether the
 * click runs the registration's action ('run'), runs the room's own `use`
 * ('room' — nothing is registered; accepted, deprecated, during migration),
 * or does nothing ('nothing' — the registration's answer says the use is
 * not possible now, and the cue showed it red). Pure; the click is its only
 * caller (the cue draws the registration's answer directly).
 */
export type ClickOutcome = 'run' | 'room' | 'nothing';

export function clickOutcome(
  registered: UseRegistration | null | undefined,
  answer: ReturnType<UseRegistration['usable']> | null | undefined,
): ClickOutcome {
  if (!registered?.action) return 'room';
  return answer?.possible ? 'run' : 'nothing';
}
