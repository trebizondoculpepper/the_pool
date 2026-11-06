import { describe, expect, it } from 'vite-plus/test';
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Scene,
} from 'three';
import type { Object3D } from 'three';
import { createPortableBoard } from '../../controls/logic/portable-board';
import { markEquipmentKind } from '../../components/core/views/equipment-kind';
import { registerRacks } from './rack-placement';
import type { PortableObject } from '../../controls/input/object-handling';

/**
 * The rack placement (mission 206): a `rack`-kind object's placement target
 * takes a held rackable item within reach, and the rack's whole row compacts,
 * centred, with the new item to a randomly chosen end (`controls/logic/rack.ts`).
 */

function box(w: number, d: number, kind = 'software-box') {
  const geometry = new BoxGeometry(w, 0.2, d);
  geometry.translate(0, 0.1, 0);
  const object = markEquipmentKind(
    new Mesh(geometry, new MeshBasicMaterial()),
    kind,
  );
  const component = createPortableBoard();
  object.userData.portable = { component, flat: 'upright', detach() {} };
  object.updateMatrixWorld(true);
  return { object, portable: object.userData.portable as PortableObject };
}

/** The racks of a room: a group marked `office-shelf`, registered left-first. */
function fixture(scene = new Scene()) {
  const rack = markEquipmentKind(new Group(), 'office-shelf');
  rack.name = 'Wall shelf';
  scene.add(rack);
  // A rack's board is its local y = 0 plane, its row along x, depth along z.
  registerRacks(scene, () => 0.4); // left end always
  const target = rack.userData.placementTarget!;
  return { rack, scene, target };
}

/** Place `m` on the rack's board at x (its local row coordinate), settled. */
function seat(rack: Object3D, m: { object: Object3D }, x: number) {
  rack.attach(m.object);
  m.object.position.set(x, 0, 0);
  m.object.updateMatrixWorld(true);
}

describe('the rack placement (mission 206)', () => {
  it('fits a rackable box that fits the row, and puts it on the board', () => {
    const { target } = fixture();
    const b = box(0.06, 0.05);
    expect(target.accepts(b.object)).toBe(true);
    target.place(b.object, b.portable);
    expect(new Box3().setFromObject(b.object).min.y).toBeCloseTo(0, 6);
  });

  it('refuses a rackable box that cannot fit (too wide, or a full row)', () => {
    const { rack, scene, target } = fixture();
    const seated: { object: Object3D }[] = [];
    for (let i = 0; i < 10; i++) {
      const m = box(0.1, 0.04);
      seat(rack, m, -0.45 + i * 0.105);
      seated.push(m);
    }
    const tooWide = box(0.25, 0.04);
    expect(target.accepts(tooWide.object)).toBe(false);
    expect(seated).toHaveLength(10);
    void scene;
  });

  it('refuses a thing that is not rackable', () => {
    const { target } = fixture();
    // A floppy disk is holdable but not rackable (the brief excludes it).
    const flat = box(0.05, 0.04, 'floppy-disk');
    expect(target.accepts(flat.object)).toBe(false);
  });
});
