import { describe, expect, it } from 'vite-plus/test';
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import { markUsable } from './use-marking';
import { aimCache, resolveAim } from './resolve-aim';
import type { UseQuery } from './use-marking';
import type { UseAnswer } from '../logic/use-cue';

/**
 * The one aim resolution (mission 161, step 2): the click and the cue take
 * the same first visible hit and the same registration, so they cannot
 * disagree. An actionable mark answers and runs on the click; nothing is
 * resolved where the first visible mesh is unmarked; an occluding mesh
 * stops both.
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
  return resolveAim(scene, camera, 1, 0, 0, 4, 0, ray, point, cache);
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
    if (!found) return;
    expect(found.registration.object).toBe(knob);
    // The cue asks the same registration the resolution gives; the click
    // runs that registration's action on the same query.
    const at: UseQuery = {
      object: found.registration.object,
      point: found.point,
      camera,
      x: 0,
      pad: false,
    };
    expect(found.registration.usable(at)).toBe(TURN);
    found.registration.action?.(at);
    expect(pressed).toBe(1);
  });

  it('an occluder in front stops both the cue and the click', () => {
    const { scene, camera, inFrontOf } = fixture();
    const knob = inFrontOf(-2); // behind
    inFrontOf(-1); // an unmarked mesh in front hides it
    markUsable(knob, turnable, () => {});
    expect(resolve(scene, camera)).toBeNull();
  });

  it('nothing resolves where the first visible mesh is unmarked (a decoration)', () => {
    const { scene, camera, inFrontOf } = fixture();
    inFrontOf(); // decoration: no mark at all
    expect(resolve(scene, camera)).toBeNull();
  });

  it('caches the same hit while the eye stands still', () => {
    const { scene, camera, inFrontOf } = fixture();
    const knob = inFrontOf();
    markUsable(knob, turnable, () => {});
    const ray = new Raycaster();
    const point = new Vector2();
    const cache = aimCache();
    const a = resolveAim(scene, camera, 1, 0, 0, 4, 0, ray, point, cache);
    const b = resolveAim(scene, camera, 1, 0, 0, 4, 30, ray, point, cache);
    expect(a?.registration.object).toBe(knob);
    expect(b?.registration.object).toBe(knob);
  });
});
