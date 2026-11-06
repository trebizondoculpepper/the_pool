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
import { createWallShelf } from '../../components/site-dressing/views/office-wall-shelf';
import { createPeriodPc } from '../../components/site-dressing/views/period-pc';
import {
  createDesk,
  createDeskCarton,
} from '../../components/site-dressing/views/engineers-desk';
import { createSkip } from '../../components/site-dressing/views/skip';
import { createWasteBin } from '../../components/site-dressing/views/waste-bin';
import { createHumanLadder } from '../../components/architectural/views/human-ladder';
import { SOFTWARE_TITLES } from '../../components/site-dressing/logic/software-boxes';
import type { ItemSize } from '../logic/magic-room-layout';

/**
 * Standalone builders for the kinds the room layouts do not place (mission
 * 130's magic room and 133's CAD views; the owner, 2026-11-04): the
 * plumber's valves and meters, the feeders' switch-fuses, a cascade's
 * single boiler. Each is the game's own builder called with one
 * representative set of arguments, and that is all an entry needs: its
 * title is the kind's registered type, its size is measured from what it
 * builds and its mounting follows the kind's support trait (the owner,
 * 2026-11-05). A title or size is given only where it says more. Kinds that exist only as
 * part of an assembly, or only in the model, are listed in
 * `NO_STANDALONE_FORM` with the reason. Views only.
 */

export interface KindBuilder {
  /** Only where it says more than the kind's registered type (a valve's size and how it is worked). */
  title?: string;
  /**
   * Only where measuring would mislead (a wall item's height on its wall);
   * otherwise the magic room measures the built object and mounts it by the
   * kind's support trait (`kindItemSize` in `magic-adapters.ts`).
   */
  size?: ItemSize;
  /**
   * Used even where a room places the kind: the room builds it as part of
   * an assembly (the desk with its PC), the magic room and CAD views the
   * thing alone (the owner, 2026-11-05: "make the desk just a desk").
   */
  alone?: boolean;
  build(kit: PanelKit): {
    object: Object3D;
    parts?: PartSet;
    update?(delta: number): void;
    /** Resolves once anything it loads is in (a model file). */
    ready?: Promise<unknown>;
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
    build: (kit) =>
      objectOf(
        createWaterButterflyValve(kit, 100, 'x', 'Butterfly valve', {
          open: () => true,
          set: noop,
        }),
      ),
  },
  'gas-ball-valve': {
    build: (kit) => objectOf(createGasBallValve(kit, {})),
  },
  // A water lever ball valve, its lever red (#47: the dosing pot's).
  'ball-valve': {
    title: 'Ball valve, DN15, lever operated',
    build: (kit) =>
      objectOf(
        createGasBallValve(kit, {
          pipeRadius: 0.0075,
          name: 'Ball valve',
          lever: '#c42b23',
        }),
      ),
  },
  boiler: {
    title: 'Condensing boiler, 300 kW',
    build: (kit) => objectOf(createCondensingBoiler(kit)),
  },
  'level-transmitter': {
    title: 'Radar level transmitter',
    build: (kit) => objectOf(createLevelTransmitter(kit, true)),
  },
  flowmeter: {
    title: 'Electromagnetic flowmeter',
    build: (kit) => objectOf(createMagFlowmeter(kit, { od: 0.11, tag: 'FT1' })),
  },
  'switch-fuse': {
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
    size: { w: 0.3, d: 0.12, h: 0.3, mount: 'wall', y: 1.5 },
    build: (kit) =>
      objectOf(createOzoneMonitor(kit, { test: noop, reset: noop })),
  },
  'office-chair': {
    title: 'Office chair',
    build: () => objectOf(createOfficeChair(1)),
  },
  'software-box': {
    build: (kit) => objectOf(createSoftwareBox(kit, SOFTWARE_TITLES[0])),
  },
  'floppy-disk': {
    // 90 × 94 × 3.3 mm, displayed standing on a plinth in the magic room.
    size: { w: 0.09, d: 0.094, h: 0.1, mount: 'wall', y: 1.1 },
    build: (kit) =>
      objectOf(createFloppyDisk(kit, { label: 'DISK', sub: 'Disk 1 of 3' })),
  },
  'office-shelf': {
    // The wall shelf: a rack for the office's boxed software (mission 206).
    build: (kit) => objectOf(createWallShelf(kit)),
  },
  // The human ladders (#18): each kind carries `ladder`, climbed where placed.
  'pool-ladder': {
    build: () => objectOf(createHumanLadder('pool', 1.2).group),
  },
  'caged-ladder': {
    build: (kit) =>
      objectOf(createHumanLadder('caged', 3, { kit, landing: false }).group),
  },
  'utility-ladder': {
    build: (kit) =>
      objectOf(
        createHumanLadder('utility', 1.5, { kit, landing: false }).group,
      ),
  },
  'tank-access-ladder': {
    build: (kit) =>
      objectOf(createHumanLadder('tank-access', 2, { kit }).group),
  },
  'office-computer': {
    title: 'Office computer',
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
  skip: {
    title: 'Mini skip',
    build: (kit) => ({ object: createSkip(kit).group }),
  },
  dustbin: {
    build: (kit) => ({ object: createWasteBin(kit).group }),
  },
  carton: {
    build: (kit) => {
      // The desk sets its carton beside it; here it stands on its own.
      const carton = createDeskCarton(kit);
      carton.position.set(0, 0, 0);
      carton.rotation.y = 0;
      return { object: carton };
    },
  },
  desk: {
    alone: true,
    build: (kit) => createDesk(kit),
  },
  // Components of their own, though the desk lays them out (the owner, 2026-11-05).
  'pc-tower': {
    title: 'Computer (Gateway 3000 tower)',
    build: (kit) => ({ object: createPeriodPc(kit).tower }),
  },
  'pc-monitor': {
    title: 'CRT monitor',
    build: (kit) => ({ object: createPeriodPc(kit).monitor }),
  },
  pump: {
    title: 'End-suction pump',
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
