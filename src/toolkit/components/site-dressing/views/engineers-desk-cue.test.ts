import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import type { Object3D } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { createPanelKit } from '../../core/views/eighties-controls';
import type { PortableObject } from '../../../controls/input/object-handling';
import {
  createEngineersDesk,
  DESK,
  PLACING_AIM_LAYER,
  SHELF,
} from './engineers-desk';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
        },
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

/** The desk's boxes, and a mesh of its carton to aim at. */
function desk() {
  const built = createEngineersDesk(createPanelKit());
  const boxes: Object3D[] = [];
  built.group.traverse((o) => {
    if (o.userData.softwareBox) boxes.push(o);
  });
  const carton = built.group.children.find((c) => c.userData.beside)!;
  let cartonMesh: Object3D = carton;
  carton.traverse((o) => {
    if (o instanceof Mesh) cartonMesh = o;
  });
  return { ...built, boxes, cartonMesh };
}

const portableOf = (o: Object3D) => o.userData.portable as PortableObject;

it('says what letting a box go will do, as its release then does, for every box and aim', () => {
  const d = desk();
  expect(d.boxes.length).toBeGreaterThan(3);
  const elsewhere = d.group;
  for (const aim of [undefined, elsewhere, d.cartonMesh])
    for (const box of d.boxes) {
      const portable = portableOf(box);
      // Not held: not the desk's to say.
      expect(d.handling.cue(box, aim)).toBeNull();
      if (!portable.component.canPickUp.value) continue;
      const allowed = d.handling.canPickUp(box);
      if (!allowed) continue;
      portable.component.pickUp();
      const cue = d.handling.cue(box, aim);
      // Asking changes nothing.
      expect(d.handling.cue(box, aim)).toEqual(cue);
      const before = d.handling.binned().length;
      const result = d.handling.release(box, aim);
      if (cue?.gesture === 'put-in') {
        expect(aim).toBe(d.cartonMesh);
        expect(result).toBe(true);
        expect(d.handling.binned().length).toBe(before + 1);
      } else if (cue === null) {
        // Not the desk's to place: it falls where it is let go.
        expect(result).toBeNull();
        portable.component.drop();
        portable.component.settle();
      } else if (cue.possible) {
        expect(cue.gesture).toBe('put-back');
        expect(result).toBe(true);
        expect(d.handling.binned().length).toBe(before);
      } else {
        expect(cue).toEqual({
          gesture: 'put-back',
          possible: false,
          refused: true,
        });
        expect(result).toBe('refuse');
      }
    }
  expect(d.handling.binned().length).toBeGreaterThan(0);
});

it('cannot lift a box with another resting on it', () => {
  const d = desk();
  const stuck = d.boxes.filter((box) => d.handling.canPickUp(box) === false);
  expect(stuck.length).toBeGreaterThan(0);
});

it('lets a box dropped on the desk fall, then takes it from the carton to the shelf', () => {
  const d = desk();
  const named = (id: string) =>
    d.boxes.find((box) => box.userData.softwareBox === id)!;
  const panes = named('panes-95');
  const deskBox = named('doseright-gold-2-1');
  const shelfBox = named('macrosoft-pool-simulator-97');

  // On the desk, or anywhere else: not the desk's to place, it falls.
  portableOf(panes).component.pickUp();
  expect(d.handling.cue(panes, deskBox)).toBeNull();
  expect(d.handling.release(panes, deskBox)).toBeNull();
  portableOf(panes).component.drop();
  portableOf(panes).component.settle();
  expect(d.handling.canPickUp(panes)).toBe(true);

  portableOf(panes).component.pickUp();
  expect(d.handling.cue(panes, d.cartonMesh)).toEqual({
    gesture: 'put-in',
    possible: true,
  });
  expect(d.handling.release(panes, d.cartonMesh)).toBe(true);
  expect(d.handling.binned()).toContain('panes-95');

  portableOf(panes).component.pickUp();
  expect(d.handling.cue(panes, shelfBox)).toEqual({
    gesture: 'put-back',
    possible: true,
  });
  expect(d.handling.release(panes, shelfBox)).toBe(true);
  expect(panes.position.y).toBeGreaterThan(1.6);
  expect(d.handling.binned()).not.toContain('panes-95');
});

it('stands boxes put on the shelf in a tidy row left of the right-most, refusing when it is full', () => {
  const d = desk();
  const named = (id: string) =>
    d.boxes.find((box) => box.userData.softwareBox === id)!;
  const star = named('macrosoft-pool-simulator-97');
  const starAt = star.position.clone();
  const onShelf = () =>
    d.boxes.filter((b) => new Box3().setFromObject(b).min.y > 1.6);
  for (const id of [
    'coshh-manager-95',
    'beige-accounting-leisure-centre-ledger',
    'doseright-gold-2-1',
  ]) {
    const box = named(id);
    if (!d.handling.canPickUp(box)) continue;
    portableOf(box).component.pickUp();
    const cue = d.handling.cue(box, star);
    const placed = d.handling.release(box, star);
    if (cue?.possible) {
      expect(placed).toBe(true);
      // The new one stands just left of the right-most, which stays put.
      expect(star.position.distanceTo(starAt)).toBeLessThan(1e-9);
      const mine = new Box3().setFromObject(box);
      const starBox = new Box3().setFromObject(star);
      expect(mine.max.x).toBeLessThanOrEqual(starBox.min.x);
      expect(starBox.min.x - mine.max.x).toBeLessThan(0.02);
    } else expect(placed).toBe('refuse');
    // Never two boxes in one place.
    const row = onShelf().map((b) =>
      new Box3().setFromObject(b).expandByScalar(-0.001),
    );
    for (let a = 0; a < row.length; a += 1)
      for (let b = a + 1; b < row.length; b += 1)
        expect(row[a].intersectsBox(row[b])).toBe(false);
  }
});

it('puts a desk box aimed into the space over the shelf on the shelf, not back on the desk', () => {
  const d = desk();
  let space: Object3D | undefined;
  d.group.traverse((o) => {
    if (o.name === 'Shelf space') space = o;
  });
  expect(space).toBeDefined();
  // Seen by the placing aim alone, so it never blocks picking a box up.
  expect(space!.layers.isEnabled(0)).toBe(false);
  const box = d.boxes.find(
    (b) => b.userData.softwareBox === 'doseright-gold-2-1',
  )!;
  expect(d.handling.canPickUp(box)).toBe(true);
  portableOf(box).component.pickUp();
  expect(d.handling.cue(box, space)).toEqual({
    gesture: 'put-back',
    possible: true,
  });
  const before = new Box3().setFromObject(box).min.y;
  expect(d.handling.release(box, space)).toBe(true);
  expect(new Box3().setFromObject(box).min.y).toBeGreaterThan(before + 0.5);
});

it("finds the shelf with the placing aim's own ray, from where the walker stands, over every part of the board", () => {
  const d = desk();
  d.group.updateMatrixWorld(true);
  // Standing a metre out from the desk's front, eyes at 1.6 m, aiming at
  // points a little over the board, along it.
  const eye = new Vector3(0, 1.6, DESK.d / 2 + 1);
  const caster = new Raycaster();
  caster.layers.enable(PLACING_AIM_LAYER);
  const plain = new Raycaster();
  for (const along of [-0.45, -0.2, 0, 0.2, 0.45]) {
    const aim = new Vector3(
      SHELF.x + along,
      SHELF.top + 0.12,
      -DESK.d / 2 + 0.1,
    );
    caster.set(eye, aim.clone().sub(eye).normalize());
    const hit = caster.intersectObject(d.group, true)[0];
    expect(hit, `aiming ${along} m along`).toBeDefined();
    let onShelf = false;
    for (let o: typeof hit.object | null = hit.object; o; o = o.parent)
      if (o.name === 'Wall shelf') onShelf = true;
    expect(onShelf, `aiming ${along} m along hit ${hit.object.name}`).toBe(
      true,
    );
    // Without the layer, the same ray misses the shelf's space altogether.
    plain.set(eye, aim.clone().sub(eye).normalize());
    expect(
      plain
        .intersectObject(d.group, true)
        .some((h) => h.object.name === 'Shelf space'),
    ).toBe(false);
  }
});
