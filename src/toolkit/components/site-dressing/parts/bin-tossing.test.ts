import { expect, it } from 'vite-plus/test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
} from 'three';
import { createObjectHandling } from '../../../controls/input/object-handling';
import { createPortableBoard } from '../../../controls/logic/portable-board';
import { createBinTossing } from './bin-tossing';

function fixture() {
  const scene = new Scene();
  const object = new Mesh(
    new BoxGeometry(0.2, 0.2, 0.2),
    new MeshBasicMaterial(),
  );
  object.position.set(0, 1.2, 0);
  const portable = {
    component: createPortableBoard(),
    detach() {},
    flat: 'side' as const,
  };
  object.userData.portable = portable;
  scene.add(object);
  const camera = new PerspectiveCamera(55, 1, 0.01, 100);
  camera.position.set(0, 1.2, 2);
  camera.lookAt(0, 1.2, 0);
  const tossing = createBinTossing({ metre: 1, random: () => 0.5 });
  const group = new Group();
  group.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
  group.position.set(0, 0.5, -1.5);
  scene.add(group);
  const bin = tossing.add({
    name: 'test skip',
    group,
    x: 0,
    z: -1.5,
    footprint: { x: 1, z: 1 },
    shape: {
      halfX: 0.4,
      halfZ: 0.4,
      floor: 0.1,
      rim: 1,
      layer: 0.03,
      heap: 0.2,
    },
  });
  const handling = createObjectHandling(scene, camera, 1, 0);
  handling.use(0, 0);
  // On its way to the hand (mission 210): there in half a second.
  handling.update(0.6);
  camera.lookAt(0, 0.5, -1.5);
  return { scene, object, portable, camera, tossing, bin, handling };
}

it('shows green and tosses into an aimed skip, with feedback matching the actual placement', () => {
  const f = fixture();
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(false);
  expect(f.tossing.incoming(f.bin)).toBe(true);
  expect(f.portable.component.phase.value).toBe('falling');
  f.handling.dispose();
});

it('tosses into an aimed skip on LET GO as on use (mission 209)', () => {
  const f = fixture();
  expect(f.handling.letGo(0, 0)).toBe(true);
  expect(f.tossing.incoming(f.bin)).toBe(true);
  f.handling.dispose();
});

it('lands in the skip under gravity and can be picked out again', () => {
  const f = fixture();
  f.handling.use(0, 0);
  for (let i = 0; i < 200 && f.tossing.incoming(f.bin); i++)
    f.tossing.update(0.02);
  expect(f.tossing.incoming(f.bin)).toBe(false);
  expect(f.bin.filled).toBe(1);
  // In the bin: inside its footprint, below its rim.
  expect(Math.abs(f.object.position.x - f.bin.x)).toBeLessThan(0.5);
  expect(Math.abs(f.object.position.z - f.bin.z)).toBeLessThan(0.5);
  expect(f.object.position.y).toBeLessThan(1);
  expect(f.portable.component.locked.value).toBe(false);
  f.handling.dispose();
});

it('takes nothing from out of reach: use keeps it in hand, LET GO lets it fall', () => {
  const f = fixture();
  f.bin.z = -8;
  f.bin.group.position.z = -8;
  f.camera.lookAt(0, 0.5, -8);
  expect(f.handling.targetFeedback(0, 0)).toBeNull();
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(true);
  f.handling.letGo(0, 0);
  expect(f.handling.holding()).toBe(false);
  expect(f.tossing.incoming(f.bin)).toBe(false);
  expect(f.portable.component.phase.value).toBe('falling');
  f.handling.dispose();
});

it('has no magnet: let go near a bin but not at it, it falls, and a removed bin is forgotten', () => {
  const f = fixture();
  f.camera.lookAt(5, 1.2, 0);
  expect(f.handling.targetFeedback(0, 0)).toBeNull();
  f.handling.letGo(0, 0);
  expect(f.tossing.incoming(f.bin)).toBe(false);
  f.tossing.remove(f.bin);
  expect(f.bin.group.userData.placementTarget).toBeUndefined();
  f.handling.dispose();
});

it('lets a bin refuse what it does not take: red, and kept in hand', () => {
  const f = fixture();
  f.bin.takes = (o) => o !== f.object;
  expect(f.handling.targetFeedback(0, 0)).toBe('reject');
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(true);
  expect(f.tossing.incoming(f.bin)).toBe(false);
  f.bin.takes = () => true;
  f.handling.dispose();
});
