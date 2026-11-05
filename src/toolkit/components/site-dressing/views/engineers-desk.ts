import {
  Box3,
  BoxGeometry,
  CanvasTexture,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Material, MeshStandardMaterial, Object3D, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import deskUrl from '../../../../../resources/models/office/desk.glb?url';
import type { PortableObject } from '../../../controls/input/object-handling';
import type { CarryAnswer } from '../../../controls/logic/use-cue';
import { createDropProfile } from '../../../controls/logic/drop-profile';
import { createPortableBoard } from '../../../controls/logic/portable-board';
import type { PanelKit } from '../../core/views/eighties-controls';
import { markEquipmentKind } from '../../core/views/equipment-kind';
import { markNonBody } from '../../core/views/non-body';
import { setBoundsModel } from '../../core/views/bounds-model';
import { boxBetween } from '../../core/logic/bounds-model';
import { createPutBack } from '../logic/put-back';
import type { Pose } from '../logic/put-back';
import { SOFTWARE_TITLES } from '../logic/software-boxes';
import type { BoxSize, SoftwareTitle } from '../logic/software-boxes';
import { declareSeat } from '../../../controls/input/seating';
import { createOfficeChair } from './office-chair';
import {
  WALL_SHELF,
  WALL_SHELF_STANDOFF,
  createWallShelf,
} from './office-wall-shelf';
import {
  bootSequenceScreen,
  createLead,
  createPcCarton,
  createPeriodPc,
} from './period-pc';
import type { PeriodPcOptions } from './period-pc';
import {
  createBoxContents,
  createSoftwareBox,
  softwareBoxSize,
} from './software-box';

/** The desk's size as the room lays it out, metres: width, depth, height to its top. */
export const DESK = { w: 1.6, d: 0.8, h: 0.73 } as const;

/**
 * The PC's carton beside the desk's open end, turned a quarter and a
 * little more (`yaw`, radians): its middle, width and depth, metres, in
 * the desk's frame. It fills the gap between the desk's end, the wall
 * and the stores cupboard with a few centimetres to spare on each side
 * (`engineers-desk.test.ts`), so nothing clips through it.
 */
const CARTON = { x: -1.1, z: -0.065, w: 0.58, d: 0.48, h: 0.5, yaw: 0.02 };
/** Its flaps' lean, outward positive, on its desk, cupboard, wall and room sides: only the room's splays. */
const CARTON_FLAPS = [-0.06, -0.05, -0.06, 0.42] as const;
/** How far the room side's splayed flap reaches beyond the carton, metres. */
const CARTON_FLAP_REACH =
  (Math.min(CARTON.w, CARTON.d) / 2) * Math.sin(CARTON_FLAPS[3]);

/** The PC's empty carton, beside the desk, in the desk's frame. */
export function createDeskCarton(kit: PanelKit) {
  const carton = createPcCarton(
    kit,
    CARTON.w,
    CARTON.h,
    CARTON.d,
    CARTON_FLAPS,
  );
  carton.position.set(CARTON.x, 0, CARTON.z);
  carton.rotation.y = Math.PI / 2 + CARTON.yaw;
  // Beside the desk, not on it: outside its footprint, a solid of its own.
  carton.userData.beside = true;
  return carton;
}

/** The carton's footprint to walk round, in the desk's frame: its sides turned, its splayed flap, and 2 cm. */
export function deskCartonFootprint() {
  const c = Math.cos(CARTON.yaw);
  const s = Math.abs(Math.sin(CARTON.yaw));
  // Turned a quarter, its width runs along the desk's z, its depth along x.
  const halfX = (CARTON.d * c + CARTON.w * s) / 2;
  const halfZ = (CARTON.w * c + CARTON.d * s) / 2;
  return {
    minX: CARTON.x - halfX - 0.02,
    maxX: CARTON.x + halfX + 0.02,
    minZ: CARTON.z - halfZ - 0.02,
    maxZ: CARTON.z + halfZ + CARTON_FLAP_REACH + 0.02,
  };
}

/**
 * The wall shelf over the desk (`office-wall-shelf.ts`): its middle along
 * the desk, the height of its board's top (about standing head height),
 * and where Macrosoft Pool Simulator 97 stands face out on it, metres.
 */
export const SHELF = { x: 0.05, top: 1.65, star: 0.27 } as const;
/** The gap between boxes stood in a row on the shelf. */
const SHELF_GAP = 0.006;
/** The layer of things only a held box's placing aim sees (the shelf's space). */
export const PLACING_AIM_LAYER = 5;
/** How far above the shelf's board a box aimed there is put on the shelf. */
const SHELF_SPACE_H = 0.3;

/** The opened box, Beige Accounting's ledger, on top of the desk's pile. */
const LEDGER = 'beige-accounting-leisure-centre-ledger';

const quaternionOf = (x: number, y: number, z: number, order: string) =>
  new Quaternion().setFromEuler(new Euler(x, y, z, order as 'XYZ'));
const poseOf = (position: Vector3, q: Quaternion): Pose => ({
  position: [position.x, position.y, position.z],
  quaternion: [q.x, q.y, q.z, q.w],
});

/** Put `object` at `pose` in its parent's frame. */
function applyPose(object: Object3D, pose: Pose) {
  object.position.set(...pose.position);
  object.quaternion.set(...pose.quaternion);
  object.scale.set(1, 1, 1);
}

/** A box lying on its back, front up, its top to −z, its footprint's middle at (x, z) on y, turned `yaw`. */
function flat(size: BoxSize, x: number, y: number, z: number, yaw: number) {
  const q = quaternionOf(-Math.PI / 2, yaw, 0, 'YXZ');
  const offset = new Vector3(0, size.d / 2, size.h / 2).applyAxisAngle(
    new Vector3(0, 1, 0),
    yaw,
  );
  return poseOf(new Vector3(x, y, z).add(offset), q);
}

/**
 * A box stood like a book, its right-hand spine to +z, its left side at
 * `x`, its back `back` + a centimetre, on y; leaning `lean` radians to −x
 * about its bottom left edge, onto its neighbour.
 */
function spineOut(
  size: BoxSize,
  x: number,
  y: number,
  back: number,
  lean: number,
) {
  const q = quaternionOf(0, -Math.PI / 2, lean, 'ZYX');
  const offset = new Vector3(size.d / 2, 0, 0).applyAxisAngle(
    new Vector3(0, 0, 1),
    lean,
  );
  return poseOf(new Vector3(x, y, back + size.w / 2 + 0.01).add(offset), q);
}

/**
 * A box standing face out to +z, centred on `x`, on y, leaning back
 * `lean` radians about its bottom front edge until its top meets the
 * wall at `back`; turned a little, `yaw`.
 */
function faceOut(
  size: BoxSize,
  x: number,
  y: number,
  back: number,
  lean: number,
  yaw = 0,
) {
  const q = quaternionOf(-lean, yaw, 0, 'YXZ');
  const front =
    back + size.h * Math.sin(lean) + size.d * Math.cos(lean) + 0.002;
  const offset = new Vector3(0, 0, -size.d / 2).applyQuaternion(q);
  return poseOf(new Vector3(x, y, front).add(offset), q);
}

/** The carton's `slot`th box thrown in (0 at the bottom), lying on what is under it, in the carton's frame. */
function inBin(size: BoxSize, slot: number) {
  const x = ((slot % 3) - 1) * 0.07;
  const z = ((slot % 2) - 0.5) * 0.08;
  return flat(size, x, 0.07 + slot * 0.052, z, ((slot * 7) % 5) * 0.15 - 0.3);
}

/** Beech-effect laminate, the late 1990s' office finish, for the model's dark wood. */
const BEECH: [number, number, number] = [200, 172, 130];
/** Brushed aluminium, for its drawer handles. */
const ALUMINIUM: [number, number, number] = [176, 180, 182];

/**
 * The model's palette texture, recoloured once: its dark wood to beech and
 * its blue-grey handles to aluminium, so a period mahogany desk becomes the
 * beech-effect desk of a 1990s council office.
 */
function beechTexture(map: Texture): Texture | null {
  const image = map.image as CanvasImageSource & {
    width: number;
    height: number;
  };
  if (!image || !image.width) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const [r, g, b] = [p[i], p[i + 1], p[i + 2]];
    const light = (r + g + b) / 3;
    let to: [number, number, number] | null = null;
    // Brown: red above green above blue, and not bright.
    if (r > g && g >= b && r - b > 18 && light < 140) to = BEECH;
    // Slate blue-grey.
    else if (b > r + 15 && light < 150) to = ALUMINIUM;
    if (!to) continue;
    const shade = 0.82 + (light / 140) * 0.3;
    p[i] = Math.min(255, to[0] * shade);
    p[i + 1] = Math.min(255, to[1] * shade);
    p[i + 2] = Math.min(255, to[2] * shade);
  }
  context.putImageData(data, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = map.flipY;
  return texture;
}

/** `object` stretched to `size` (width, height, depth), centred, standing on y = 0. */
function fitTo(object: Object3D, size: Vector3) {
  const holder = new Group();
  holder.add(object);
  holder.updateMatrixWorld(true);
  const box = new Box3().setFromObject(holder);
  const s = box.getSize(new Vector3());
  object.scale.multiply(new Vector3(size.x / s.x, size.y / s.y, size.z / s.z));
  holder.updateMatrixWorld(true);
  box.setFromObject(holder);
  const c = box.getCenter(new Vector3());
  object.position.sub(new Vector3(c.x, box.min.y, c.z));
  return holder;
}

export interface EngineersDeskOptions extends PeriodPcOptions {
  /** Which titles, by id, stand on it: by default all of them. */
  titles?: readonly string[];
}

/**
 * The engineer's desk (the owner, 2026-10-31), late 1990s: a pedestal desk
 * from a free model library (CreativeTrio's "Desk", CC0, `resources/models/
 * office/`), in beech-effect laminate, with its Gateway 3000 PC
 * (`period-pc.ts`), its boxed software (`software-box.ts`) on a wall
 * shelf over it (`office-wall-shelf.ts`) and on the desk, one box opened
 * with its manual and disks out, the PC's cow-spotted carton beside it,
 * and a chair. Set decoration, outside the plant model; only the PC has a
 * little life of its own, and the boxes can be picked up, turned over and
 * put back, or thrown in the carton. Its origin is the middle of its
 * footprint on the floor, its user's side facing +z, its back on the wall.
 */
export function createEngineersDesk(
  kit: PanelKit,
  options: EngineersDeskOptions = {},
) {
  const group = new Group();
  group.name = 'Engineer’s desk';
  const top = DESK.h;
  let deskModel: Object3D | null = null;
  // The desk itself, once its model is in.
  const ready = new GLTFLoader()
    .loadAsync(deskUrl)
    .then((gltf) => {
      const scene = gltf.scene;
      scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const material = o.material as MeshStandardMaterial;
        const map = material.map ? beechTexture(material.map) : null;
        if (map) {
          material.map = map;
          kit.textures.push(map);
        }
        material.metalness = 0;
        material.roughness = 0.6;
        kit.materials.push(material as Material);
      });
      const desk = fitTo(scene, new Vector3(DESK.w, DESK.h, DESK.d));
      desk.name = 'Desk';
      group.add(desk);
      deskModel = desk;
    })
    .catch(() => {});

  // The desk's top is where a dropped box lands because the desk's kind is
  // supportable. Its bounds model (mission 208), declared here beside the
  // drawn model, gives that top: the whole 1.6 × 0.8 m board at 0.73 m,
  // where rays cast on the drawn desk found only 0.62 m of its depth. No
  // hidden marker is laid over it.
  setBoundsModel(group, [
    boxBetween(
      { x: -DESK.w / 2, y: DESK.h - 0.03, z: -DESK.d / 2 },
      { x: DESK.w / 2, y: DESK.h, z: DESK.d / 2 },
    ),
  ]);
  // One let go over it lands there, one whose middle is past its edge falls to the floor (the
  // owner, 2026-10-31).

  // It boots DOS (the game's `dos` boot sequence) when its power is pressed.
  const pc = createPeriodPc(kit, {
    ...options,
    boot: options.boot ?? bootSequenceScreen('dos'),
  });
  pc.monitor.position.set(-0.22, top, -0.02);
  pc.monitor.rotation.y = 0.08;
  pc.tower.position.set(-0.6, top, -0.13);
  pc.tower.rotation.y = 0.05;
  pc.keyboard.position.set(-0.2, top, 0.24);
  pc.keyboard.rotation.y = -0.04;
  pc.mouse.position.set(0.17, top, 0.24);
  pc.mouse.rotation.y = 0.1;
  group.add(pc.monitor, pc.tower, pc.keyboard, pc.mouse);
  // The leads behind: tower to monitor, keyboard and mouse.
  group.add(
    createLead(kit, [
      new Vector3(-0.6, top + 0.2, -0.36),
      new Vector3(-0.45, top + 0.01, -0.38),
      new Vector3(-0.25, top + 0.01, -0.36),
      new Vector3(-0.22, top + 0.12, -0.3),
    ]),
    createLead(kit, [
      new Vector3(-0.6, top + 0.15, -0.36),
      new Vector3(-0.42, top + 0.005, -0.3),
      new Vector3(-0.2, top + 0.005, 0.12),
      new Vector3(-0.2, top + 0.015, 0.145),
    ]),
    createLead(
      kit,
      [
        new Vector3(-0.58, top + 0.12, -0.36),
        new Vector3(0.02, top + 0.004, -0.2),
        new Vector3(0.18, top + 0.004, 0.1),
        new Vector3(0.19, top + 0.02, 0.18),
      ],
      0.0022,
    ),
  );

  // Over the desk, on the wall at about head height: a cantilever shelf
  // on twin-slot uprights, the boxed software on it like books (the
  // owner, 2026-10-31).
  const shelf = createWallShelf(kit);
  shelf.position.set(SHELF.x, SHELF.top, -DESK.d / 2);
  group.add(shelf);
  const shelfBack = -DESK.d / 2 + WALL_SHELF_STANDOFF;
  // The space over the board, unseen, so that a box aimed into it is put
  // on the shelf: aimed there, a ray passes over the thin board to the
  // wall, which is not the desk's, and the box went home instead.
  const unseen = new MeshBasicMaterial({ visible: false });
  kit.materials.push(unseen);
  const shelfSpace = new Mesh(
    new BoxGeometry(WALL_SHELF.w, SHELF_SPACE_H, WALL_SHELF.d),
    unseen,
  );
  shelfSpace.name = 'Shelf space';
  // Seen only by the aim that places a held box, never by the camera or
  // by the aim that picks a box up, which it would otherwise block.
  shelfSpace.layers.set(PLACING_AIM_LAYER);
  shelfSpace.position.set(0, SHELF_SPACE_H / 2, WALL_SHELF.d / 2);
  shelf.add(shelfSpace);

  // The PC's carton beside the desk's open end, empty, kept in case it
  // ever goes back, and used as a bin. It stands on the floor between the
  // desk, the wall and the cupboard, so its flaps on those sides stand up,
  // leaning a little in, and only its flap to the room splays out.
  const carton = createDeskCarton(kit);
  // The carton is beside the desk, not the desk: no part of its top (175).
  markNonBody(carton);
  group.add(carton);

  // Three older boxes stand spine out, Chlorine Quest leans on them, and
  // PANES 95 and Fenestra Prospect stand beside it. Pool Simulator 97
  // faces the room at the shelf's right. The three desk boxes also have
  // reserved shelf slots. Every box can move among shelf, desk and carton.
  const wanted = options.titles ?? SOFTWARE_TITLES.map((t) => t.id);
  const titles = SOFTWARE_TITLES.filter((t) => wanted.includes(t.id));
  const byId = (id: string) => titles.find((t) => t.id === id);
  const things = createPutBack<string>();
  const boxes = new Map<Object3D, string>();
  const shelfHomes = new Set<string>();
  const deskHomes = new Set<string>();
  /** Set a title's box out on the desk at `pose`, resting on `restsOn`. */
  const setOut = (
    t: SoftwareTitle | undefined,
    pose: Pose,
    restsOn?: string,
    area: 'shelf' | 'desk' = 'shelf',
    shelfPose?: Pose,
  ) => {
    if (!t) return;
    const box = createSoftwareBox(kit, t);
    box.userData.softwareBox = t.id;
    // A software box is holdable by its kind (mission 189), not by the room.
    markEquipmentKind(box, 'software-box');
    const portable = createPortableBoard(
      createDropProfile('box', softwareBoxSize(t).h, 'board'),
    );
    portable.onEvent((event) => {
      if (event === 'pick-up') things.pickUp(t.id);
    });
    box.userData.portable = {
      component: portable,
      flat: 'face',
      detach: () => {},
    } satisfies PortableObject;
    applyPose(box, pose);
    group.add(box);
    boxes.set(box, t.id);
    things.home(
      t.id,
      pose,
      restsOn && byId(restsOn) ? restsOn : undefined,
      area,
    );
    if (shelfPose) things.shelfPose(t.id, shelfPose);
    (area === 'shelf' ? shelfHomes : deskHomes).add(t.id);
  };
  // The shelf: books standing from its left end, the last leaning.
  let x = SHELF.x - WALL_SHELF.w / 2 + 0.04;
  let last: SoftwareTitle | undefined;
  for (const id of ['deep-end', 'lido-tycoon', 'bookit-pro-4-for-workgroups']) {
    const t = byId(id);
    if (!t) continue;
    const size = softwareBoxSize(t);
    setOut(t, spineOut(size, x, SHELF.top, shelfBack, 0));
    x += size.d + 0.003;
    last = t;
  }
  const leaning = byId('chlorine-quest-ii-the-shallow-end');
  if (leaning) {
    const size = softwareBoxSize(leaning);
    const lean = 0.2;
    // Its top edge on the last one's side, or on its top corner if shorter.
    const gap = last
      ? Math.min(
          size.h * Math.sin(lean),
          softwareBoxSize(last).h * Math.tan(lean),
        )
      : 0;
    setOut(
      leaning,
      spineOut(size, x + gap, SHELF.top, shelfBack, last ? lean : 0),
      last?.id,
    );
    x += gap + size.d + 0.012;
  }
  for (const id of ['panes-95', 'fenestra-prospect-embedded', 'the-pool']) {
    const t = byId(id);
    if (!t) continue;
    const size = softwareBoxSize(t);
    setOut(t, spineOut(size, x, SHELF.top, shelfBack, 0));
    x += size.d + 0.006;
  }
  const spareShelf = new Map<string, Pose>();
  for (const id of ['coshh-manager-95', LEDGER, 'doseright-gold-2-1']) {
    const t = byId(id);
    if (!t) continue;
    const size = softwareBoxSize(t);
    spareShelf.set(id, spineOut(size, x, SHELF.top, shelfBack, 0));
    x += size.d + 0.006;
  }
  const star = byId('macrosoft-pool-simulator-97');
  if (star)
    setOut(
      star,
      faceOut(softwareBoxSize(star), SHELF.star, SHELF.top, shelfBack, 0.07),
    );
  // The desk: the pile, and one standing by the monitor.
  const pile = { x: 0.6, z: -0.25 };
  const coshh = byId('coshh-manager-95');
  let y: number = top;
  if (coshh) {
    setOut(
      coshh,
      flat(softwareBoxSize(coshh), pile.x, y, pile.z, 0.05),
      undefined,
      'desk',
      spareShelf.get(coshh.id),
    );
    y += softwareBoxSize(coshh).d;
  }
  const opened = byId(LEDGER);
  if (opened)
    setOut(
      opened,
      flat(softwareBoxSize(opened), pile.x, y, pile.z - 0.01, -0.12),
      coshh?.id,
      'desk',
      spareShelf.get(opened.id),
    );
  const standing = byId('doseright-gold-2-1');
  if (standing)
    setOut(
      standing,
      faceOut(softwareBoxSize(standing), 0.24, top, -DESK.d / 2, 0.08, -0.06),
      undefined,
      'desk',
      spareShelf.get(standing.id),
    );
  // The opened one's manual and disks out in front.
  if (opened) {
    const contents = createBoxContents(kit, opened);
    contents.position.set(0.47, top, 0.2);
    contents.rotation.y = 0.15;
    group.add(contents);
  }

  /** The aimed piece of furniture, including a box already resting on it. */
  const destination = (
    target?: Object3D,
  ): 'carton' | 'shelf' | 'desk' | null => {
    for (let o: Object3D | null = target ?? null; o; o = o.parent) {
      if (o === carton) return 'carton';
      if (o === shelf) return 'shelf';
      if (o === deskModel) return 'desk';
      const id = boxes.get(o);
      if (!id) continue;
      const where = things.where(id);
      if (where === 'binned') return 'carton';
      if (where === 'shelf' || (where === 'home' && shelfHomes.has(id)))
        return 'shelf';
      if (where === 'desk' || (where === 'home' && deskHomes.has(id)))
        return 'desk';
    }
    return null;
  };
  const boxOf = (id: string) => [...boxes].find(([, k]) => k === id)?.[0];
  /** A box's extent along the shelf (x), in the desk's frame. */
  const extentOf = (box: Object3D) => {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert();
    const bounds = new Box3();
    box.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox)
        bounds.union(
          child.geometry.boundingBox
            .clone()
            .applyMatrix4(
              new Matrix4().multiplyMatrices(inverse, child.matrixWorld),
            ),
        );
    });
    return { left: bounds.min.x, right: bounds.max.x };
  };
  /**
   * The shelf's row with the held `id` stood in it, tidily (the owner,
   * 2026-10-31): the right-most box stays where it is, the new one stands
   * just to its left, and the rest stand upright, spine out, closed up to
   * its left in the order they stood; every box's new pose, or null if
   * the row would not fit on the board.
   */
  const shelfRow = (id: string): Map<string, Pose> | null => {
    const on = [...boxes]
      .filter(([, k]) => {
        if (k === id) return false;
        const at = things.where(k);
        return at === 'shelf' || (at === 'home' && shelfHomes.has(k));
      })
      .map(([box, k]) => ({ k, ...extentOf(box) }))
      .sort((a, b) => a.left - b.left);
    const leftEnd = SHELF.x - WALL_SHELF.w / 2 + 0.02;
    const rightEnd = SHELF.x + WALL_SHELF.w / 2 - 0.02;
    const row = new Map<string, Pose>();
    const anchor = on.pop();
    let cursor = anchor ? anchor.left : rightEnd + SHELF_GAP;
    for (const k of [id, ...on.reverse().map((o) => o.k)]) {
      const size = softwareBoxSize(byId(k)!);
      cursor -= SHELF_GAP + size.d;
      if (cursor < leftEnd) return null;
      row.set(k, spineOut(size, cursor, SHELF.top, shelfBack, 0));
    }
    return row;
  };
  const handling = {
    /** Null if `object` is not one of the desk's boxes, else whether it may be picked up now. */
    canPickUp(object: Object3D) {
      const id = boxes.get(object);
      return id === undefined ? null : things.canPickUp(id);
    },
    /** Put a held box in the aimed carton, desk or shelf; otherwise return it home. */
    release(object: Object3D, target?: Object3D): boolean | 'refuse' | null {
      const id = boxes.get(object);
      if (id === undefined || things.held() !== id) return null;
      const portable = object.userData.portable as PortableObject;
      const size = softwareBoxSize(byId(id)!);
      const place = destination(target);
      if (place === 'carton') {
        const slot = things.bin(id)!;
        carton.add(object);
        applyPose(object, inBin(size, slot));
        portable.component.reset();
        return true;
      }
      if (place === 'shelf') {
        const row = shelfRow(id);
        if (!row) return 'refuse';
        things.shelve(
          id,
          [...row.keys()].filter((k) => k !== id),
        );
        for (const [k, pose] of row) {
          const box = boxOf(k)!;
          group.add(box);
          applyPose(box, pose);
        }
        portable.component.reset();
        return true;
      }
      // Anywhere else (the desk, the floor): let go, it falls where it
      // is, as anything carried does.
      things.loosen(id);
      return null;
    },
    /** What release would do at this target, for the crosshair's cue. */
    cue(object: Object3D, target?: Object3D): CarryAnswer | null {
      const id = boxes.get(object);
      if (id === undefined || things.held() !== id) return null;
      const place = destination(target);
      if (place === 'carton') return { gesture: 'put-in', possible: true };
      if (place === 'shelf')
        return shelfRow(id)
          ? { gesture: 'put-back', possible: true }
          : { gesture: 'put-back', possible: false, refused: true };
      return null;
    },
    /** What is in the carton, bottom first, by title id. */
    binned: () => things.binned(),
  };

  // A chair, pushed back a little, that can be sat in, facing the screen
  // (the bridge's seats, `controls/input/seating.ts`): a seat declares its
  // way as +z, the chair model faces -z, so it turns a half inside it.
  const chair = createOfficeChair(1);
  chair.group.rotation.y = Math.PI;
  const seat = new Group();
  seat.name = 'Office chair seat';
  seat.position.set(-0.15, 0, 0.75);
  seat.rotation.y = 0.25 + Math.PI;
  seat.userData.beside = true;
  seat.add(chair.group);
  // The chair is the chair's, not the desk's body: its arms are not the
  // desk's top (the derived surface, missions 175 and 181).
  markNonBody(seat);
  declareSeat(seat, {
    height: 0.45,
    lookAt: { x: -0.22, y: top + 0.2, z: -0.02 },
  });
  group.add(seat);

  return {
    group,
    /** The PC's uses: its power button, keyboard, mouse and screen. */
    uses: pc.uses,
    /** Resolves once the desk's model is in. */
    ready,
    /** Its boxes' picking up, putting back and binning. */
    handling,
    /** What stands on the floor beyond the desk's footprint, in the desk's frame: the carton, and the chair's base. */
    footprints: [
      deskCartonFootprint(),
      { minX: -0.45, maxX: 0.15, minZ: 0.45, maxZ: 1.0 },
    ],
    update: (delta: number) => pc.update(delta),
  };
}
