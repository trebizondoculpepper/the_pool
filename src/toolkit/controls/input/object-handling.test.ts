import { expect, it } from 'vite-plus/test';
import {
  BoxGeometry,
  Box3,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import { createPortableBoard } from '../logic/portable-board';
import { createObjectHandling } from './object-handling';
import type { DropPlacement } from './object-handling';

function fixture(
  redirectDrop?: (placement: DropPlacement) => DropPlacement,
  heldAction?: () => boolean | 'refuse',
  targetFeedback?: () => 'accept' | 'reject' | null,
) {
  const scene = new Scene();
  const parent = new Group();
  parent.scale.setScalar(2);
  scene.add(parent);
  const object = new Mesh(
    new BoxGeometry(0.03, 0.25, 0.17),
    new MeshBasicMaterial(),
  );
  object.position.y = 0.6;
  parent.add(object);
  const component = createPortableBoard();
  let detached = false;
  object.userData.portable = {
    component,
    flat: 'side',
    detach: () => {
      detached = true;
    },
  };
  const camera = new PerspectiveCamera(52, 1, 0.05, 20);
  camera.position.set(0, 1.2, 2);
  camera.lookAt(0, 1.2, 0);
  const handling = createObjectHandling(
    scene,
    camera,
    2,
    0,
    undefined,
    undefined,
    redirectDrop,
    undefined,
    heldAction,
    undefined,
    targetFeedback,
  );
  // A pick-up takes half a second to reach the hand (mission 210): a use
  // that picks up is followed here by that half second.
  const use = handling.use.bind(handling);
  handling.use = (x: number, y: number) => {
    const before = handling.holding();
    const done = use(x, y);
    if (!before && handling.holding()) handling.update(0.6);
    return done;
  };
  return {
    scene,
    object,
    component,
    camera,
    handling,
    detached: () => detached,
    parent,
  };
}

it('keeps a rejected insertion in hand, then hands it to the socket', () => {
  let accept = false;
  const f = fixture(undefined, () => (accept ? true : 'refuse'));
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.component.phase.value).toBe('held');
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.handling.holding()).toBe(true);
  expect(f.component.phase.value).toBe('held');
  accept = true;
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.handling.holding()).toBe(false);
  f.handling.dispose();
});

it('rotates the carried part for inspection without turning the camera', () => {
  const f = fixture();
  f.handling.use(0, 0);
  const looking = f.camera.quaternion.clone();
  const before = f.object.quaternion.clone();
  f.handling.rotate(0.3, -0.2);
  f.handling.update(1 / 60);
  expect(f.camera.quaternion.equals(looking)).toBe(true);
  expect(f.object.quaternion.equals(before)).toBe(false);
  f.handling.dispose();
});

it('brings a carried object to arm length when the camera moves and turns', () => {
  const f = fixture();
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.detached()).toBe(true);
  expect(f.object.scale.toArray()).toEqual([2, 2, 2]);
  f.camera.position.set(1, 1.7, 3);
  f.camera.lookAt(3, 1.7, 3);
  for (let i = 0; i < 20; i++) f.handling.update(1 / 60);
  expect(f.object.position.distanceTo(f.camera.position)).toBeLessThan(1.7);
  expect(f.object.position.distanceTo(f.camera.position)).toBeGreaterThan(1.1);
  const ahead = f.object.position.clone().sub(f.camera.position).normalize();
  expect(ahead.dot(f.camera.getWorldDirection(new Vector3()))).toBeGreaterThan(
    0.8,
  );
  f.handling.dispose();
  expect(f.object.parent).toBe(f.parent);
});

it('releases anywhere, lands above the floor and can be picked up again', () => {
  const f = fixture();
  f.handling.use(0, 0);
  // LET GO, not use, lets it go (mission 211).
  f.handling.letGo(0.9, -0.9);
  for (let i = 0; i < 180; i++) f.handling.update(1 / 60);
  f.scene.updateMatrixWorld(true);
  expect(f.component.phase.value).toBe('settled');
  expect(new Box3().setFromObject(f.object).min.y).toBeCloseTo(0);
  const centre = new Box3().setFromObject(f.object).getCenter(new Vector3());
  f.camera.position.copy(centre).add(new Vector3(0, 0.8, 1));
  f.camera.lookAt(centre);
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.component.phase.value).toBe('held');
  f.handling.dispose();
});

it('applies a room redirect before the released board starts falling', () => {
  const f = fixture((placement) => ({ ...placement, z: 1, vz: 0.8 }));
  f.handling.use(0, 0);
  f.handling.letGo(0, 0);
  f.scene.updateMatrixWorld(true);
  expect(
    new Box3().setFromObject(f.object).getCenter(new Vector3()).z / 2,
  ).toBeCloseTo(1);
  for (let i = 0; i < 180; i++) f.handling.update(1 / 60);
  expect(f.component.phase.value).toBe('settled');
  f.handling.dispose();
});

it('does not pick up an occluded board', () => {
  const f = fixture();
  const wall = new Mesh(new BoxGeometry(1, 2, 0.1), new MeshBasicMaterial());
  wall.position.set(0, 1.2, 1);
  f.scene.add(wall);
  expect(f.handling.use(0, 0)).toBe(false);
  expect(f.component.phase.value).toBe('installed');
});

it('restores an exhibit to its original parent, position, orientation and scale when dev0 requests reset', () => {
  const f = fixture();
  const position = f.object.position.clone();
  const rotation = f.object.quaternion.clone();
  const scale = f.object.scale.clone();
  f.handling.use(0, 0);
  f.handling.letGo(0, 0);
  f.handling.update(0.1);
  f.component.reset();
  f.handling.update(0.01);
  expect(f.object.parent).toBe(f.parent);
  expect(f.object.position.toArray()).toEqual(position.toArray());
  expect(f.object.quaternion.toArray()).toEqual(rotation.toArray());
  expect(f.object.scale.toArray()).toEqual(scale.toArray());
  expect(f.component.phase.value).toBe('installed');
  f.handling.dispose();
});

/** A real single-exhibit surface, addressed through the ordinary use ray. */
function plinthIn(scene: Scene) {
  const plinth = new Group();
  plinth.position.set(2, 0, -1);
  const deck = new Mesh(
    new BoxGeometry(1.8, 0.06, 1.8),
    new MeshBasicMaterial(),
  );
  deck.position.y = 1.9;
  plinth.add(deck);
  plinth.userData.placementSurface = deck;
  scene.add(plinth);
  return { plinth, deck };
}

it('places any carried exhibit on an empty plinth, then frees the plinth when picked up', () => {
  const f = fixture();
  const { plinth, deck } = plinthIn(f.scene);
  f.handling.use(0, 0);
  f.camera.lookAt(2, 1.9, -1);
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(false);
  expect(f.component.phase.value).toBe('settled');
  expect(f.object.parent).toBe(plinth);
  const bounds = new Box3().setFromObject(f.object);
  expect(bounds.min.y).toBeCloseTo(new Box3().setFromObject(deck).max.y, 7);
  f.camera.position.y = 2.6;
  f.camera.lookAt(bounds.getCenter(new Vector3()));
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(true);
  f.camera.lookAt(2, 1.9, -1);
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  // Dev0 RESET still means the original home, even after another plinth was used.
  f.component.reset();
  f.handling.update(0);
  expect(f.object.parent).toBe(f.parent);
  f.handling.dispose();
});

it('rejects a plinth that respawned an exhibit after showing green, keeping the carried object', () => {
  const f = fixture();
  const { plinth } = plinthIn(f.scene);
  f.handling.use(0, 0);
  f.camera.lookAt(2, 1.9, -1);
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  const replacement = new Mesh(
    new BoxGeometry(0.3, 0.3, 0.3),
    new MeshBasicMaterial(),
  );
  replacement.position.set(0, 2.08, 0);
  replacement.userData.portable = {
    component: createPortableBoard(),
    detach() {},
    flat: 'side',
  };
  plinth.add(replacement);
  expect(f.handling.targetFeedback(0, 0)).toBe('reject');
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(true);
  expect(f.component.phase.value).toBe('held');
  replacement.removeFromParent();
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  f.handling.dispose();
});

it('leaves a carried part in hand while use operates a door latch', () => {
  const f = fixture();
  f.handling.use(0, 0);
  const latch = new Mesh(
    new BoxGeometry(0.2, 0.2, 0.05),
    new MeshBasicMaterial(),
  );
  latch.position.set(0, 1.2, -1);
  latch.userData.useWhileCarrying = true;
  f.scene.add(latch);
  f.camera.lookAt(0, 1.2, -1);
  expect(f.handling.use(0, 0)).toBe(false);
  expect(f.handling.holding()).toBe(true);
  f.handling.dispose();
});

it('gives an aimed socket priority over a clickable control behind it', () => {
  const f = fixture(
    undefined,
    () => true,
    () => 'accept',
  );
  f.handling.use(0, 0);
  const control = new Mesh(
    new BoxGeometry(0.2, 0.2, 0.05),
    new MeshBasicMaterial(),
  );
  control.position.set(0, 1.2, -1);
  control.userData.useWhileCarrying = true;
  f.scene.add(control);
  f.camera.lookAt(0, 1.2, -1);
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.handling.holding()).toBe(false);
  f.handling.dispose();
});

it('gives an object straight into the hands, then drops it like any other', () => {
  const f = fixture();
  const events: string[] = [];
  f.component.onEvent((e) => events.push(e));
  // Out of sight, behind the camera: handed over, not aimed at.
  f.object.position.set(0, 0.6, 3);
  expect(f.handling.give(f.object)).toBe(true);
  expect(f.component.phase.value).toBe('held');
  expect(f.detached()).toBe(true);
  expect(events).toEqual(['pick-up']);
  expect(f.handling.heldObject()).toBe(f.object);
  for (let i = 0; i < 40; i++) f.handling.update(1 / 60);
  const ahead = f.object.position.clone().sub(f.camera.position).normalize();
  expect(ahead.dot(f.camera.getWorldDirection(new Vector3()))).toBeGreaterThan(
    0.8,
  );
  // Full hands take nothing more.
  expect(f.handling.give(f.object)).toBe(false);
  f.handling.letGo(0.9, -0.9);
  expect(f.component.phase.value).toBe('falling');
  f.handling.dispose();
});

it('refuses to give what cannot be picked up, and forgets on request', () => {
  const f = fixture();
  f.component.setLocked(true);
  expect(f.handling.give(f.object)).toBe(false);
  f.component.setLocked(false);
  expect(f.handling.give(f.object)).toBe(true);
  f.handling.forget(f.object);
  expect(f.handling.holding()).toBe(false);
  const at = f.object.position.clone();
  f.handling.update(1 / 60);
  expect(f.object.position.equals(at)).toBe(true);
  f.handling.dispose();
});

/** A box whose origin is at a corner, as a software box's is, to pick up. */
function cornerFixture() {
  const f = fixture();
  f.object.geometry.translate(0, 0.125, 0.085);
  f.object.position.set(0, 0.5, 0);
  return f;
}
const middleOf = (object: Mesh) =>
  new Box3().setFromObject(object).getCenter(new Vector3());

it('turns a held thing about its middle, not the corner its origin is at', () => {
  const f = cornerFixture();
  expect(f.handling.use(0, 0)).toBe(true);
  for (let i = 0; i < 60; i++) f.handling.update(1 / 60);
  const before = middleOf(f.object);
  f.handling.rotate(1.2, 0.7);
  f.handling.update(1 / 60);
  expect(middleOf(f.object).distanceTo(before)).toBeLessThan(0.002);
  f.handling.dispose();
});

it('holds a thing up in the middle of the view while inspecting, wheel nearer, and back to the hand after', () => {
  const f = cornerFixture();
  expect(f.handling.use(0, 0)).toBe(true);
  const settle = () => {
    for (let i = 0; i < 90; i++) f.handling.update(1 / 60);
  };
  settle();
  const inHand = f.camera.worldToLocal(middleOf(f.object));
  expect(inHand.x).toBeGreaterThan(0.1);
  f.handling.inspect(true);
  expect(f.handling.inspecting()).toBe(true);
  settle();
  const held = f.camera.worldToLocal(middleOf(f.object));
  expect(Math.abs(held.x)).toBeLessThan(0.01);
  expect(Math.abs(held.y)).toBeLessThan(0.01);
  expect(held.z).toBeLessThan(0);
  // Fits the view: its bounds within the frustum's height.
  const half = Math.tan(((f.camera.fov / 2) * Math.PI) / 180) * -held.z;
  const size = new Box3().setFromObject(f.object).getSize(new Vector3());
  expect(size.length() / 2).toBeLessThan(half);
  f.handling.inspectNearer(-600);
  settle();
  expect(-f.camera.worldToLocal(middleOf(f.object)).z).toBeLessThan(-held.z);
  f.handling.inspect(false);
  settle();
  expect(
    f.camera.worldToLocal(middleOf(f.object)).distanceTo(inHand),
  ).toBeLessThan(0.01);
  f.handling.dispose();
});

it('turns a thing held up to look at to show its front, upright, until it is turned by hand', () => {
  const f = cornerFixture();
  f.object.rotation.set(0.4, 2.1, -0.7);
  expect(f.handling.use(0, 0)).toBe(true);
  const settle = () => {
    for (let i = 0; i < 90; i++) f.handling.update(1 / 60);
  };
  settle();
  const eye = f.camera.getWorldQuaternion(new Quaternion());
  const turn = () => f.object.getWorldQuaternion(new Quaternion()).angleTo(eye);
  expect(turn()).toBeGreaterThan(0.3);
  f.handling.inspect(true);
  settle();
  // Its front (+z) to the eye, its top (+y) up: its frame the eye's.
  expect(turn()).toBeLessThan(0.01);
  f.handling.rotate(0.8, 0);
  settle();
  expect(turn()).toBeGreaterThan(0.5);
  f.handling.dispose();
});

it('draws what is held over the world, and its own materials again once let go', () => {
  const f = cornerFixture();
  const own = f.object.material;
  expect(f.handling.use(0, 0)).toBe(true);
  f.handling.update(1 / 60);
  const held = f.object.material as MeshBasicMaterial;
  expect(held).not.toBe(own);
  expect(held.customProgramCacheKey()).toContain('held-over-world');
  // Held up to look at: a click neither places nor drops it.
  f.handling.inspect(true);
  expect(f.handling.resolve(0, 0).answer).toBeNull();
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.handling.holding()).toBe(true);
  f.handling.inspect(false);
  expect(f.handling.letGo(0, 0)).toBe(true);
  expect(f.handling.holding()).toBe(false);
  f.handling.update(1 / 60);
  expect(f.object.material).toBe(own);
  f.handling.dispose();
});

/** A board on a desk top at 0.73 m, the eye above the desk's near half (mission 210). */
function deskFixture() {
  const scene = new Scene();
  const desk = new Mesh(
    new BoxGeometry(1.6, 0.73, 0.8),
    new MeshBasicMaterial(),
  );
  desk.position.set(0, 0.365, -1);
  scene.add(desk);
  const object = new Mesh(
    new BoxGeometry(0.2, 0.05, 0.3),
    new MeshBasicMaterial(),
  );
  object.position.set(-0.5, 0.755, -1);
  scene.add(object);
  const component = createPortableBoard();
  object.userData.portable = { component, flat: 'upright', detach() {} };
  const camera = new PerspectiveCamera(52, 1, 0.05, 20);
  camera.position.set(0, 1.6, 0);
  const top = { minX: -0.8, maxX: 0.8, minZ: -1.4, maxZ: -0.6, top: 0.73 };
  const handling = createObjectHandling(scene, camera, 1, 0, () => [top]);
  const aim = (x: number, z: number) => {
    camera.lookAt(x, 0.73, z);
    camera.updateMatrixWorld(true);
  };
  return { scene, desk, object, component, camera, handling, aim };
}

it('eases a thing picked up from where it rests into the hand in about half a second', () => {
  const f = deskFixture();
  f.aim(-0.5, -1);
  const from = f.object.position.clone();
  expect(f.handling.use(0, 0)).toBe(true);
  f.handling.update(0.05);
  const early = f.object.position.distanceTo(from);
  f.handling.update(0.2);
  const middle = f.object.position.distanceTo(from);
  // Eased in: it has hardly moved early on, and is well on its way half way.
  expect(early).toBeLessThan(middle / 4);
  // Nothing else happens to it until it is in the hand.
  expect(f.handling.resolve(0, 0).answer).toBeNull();
  f.handling.update(0.3);
  expect(f.handling.moving()).toBe(false);
  f.handling.dispose();
});

it('puts a thing down on a top where aimed, flat and still, in about half a second', () => {
  const f = deskFixture();
  f.aim(-0.5, -1);
  f.handling.use(0, 0);
  f.handling.update(0.6);
  f.aim(0.3, -1.1);
  expect(f.handling.resolve(0, 0).answer).toEqual({
    gesture: 'put-down',
    possible: true,
  });
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.handling.holding()).toBe(false);
  f.handling.update(0.25);
  expect(f.handling.moving()).toBe(true);
  f.handling.update(0.3);
  expect(f.handling.moving()).toBe(false);
  expect(f.component.phase.value).toBe('settled');
  f.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(f.object);
  expect(box.min.y).toBeCloseTo(0.73, 3);
  const middle = box.getCenter(new Vector3());
  expect(middle.x).toBeCloseTo(0.3, 1);
  expect(middle.z).toBeCloseTo(-1.1, 1);
  f.handling.dispose();
});

it('refuses a put-down that would overhang the edge or land on another thing, keeping it in hand', () => {
  const f = deskFixture();
  f.aim(-0.5, -1);
  f.handling.use(0, 0);
  f.handling.update(0.6);
  // Its middle near the edge: a corner would hang over.
  f.aim(0.78, -1);
  expect(f.handling.resolve(0, 0).answer).toEqual({
    gesture: 'put-down',
    possible: false,
    refused: true,
  });
  expect(f.handling.use(0, 0)).toBe(true);
  expect(f.handling.holding()).toBe(true);
  // Where another thing already rests.
  const other = new Mesh(
    new BoxGeometry(0.2, 0.1, 0.2),
    new MeshBasicMaterial(),
  );
  other.position.set(0.25, 0.78, -1.05);
  other.userData.portable = {
    component: createPortableBoard(),
    flat: 'upright',
    detach() {},
  };
  f.scene.add(other);
  f.aim(0.2, -1.1);
  expect(f.handling.resolve(0, 0).answer).not.toEqual({
    gesture: 'put-down',
    possible: true,
  });
  f.handling.dispose();
});

it('leaves a use at the floor to the room, the thing kept in hand (mission 211)', () => {
  const f = deskFixture();
  f.aim(-0.5, -1);
  f.handling.use(0, 0);
  f.handling.update(0.6);
  const floor = new Mesh(
    new BoxGeometry(10, 0.01, 10),
    new MeshBasicMaterial(),
  );
  floor.position.set(0, -0.005, 0);
  f.scene.add(floor);
  f.camera.lookAt(0, 0, -0.3);
  f.camera.updateMatrixWorld(true);
  expect(f.handling.resolve(0, 0).answer).toBe('use');
  expect(f.handling.use(0, 0)).toBe(false);
  expect(f.handling.holding()).toBe(true);
  f.handling.dispose();
});

it('throws on LET GO: off a solid wall it rebounds, and it comes to rest on the floor this side (mission 211)', () => {
  const scene = new Scene();
  const object = new Mesh(
    new BoxGeometry(0.1, 0.1, 0.1),
    new MeshBasicMaterial(),
  );
  object.position.set(0, 1, -0.6);
  scene.add(object);
  const component = createPortableBoard();
  object.userData.portable = { component, flat: 'upright', detach() {} };
  const camera = new PerspectiveCamera(52, 1, 0.05, 20);
  camera.position.set(0, 1.5, 0);
  camera.lookAt(0, 1, -0.6);
  const wall = { minX: -5, maxX: 5, minZ: -1.6, maxZ: -1.5 };
  const handling = createObjectHandling(
    scene,
    camera,
    1,
    0,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    () => [wall],
  );
  handling.use(0, 0);
  handling.update(0.6);
  camera.lookAt(0, 1.6, -2);
  expect(handling.letGo(0, 0)).toBe(true);
  expect(handling.thrown(object)).toBe(true);
  let furthest = 0;
  for (let i = 0; i < 400; i++) {
    handling.update(1 / 60);
    furthest = Math.min(furthest, object.position.z);
  }
  expect(handling.thrown(object)).toBe(false);
  expect(component.phase.value).toBe('settled');
  // Never through the wall, and back on this side of it.
  expect(furthest).toBeGreaterThan(-1.5);
  expect(object.position.z).toBeGreaterThan(-1.5);
  expect(new Box3().setFromObject(object).min.y).toBeCloseTo(0, 2);
  handling.dispose();
});

it('a throw that comes down onto a top rests on it (mission 211, 181)', () => {
  const scene = new Scene();
  const object = new Mesh(
    new BoxGeometry(0.1, 0.1, 0.1),
    new MeshBasicMaterial(),
  );
  object.position.set(0, 1, -0.6);
  scene.add(object);
  const component = createPortableBoard();
  object.userData.portable = { component, flat: 'upright', detach() {} };
  const camera = new PerspectiveCamera(52, 1, 0.05, 20);
  camera.position.set(0, 1.5, 0);
  camera.lookAt(0, 1, -0.6);
  const top = { minX: -1, maxX: 1, minZ: -3, maxZ: -1, top: 0.73 };
  const handling = createObjectHandling(scene, camera, 1, 0, () => [top]);
  handling.use(0, 0);
  handling.update(0.6);
  // Lobbed up, to come down onto the top rather than hit its side.
  camera.lookAt(0, 2.4, -2);
  handling.update(1 / 60);
  handling.letGo(0, 0);
  for (let i = 0; i < 400; i++) handling.update(1 / 60);
  expect(component.phase.value).toBe('settled');
  expect(new Box3().setFromObject(object).min.y).toBeCloseTo(0.73, 2);
  handling.dispose();
});
