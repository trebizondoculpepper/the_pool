import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { MimicSpec } from '../../../components/industrial-control/logic/mimic';
import type { FlowState } from '../../../components/industrial-control/logic/mimic-chaser';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { createLoungeFilterMimic } from '../../views/lounge-filter-mimic';
import { createEnergyMimic } from '../../views/energy-mimic';
import { createScenarioStore } from '../../../save/world-store';
import { advance, newWorld } from '../../../../game/world';
import { clockStopped, paused } from '../../../controls/logic/paused';
import { createChemControlPrototype } from '../../../components/plant/views/chem-control-prototype';
import {
  createDirtyWaterMimic,
  createFreshWaterMimic,
} from '../../views/wet-hall';
import { createCascadeManagerTrial } from '../../views/cascade-manager-trial';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Control panels and assemblies: mimics, control boards and other built-up panels, tried here before the plant uses them';

/**
 * Dev39, the room for control panels and other assemblies (the owner,
 * 2026-10-25): dev0 tries single components (a button, a lamp, a
 * meter); this room tries what is built from many of them, a mimic, a
 * control board, a cubicle's fascia, before the plant rooms carry it.
 * First, the mimic's LED chaser (prompt 066).
 */

/** The chaser trial: one line chasing forward, one back, one still, one changing. */
const CHASER_MIMIC: MimicSpec = {
  title: 'MIMIC LED CHASER TRIAL',
  width: 1.2,
  height: 0.7,
  lines: [
    {
      colour: '#2a5f9e',
      points: [
        [-0.45, 0.18],
        [0.45, 0.18],
      ],
      flow: { id: 'forward' },
    },
    {
      colour: '#2a5f9e',
      points: [
        [-0.45, 0.06],
        [0.45, 0.06],
      ],
      flow: { id: 'back' },
    },
    {
      colour: '#2a5f9e',
      points: [
        [-0.45, -0.06],
        [0.45, -0.06],
      ],
      flow: { id: 'still' },
    },
    {
      colour: '#7a5a2a',
      points: [
        [-0.45, -0.18],
        [0, -0.18],
        [0, -0.1],
        [0.45, -0.1],
      ],
      flow: { id: 'cycle', amber: true },
    },
  ],
  shapes: [],
  labels: [
    { text: 'FORWARD', at: [-0.53, 0.18], size: 0.6 },
    { text: 'BACK', at: [-0.53, 0.06], size: 0.6 },
    { text: 'STILL', at: [-0.53, -0.06], size: 0.6 },
    { text: 'CYCLE', at: [-0.53, -0.18], size: 0.6 },
  ],
  lamps: [],
  readouts: [],
  modes: [],
};

/** The changing line's state at `seconds`: forward, still, back, still, four seconds each. */
const cycle = (seconds: number): FlowState =>
  (['forward', 'still', 'back', 'still'] as const)[Math.floor(seconds / 4) % 4];

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Fresh Water Distribution mimic',
    reference:
      'Mission 119: Penfold Controls four-branch fresh-water board, tried here before its wet-hall installation',
    size: { w: 2.8, d: 0.08, h: 1.6, mount: 'wall', y: 1.6 },
    build: (kit) => createFreshWaterMimic(kit, true),
  },
  {
    title: 'Pit Inflow Sources mimic',
    reference:
      'Mission 119: Penfold Controls four-branch pit inflow board, tried here before its wet-hall installation',
    size: { w: 2.8, d: 0.08, h: 1.6, mount: 'wall', y: 1.6 },
    build: (kit) => createDirtyWaterMimic(kit, true),
  },
  {
    title: 'Mimic LED chaser',
    reference:
      'A Penfold mimic board, 1.2 × 0.7 m, with LED chasers (6 mm LEDs at 25 mm, one in four lit, stepping every 0.12 s) along its lines',
    size: { w: 1.3, d: 0.08, h: 0.8, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      const mimic = createMimicBoard(kit, CHASER_MIMIC);
      return {
        object: mimic.group,
        parts: mimic.parts,
        update(delta) {
          mimic.parts.update(delta);
          mimic.show({
            lamps: {},
            readouts: {},
            flows: {
              forward: 'forward',
              back: 'back',
              still: 'still',
              cycle: cycle(performance.now() / 1000),
            },
          });
        },
      };
    },
  },
  {
    title: 'Lounge pool filter mimic',
    reference:
      'PL1-CP1’s fascia and the control room’s wall board (prompt 066): a Penfold mimic, 2.4 × 1.2 m, the lounge battery grouped by filter, worked against this room’s own world',
    size: { w: 2.5, d: 0.08, h: 1.3, mount: 'wall', y: 1.45 },
    build(kit): LiveExhibit {
      // A world of its own, fresh, in memory (dev rooms start fresh).
      const store = createScenarioStore(newWorld());
      store.run(true);
      const mimic = createLoungeFilterMimic(kit, store);
      return {
        object: mimic.group,
        parts: mimic.parts,
        update: mimic.update,
        dispose: () => store.stop(),
      };
    },
  },
  {
    title: 'Heat energy mimic',
    reference:
      'Mission 120: a Penfold mimic, 2.4 × 1.2 m, each facility’s heat from the LTHW ring (each pool’s water and hall air, the museum, reception, changing, DHW), its share, the total, and the ring’s supply, flow and return, worked against this room’s own world, before the old control room carries it',
    size: { w: 2.5, d: 0.08, h: 1.3, mount: 'wall', y: 1.45 },
    build(kit): LiveExhibit {
      // A world of its own, settled for ten minutes, its clock the game's.
      const store = createScenarioStore(advance(newWorld(), 600, 10));
      const mimic = createEnergyMimic(kit, store);
      return {
        object: mimic.object,
        parts: mimic.parts,
        update(delta) {
          store.run(!clockStopped.value && !paused.value);
          mimic.update(delta);
        },
        dispose: () => store.stop(),
      };
    },
  },
  {
    title: 'Boiler cascade manager',
    reference:
      'Mission 122: the Hamwarmy CM6, after Hamworthy’s Merley, Siemens’ Albatros RVS cascade controllers and Viessmann’s Vitotronic 300-K, 300 × 240 × 85 mm, a 240 × 128 dot FSTN display, a turn-and-push knob, HOME, BACK and INFO keys, six boiler LEDs, its terminal flap and SERVICE key, and the PLANT ENABLE key switch beside it; run by a stand-in sequencer ten times fast, with a trial station to start, stop and trip boilers',
    maker: 'hamwarmy',
    size: { w: 0.5, d: 0.1, h: 0.46, mount: 'wall', y: 1.55 },
    build: (kit) => createCascadeManagerTrial(kit),
  },
  {
    title: 'Chemical distribution terminals and control box',
    reference:
      'WH-CP1’s replacement on trial (prompt 091): two Chlorella OT-216 operator terminals, about 240 × 168 × 60 mm green clamshells, 16 × 2 STN LCD behind a printed fascia with membrane keys, one each for hypochlorite and acid, and their 600 × 400 × 200 mm control box, run by their own trial ten times fast, with a trial station for the local controls and faults',
    size: { w: 3.0, d: 0.8, h: 2.3, mount: 'floor' },
    build: (kit) => createChemControlPrototype(kit),
  },
];
