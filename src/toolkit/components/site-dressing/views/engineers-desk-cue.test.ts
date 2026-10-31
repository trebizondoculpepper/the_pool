import { Box3, Mesh } from 'three';
import type { Object3D } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { createPanelKit } from '../../core/views/eighties-controls';
import type { PortableObject } from '../../../controls/input/object-handling';
import { createEngineersDesk } from './engineers-desk';

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
      } else if (cue?.possible) {
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

it('moves boxes from shelf to desk to carton and back to their shelf slots', () => {
  const d = desk();
  const named = (id: string) =>
    d.boxes.find((box) => box.userData.softwareBox === id)!;
  const panes = named('panes-95');
  const deskBox = named('doseright-gold-2-1');
  const shelfBox = named('macrosoft-pool-simulator-97');

  portableOf(panes).component.pickUp();
  expect(d.handling.cue(panes, deskBox)).toEqual({
    gesture: 'put-down',
    possible: true,
  });
  expect(d.handling.release(panes, deskBox)).toBe(true);
  expect(panes.position.y).toBeLessThan(1);

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

  portableOf(deskBox).component.pickUp();
  expect(d.handling.release(deskBox, shelfBox)).toBe(true);
  expect(deskBox.position.y).toBeGreaterThan(1.6);
});

it('gives every original desk box a separate, tidy shelf slot', () => {
  const d = desk();
  const named = (id: string) =>
    d.boxes.find((box) => box.userData.softwareBox === id)!;
  const shelfTarget = named('macrosoft-pool-simulator-97');
  const moved = [
    named('beige-accounting-leisure-centre-ledger'),
    named('coshh-manager-95'),
    named('doseright-gold-2-1'),
  ];
  for (const box of moved) {
    portableOf(box).component.pickUp();
    expect(d.handling.release(box, shelfTarget)).toBe(true);
  }
  const bounds = moved.map((box) => new Box3().setFromObject(box));
  for (let i = 0; i < bounds.length; i += 1) {
    expect(bounds[i].min.y).toBeGreaterThan(1.6);
    for (let j = i + 1; j < bounds.length; j += 1)
      expect(bounds[i].intersectsBox(bounds[j])).toBe(false);
  }
});
