import {
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { BoundsModel } from '../logic/bounds-model';

/**
 * An object's bounds model (mission 208, `../logic/bounds-model.ts`): set by
 * the object's own builder, beside its high- and low-poly versions, never by
 * a room. Held on the object; never drawn in play.
 */
export const BOUNDS_MODEL = 'boundsModel';

export function setBoundsModel<T extends Object3D>(
  object: T,
  model: BoundsModel,
): T {
  object.userData[BOUNDS_MODEL] = model;
  return object;
}

/** The object's own declared bounds model, if its builder gave it one. */
export const boundsModelOf = (object: Object3D): BoundsModel | undefined =>
  object.userData[BOUNDS_MODEL] as BoundsModel | undefined;

/** The first declared bounds model at or under `object` (a holder around a built item). */
export function findBoundsModel(object: Object3D): BoundsModel | undefined {
  let found: BoundsModel | undefined;
  object.traverse((o) => {
    found ??= boundsModelOf(o);
  });
  return found;
}

/**
 * A bounds model drawn, for the CAD views and the magic room's BOUNDS
 * toggle: each shape a translucent orange solid with dark edges, in the
 * object's frame (metres). `fitted` draws it dashed-looking grey instead,
 * to tell a box the game fitted from one the builder declared.
 */
export function createBoundsView(
  model: BoundsModel,
  { fitted = false }: { fitted?: boolean } = {},
): { object: Group; dispose(): void } {
  const group = new Group();
  group.name = fitted ? 'Bounds (fitted)' : 'Bounds model';
  const fill = new MeshBasicMaterial({
    color: fitted ? 0x8a9096 : 0xff8c1a,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const edge = new LineBasicMaterial({ color: fitted ? 0x3b4045 : 0x8a3b00 });
  const geometries: BufferGeometry[] = [];
  for (const p of model) {
    const g =
      p.type === 'box'
        ? new BoxGeometry(p.size.w, p.size.h, p.size.d)
        : new CylinderGeometry(p.radius, p.radius, p.length, 24);
    const lines = new EdgesGeometry(g, 20);
    geometries.push(g, lines);
    const solid = new Mesh(g, fill);
    const outline = new LineSegments(lines, edge);
    const part = new Group();
    part.add(solid, outline);
    part.position.set(p.centre.x, p.centre.y, p.centre.z);
    if (p.type === 'cylinder' && p.axis === 'x') part.rotation.z = Math.PI / 2;
    if (p.type === 'cylinder' && p.axis === 'z') part.rotation.x = Math.PI / 2;
    // Drawn over the item it bounds, so it shows through.
    solid.renderOrder = 10;
    outline.renderOrder = 11;
    group.add(part);
  }
  return {
    object: group,
    dispose() {
      for (const g of geometries) g.dispose();
      fill.dispose();
      edge.dispose();
    },
  };
}
