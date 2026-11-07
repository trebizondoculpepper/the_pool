import { PerspectiveCamera, Vector3 } from 'three';
import type { Mesh, Object3D } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { createPanelKit } from '../../core/views/eighties-controls';
import { usableOf } from '../../../controls/input/use-marking';
import { createGasBallValve } from './gas-fittings';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

/** The turn arrow a player at `eye` sees on the valve's lever. */
function arrowFrom(valve: Object3D, eye: Vector3) {
  const camera = new PerspectiveCamera(60, 1, 0.01, 10);
  camera.position.copy(eye);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  valve.updateMatrixWorld(true);
  let handle: Mesh | undefined;
  valve.traverse((o) => {
    if (!handle && (o as Mesh).isMesh && usableOf(o)?.object === o)
      handle = o as Mesh;
  });
  const found = usableOf(handle!)!;
  const answer = found.usable({
    object: found.object,
    hit: found.object,
    point: new Vector3(),
    camera,
    x: 0,
    pad: false,
  });
  return answer && answer.gesture === 'turn' ? answer.direction : null;
}

it('points its turn arrow the way the lever is seen to go, from above or below (#25)', () => {
  // Open, its lever along the pipe; shutting swings its end toward the
  // room (+z). A standing player above the valve sees that clockwise,
  // one crouched below it anticlockwise.
  let open = true;
  const valve = createGasBallValve(createPanelKit(), {
    binding: { open: () => open, set: (to) => (open = to) },
  }).object;
  expect(arrowFrom(valve, new Vector3(0, 0.6, 0.8))).toBe(1);
  expect(arrowFrom(valve, new Vector3(0, -0.6, 0.8))).toBe(-1);
  // Shut, the way back is the other way round.
  open = false;
  expect(arrowFrom(valve, new Vector3(0, 0.6, 0.8))).toBe(-1);
  expect(arrowFrom(valve, new Vector3(0, -0.6, 0.8))).toBe(1);
});

it('keeps the arrow true on a valve turned onto an upright pipe (#25)', () => {
  // The CO₂ wall port's valve stands on a vertical drop, turned a quarter
  // about z: its stem points along -x, toward a player standing at -x.
  let open = true;
  const valve = createGasBallValve(createPanelKit(), {
    binding: { open: () => open, set: (to) => (open = to) },
  }).object;
  valve.rotation.z = Math.PI / 2;
  const a = arrowFrom(valve, new Vector3(-0.8, 0.05, 0.3));
  open = false;
  const b = arrowFrom(valve, new Vector3(-0.8, 0.05, 0.3));
  // Whichever way it looks from there, back is the other way.
  expect(a).not.toBeNull();
  expect(b).toBe(-a!);
});
