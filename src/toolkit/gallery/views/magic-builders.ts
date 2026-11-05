import { Group, Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { PartSet } from '../../components/core/parts/parts';
import { createWaterButterflyValve } from '../../components/plant/views/water-butterfly-valve';
import { createGasBallValve } from '../../components/plant/views/gas-fittings';
import { createCondensingBoiler } from '../../components/plant/views/boiler-plant';
import { createLevelTransmitter } from '../../components/plant/views/level-instruments';
import { createMagFlowmeter } from '../../components/plant/views/mag-flowmeter';
import { createSwitchFuse } from '../../components/industrial-control/views/switch-fuse';
import { SWITCH_FUSE } from '../../components/industrial-control/logic/enclosures';
import { createOzoneMonitor } from '../../components/plant/views/ozone-plant';
import { createEndSuctionPump } from '../../components/plant/views/pumps-plant';
import { createOfficeChair } from '../../components/site-dressing/views/office-chair';
import { createSoftwareBox } from '../../components/site-dressing/views/software-box';
import { createFloppyDisk } from '../../components/site-dressing/views/floppy-disk';
import { createPeriodPc } from '../../components/site-dressing/views/period-pc';
import { SOFTWARE_TITLES } from '../../components/site-dressing/logic/software-boxes';
import type { ItemSize } from '../logic/magic-room-layout';

/**
 * Standalone builders for the kinds the room layouts do not place (mission
 * 130's magic room and 133's CAD views; the owner, 2026-11-04): the
 * plumber's valves and meters, the feeders' switch-fuses, a cascade's
 * single boiler. Each is the game's own builder called with one
 * representative set of arguments; its size here only sizes the magic
 * room (the CAD views measure the built object). Kinds that exist only as
 * part of an assembly, or only in the model, are listed in
 * `NO_STANDALONE_FORM` with the reason. Views only.
 */

export interface KindBuilder {
  title: string;
  size: ItemSize;
  build(kit: PanelKit): {
    object: Object3D;
    parts?: PartSet;
    update?(delta: number): void;
  };
}

/** The object a builder returned: itself, or its `group` or `object`. */
function objectOf(built: unknown): { object: Object3D; parts?: PartSet } {
  if (built instanceof Object3D) return { object: built };
  const b = built as { group?: Object3D; object?: Object3D; parts?: PartSet };
  const object = b.group ?? b.object;
  if (!(object instanceof Object3D))
    throw new Error('A kind builder returned no object');
  // Only a real part set (its update and its lookup), not a builder's own `parts` field.
  const parts =
    b.parts &&
    typeof (b.parts as { update?: unknown }).update === 'function' &&
    typeof (b.parts as { keys?: unknown }).keys === 'function'
      ? b.parts
      : undefined;
  return { object, ...(parts ? { parts } : {}) };
}

const noop = () => {};

export const KIND_BUILDERS: Readonly<Record<string, KindBuilder>> = {
  'butterfly-valve': {
    title: 'Butterfly valve, DN100, lever operated',
    size: { w: 0.4, d: 0.4, h: 0.45, mount: 'floor' },
    build: (kit) =>
      objectOf(
        createWaterButterflyValve(kit, 100, 'x', 'Butterfly valve', {
          open: () => true,
          set: noop,
        }),
      ),
  },
  'gas-ball-valve': {
    title: 'Gas ball valve',
    size: { w: 0.3, d: 0.25, h: 0.25, mount: 'floor' },
    build: (kit) => objectOf(createGasBallValve(kit, {})),
  },
  boiler: {
    title: 'Condensing boiler, 300 kW',
    size: { w: 0.8, d: 0.66, h: 1.66, mount: 'floor' },
    build: (kit) => objectOf(createCondensingBoiler(kit)),
  },
  'level-transmitter': {
    title: 'Radar level transmitter',
    size: { w: 0.15, d: 0.15, h: 0.3, mount: 'floor' },
    build: (kit) => objectOf(createLevelTransmitter(kit, true)),
  },
  flowmeter: {
    title: 'Electromagnetic flowmeter',
    size: { w: 0.45, d: 0.35, h: 0.4, mount: 'floor' },
    build: (kit) => objectOf(createMagFlowmeter(kit, { od: 0.11, tag: 'FT1' })),
  },
  'switch-fuse': {
    title: 'Switch-fuse',
    size: {
      w: SWITCH_FUSE.w,
      d: SWITCH_FUSE.d,
      h: SWITCH_FUSE.h,
      mount: 'wall',
      y: 1.5,
    },
    build: (kit) => objectOf(createSwitchFuse(kit)),
  },
  'ozone-monitor': {
    title: 'Ozone-in-air monitor',
    size: { w: 0.3, d: 0.12, h: 0.3, mount: 'wall', y: 1.5 },
    build: (kit) =>
      objectOf(createOzoneMonitor(kit, { test: noop, reset: noop })),
  },
  'office-chair': {
    title: 'Office chair',
    size: { w: 0.65, d: 0.65, h: 1.1, mount: 'floor' },
    build: () => objectOf(createOfficeChair(1)),
  },
  'software-box': {
    title: 'Software box',
    size: { w: 0.3, d: 0.1, h: 0.35, mount: 'floor' },
    build: (kit) => objectOf(createSoftwareBox(kit, SOFTWARE_TITLES[0])),
  },
  'floppy-disk': {
    title: 'Floppy disk',
    // 90 × 94 × 3.3 mm, displayed standing on a plinth in the magic room.
    size: { w: 0.09, d: 0.094, h: 0.1, mount: 'wall', y: 1.1 },
    build: (kit) =>
      objectOf(createFloppyDisk(kit, { label: 'DISK', sub: 'Disk 1 of 3' })),
  },
  'office-computer': {
    title: 'Office computer',
    size: { w: 0.6, d: 0.6, h: 0.6, mount: 'floor' },
    build: (kit) => {
      // The PC comes as its parts, laid out by the desk; set them out as on one.
      const pc = createPeriodPc(kit);
      const group = new Group();
      group.name = 'Office computer';
      pc.tower.position.set(-0.35, 0, 0);
      pc.keyboard.position.set(0.05, 0, 0.3);
      pc.mouse.position.set(0.32, 0, 0.3);
      group.add(pc.monitor, pc.tower, pc.keyboard, pc.mouse);
      return { object: group };
    },
  },
  pump: {
    title: 'End-suction pump',
    size: { w: 1.2, d: 0.5, h: 0.6, mount: 'floor' },
    build: (kit) => objectOf(createEndSuctionPump(kit)),
  },
};

/**
 * Kinds with no standalone 3D form, and why: drawn only inside an
 * assembly (whose magic room shows them), or only a model abstraction.
 * Their audit gets a magic page.
 */
export const NO_STANDALONE_FORM: Readonly<Record<string, string>> = {
  pool: 'a basin built into its pool hall floor, with no standalone item',
  footbath:
    'a channel built across its pool hall passage, with no standalone item',
  'cabinet-switch':
    'part of the Jacuzzi and spa packs (jacuzzi-pack, spa-pack)',
  'cartridge-filter':
    'part of the Jacuzzi and spa packs (jacuzzi-pack, spa-pack)',
  'dosing-set': 'part of the Jacuzzi and spa packs (jacuzzi-pack, spa-pack)',
  penstock: 'part of a balance tank (its drain, worked from the gantry)',
  'temperature-sensor':
    'part of a pool temperature control loop, drawn in its pipe',
  pipework:
    'a model abstraction: runs are drawn by the plumber along their routes',
  valve:
    'a model abstraction: each valve is drawn as its own kind (butterfly-valve, gas-ball-valve)',
  filing: 'not placed in any room yet',
  'tanker-stand': 'not placed in any room yet',
};
