import { describe, expect, it, vi } from 'vite-plus/test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import { markReach, markUsable, useRegistrationOf } from './use-marking';
import { aimCache, clickOutcome, resolveAim } from './resolve-aim';
import type { UseQuery } from './use-marking';
import type { UseAnswer } from '../logic/use-cue';

/**
 * The one aim resolution (mission 161, step 2): the click and the cue take
 * the same first visible hit and the same registration, so they cannot
 * disagree. An actionable mark answers and runs on the click; a mesh met
 * but registered nowhere keeps its hit with a null registration (a seat
 * the click may sit on, a decoration the room's `use` may take); an
 * occluding mesh stops the marked thing behind it.
 */

const TURN: UseAnswer = { gesture: 'turn', direction: 1, possible: true };
const turnable = () => TURN;

function fixture() {
  const scene = new Scene();
  const camera = new PerspectiveCamera(52, 1, 0.05, 40);
  camera.position.set(0, 1.2, 2);
  camera.lookAt(0, 1.2, 0);
  const inFrontOf = (z = -1) => {
    const mesh = new Mesh(
      new BoxGeometry(0.4, 0.4, 0.05),
      new MeshBasicMaterial(),
    );
    mesh.position.set(0, 1.2, z);
    scene.add(mesh);
    scene.updateMatrixWorld(true);
    return mesh;
  };
  return { scene, camera, inFrontOf };
}

const resolve = (scene: Scene, camera: PerspectiveCamera) => {
  const ray = new Raycaster();
  const point = new Vector2();
  const cache = aimCache();
  return resolveAim({
    scene,
    camera,
    metre: 1,
    x: 0,
    y: 0,
    reach: 4,
    now: 0,
    ray,
    pointer: point,
    cache,
  });
};

describe('the one aim resolution (mission 161)', () => {
  it('an actionable mark answers (a cue) and resolves to the same target for the click', () => {
    const { scene, camera, inFrontOf } = fixture();
    const knob = inFrontOf();
    let pressed = 0;
    markUsable(knob, turnable, () => {
      pressed++;
    });
    const found = resolve(scene, camera);
    expect(found).not.toBeNull();
    if (!found || !found.registration) return;
    expect(found.registration.object).toBe(knob);
    // The cue asks the same registration the resolution gives; the click
    // runs that registration's action on the same query.
    const at: UseQuery = {
      object: found.registration.object,
      hit: found.hit,
      point: found.point,
      camera,
      x: 0,
      pad: false,
    };
    expect(found.registration.usable(at)).toBe(TURN);
    found.registration.action?.(at);
    expect(pressed).toBe(1);
  });

  it('an occluder in front stops the marked thing behind it', () => {
    const { scene, camera, inFrontOf } = fixture();
    const knob = inFrontOf(-2); // behind
    const occluder = inFrontOf(-1); // an unmarked mesh in front hides it
    markUsable(knob, turnable, () => {});
    // The occluder is what the ray met: the knob behind it is never the
    // aim's (its registration is null), so the cue and the click stop here.
    const found = resolve(scene, camera);
    expect(found?.hit).toBe(occluder);
    expect(found?.registration).toBeNull();
  });

  it('a hit registered nowhere keeps its hit with a null registration', () => {
    const { scene, camera, inFrontOf } = fixture();
    const decoration = inFrontOf(); // no mark at all
    const found = resolve(scene, camera);
    expect(found?.hit).toBe(decoration);
    expect(found?.registration).toBeNull();
  });

  it('a mark added after the cast is picked up on the next probe of the same cache', () => {
    const { scene, camera, inFrontOf } = fixture();
    const mesh = inFrontOf(); // no mark yet
    const ray = new Raycaster();
    const point = new Vector2();
    const cache = aimCache();
    const options = {
      scene,
      camera,
      metre: 1,
      x: 0,
      y: 0,
      reach: 4,
      now: 0,
      ray,
      pointer: point,
      cache,
    } as const;
    const before = resolveAim(options);
    expect(before?.registration).toBeNull();
    markUsable(mesh, turnable, () => {});
    const after = resolveAim(options);
    expect(after?.registration?.object).toBe(mesh);
  });

  it('caches the same hit while the eye stands still (one raycast)', () => {
    const { scene, camera, inFrontOf } = fixture();
    const knob = inFrontOf();
    markUsable(knob, turnable, () => {});
    const ray = new Raycaster();
    const cast = vi.spyOn(ray, 'intersectObject');
    const point = new Vector2();
    const cache = aimCache();
    const options = {
      scene,
      camera,
      metre: 1,
      x: 0,
      y: 0,
      reach: 4,
      now: 0,
      ray,
      pointer: point,
      cache,
    } as const;
    const a = resolveAim(options);
    expect(a?.registration?.object).toBe(knob);
    // A second probe within the window casts no new ray: the same hit.
    expect(resolveAim(options)?.registration?.object).toBe(knob);
    expect(cast).toHaveBeenCalledTimes(1);
    // Move the thing out of the way: within the window, the still aim still
    // reports the cached registration; a fresh resolution casts again and
    // sees it gone.
    scene.remove(knob);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const cached = resolveAim(options);
    expect(cached?.registration?.object).toBe(knob);
    expect(cast).toHaveBeenCalledTimes(1);
    const fresh = resolveAim({ ...options, fresh: true });
    expect(fresh).toBeNull();
    expect(cast).toHaveBeenCalledTimes(2);
  });

  it('the click gate: run when possible, nothing when refused, the room when unregistered', () => {
    // A registration with an action and a possible answer runs.
    const knob = new Group();
    markUsable(knob, turnable, () => {});
    const registration = useRegistrationOf(knob)!;
    expect(clickOutcome(registration, TURN)).toBe('run');
    // The same registration refused: nothing (the cue showed it red).
    const refused: UseAnswer = {
      gesture: 'turn',
      direction: 1,
      possible: false,
    };
    expect(clickOutcome(registration, refused)).toBe('nothing');
    // No registration (or one without an action): the room's `use` still
    // runs, accepted and deprecated, during migration.
    expect(clickOutcome(null, null)).toBe('room');
    const answerOnly = new Group();
    markUsable(answerOnly, turnable); // no action
    expect(clickOutcome(useRegistrationOf(answerOnly), TURN)).toBe('room');
  });
});

describe('a use’s own reach (mission 161; the owner, 2026-11-06)', () => {
  it('within its reach it resolves; beyond, nothing does, for the cue and the click', () => {
    const { scene, camera, inFrontOf } = fixture();
    // The camera is 3 m from a thing at z = −1.
    const knob = inFrontOf();
    markUsable(knob, turnable, () => {});
    expect(resolve(scene, camera)?.registration?.object).toBe(knob);
    markReach(knob, 2);
    expect(resolve(scene, camera)).toBeNull();
    markReach(knob, 3.5);
    expect(resolve(scene, camera)?.registration?.reach).toBe(3.5);
  });

  it('a use with no reach of its own takes the aim’s', () => {
    const { scene, camera, inFrontOf } = fixture();
    const knob = inFrontOf();
    markUsable(knob, turnable, () => {});
    expect(useRegistrationOf(knob)?.reach).toBeUndefined();
    expect(resolve(scene, camera)?.registration?.object).toBe(knob);
  });
});

describe('an unregistered hit (ahnaa_dmitrieva’s review of PR #46)', () => {
  it('keeps its cached entry from probe to probe, with no new allocation', () => {
    const { scene, camera, inFrontOf } = fixture();
    inFrontOf(); // a wall: registered nowhere
    const ray = new Raycaster();
    const pointer = new Vector2();
    const cache = aimCache();
    const probe = () =>
      resolveAim({
        scene,
        camera,
        metre: 1,
        x: 0,
        y: 0,
        reach: 4,
        now: 0,
        ray,
        pointer,
        cache,
      });
    const first = probe();
    expect(first?.registration).toBeNull();
    expect(probe()).toBe(first);
  });
});
