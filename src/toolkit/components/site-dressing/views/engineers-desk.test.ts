import { Box3, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { layoutRoom } from '../../../gallery/logic/room-equipment';
import { createPanelKit } from '../../core/views/eighties-controls';
import {
  DESK,
  SHELF,
  createDeskCarton,
  createEngineersDesk,
  deskCartonFootprint,
} from './engineers-desk';
import { WALL_SHELF } from './office-wall-shelf';
import { createOfficeChair } from './office-chair';
import { bootSequenceScreen } from './period-pc';
import { seatDeclared } from '../../../controls/input/seating';
import { bootFrame, bootScript } from '../../core/logic/boot-sequence';

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

it('fits both operating-system boxes and The Pool beside the older titles on the shelf', () => {
  const built = createEngineersDesk(createPanelKit());
  const boxes = new Map<string, Box3>();
  built.group.updateMatrixWorld(true);
  built.group.traverse((object) => {
    const id = object.userData.softwareBox as string | undefined;
    if (id) boxes.set(id, new Box3().setFromObject(object));
  });
  const panes = boxes.get('panes-95')!;
  const fenestra = boxes.get('fenestra-prospect-embedded')!;
  const pool = boxes.get('the-pool')!;
  const star = boxes.get('macrosoft-pool-simulator-97')!;
  const shelfLeft = SHELF.x - WALL_SHELF.w / 2;
  const shelfRight = SHELF.x + WALL_SHELF.w / 2;
  for (const box of [panes, fenestra, pool]) {
    expect(box.min.x).toBeGreaterThan(shelfLeft);
    expect(box.max.x).toBeLessThan(shelfRight);
    expect(box.min.y).toBeGreaterThanOrEqual(SHELF.top - 0.002);
  }
  expect(panes.max.x).toBeLessThan(fenestra.min.x);
  expect(fenestra.max.x).toBeLessThan(pool.min.x);
  expect(pool.max.x).toBeLessThan(star.min.x);
});

/** The gap between two boxes on the floor, metres: negative where they overlap. */
const gap = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
) =>
  Math.max(b.minX - a.maxX, a.minX - b.maxX, b.minZ - a.maxZ, a.minZ - b.maxZ);
const flat = (box: Box3) => ({
  minX: box.min.x,
  maxX: box.max.x,
  minZ: box.min.z,
  maxZ: box.max.z,
});

it('stands the carton, flaps and all, clear of the desk, wall, chair and cupboard', () => {
  const carton = createDeskCarton(createPanelKit());
  carton.updateMatrixWorld(true);
  // In the desk's frame: the whole carton, and each flap on its own.
  const whole = new Box3().setFromObject(carton);
  const flaps = carton.children
    .filter((child) => child.type === 'Group')
    .map((hinge) => new Box3().setFromObject(hinge));
  expect(flaps).toHaveLength(4);
  for (const flap of flaps) expect(whole.containsBox(flap)).toBe(true);

  const spare = 0.03;
  // The desk: its end at −w/2, under its top.
  const desk = {
    minX: -DESK.w / 2,
    maxX: DESK.w / 2,
    minZ: -DESK.d / 2,
    maxZ: DESK.d / 2,
  };
  expect(gap(flat(whole), desk)).toBeGreaterThanOrEqual(spare);
  // The wall the desk's back is against, with a centimetre of its finish.
  expect(whole.min.z - (-DESK.d / 2 + 0.01)).toBeGreaterThanOrEqual(spare);
  // The chair, pushed back.
  const chair = createOfficeChair(1).group;
  chair.position.set(-0.15, 0, 0.75);
  chair.rotation.y = 0.25;
  chair.updateMatrixWorld(true);
  expect(
    gap(flat(whole), flat(new Box3().setFromObject(chair))),
  ).toBeGreaterThanOrEqual(spare);
  // The walking solid holds all of it.
  const footprint = deskCartonFootprint();
  expect(footprint.minX).toBeLessThanOrEqual(whole.min.x);
  expect(footprint.maxX).toBeGreaterThanOrEqual(whole.max.x);
  expect(footprint.minZ).toBeLessThanOrEqual(whole.min.z);
  expect(footprint.maxZ).toBeGreaterThanOrEqual(whole.max.z);

  // In the office: the stores cupboard beside it, and the room's walls.
  const layout = layoutRoom('engineers_office')!;
  const at = (key: string) => layout.placed.find((p) => p.item.key === key)!;
  const placed = at('desk');
  const c = Math.cos(placed.yaw);
  const s = Math.sin(placed.yaw);
  const corners = [0, 1, 2, 3].map(
    (i) =>
      new Vector3(
        i & 1 ? whole.max.x : whole.min.x,
        0,
        i & 2 ? whole.max.z : whole.min.z,
      ),
  );
  const world = corners.map((p) => ({
    x: placed.x + p.x * c + p.z * s,
    z: placed.z - p.x * s + p.z * c,
  }));
  const inRoom = {
    minX: Math.min(...world.map((p) => p.x)),
    maxX: Math.max(...world.map((p) => p.x)),
    minZ: Math.min(...world.map((p) => p.z)),
    maxZ: Math.max(...world.map((p) => p.z)),
  };
  for (const key of ['storage-cupboard:solid', 'storage-cupboard:glass'])
    expect(gap(inRoom, at(key).footprint)).toBeGreaterThanOrEqual(spare);
  const { w, d } = layout.box;
  expect(inRoom.minX + w / 2 - 0.01).toBeGreaterThanOrEqual(spare);
  expect(w / 2 - inRoom.maxX).toBeGreaterThanOrEqual(spare);
  expect(inRoom.minZ + d / 2).toBeGreaterThanOrEqual(spare);
  expect(d / 2 - inRoom.maxZ).toBeGreaterThanOrEqual(spare);
});

it('boots its PC through the dos boot sequence, redrawing only when the picture changes, and has a chair to sit in', () => {
  const built = createEngineersDesk(createPanelKit());
  const seat = built.group.getObjectByName('Office chair seat');
  expect(seat && seatDeclared(seat)?.height).toBeCloseTo(0.45);
  const screen = bootSequenceScreen('dos');
  const script = bootScript('dos', { seed: 3 });
  expect(screen.seconds).toBe(script.total);
  expect(screen.key!(0)).toBe(bootFrame(script, 0).key);
  const keys = new Set<string>();
  for (let t = 0; t < screen.seconds; t += 0.01) keys.add(screen.key!(t));
  // Far fewer pictures than frames: at most ten a second.
  expect(keys.size).toBeLessThan(screen.seconds * 10 + 10);
  expect(keys.size).toBeGreaterThan(3);
});
