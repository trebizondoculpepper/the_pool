import { Group } from 'three';
import { markComponent } from '../../../components/core/views/component-identity';
import { createBoilerSounder } from '../../../components/plant/views/boiler-sounder';
import { computed, signal } from '@preact/signals-core';
import { clockStopped, paused } from '../../../controls/logic/paused';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createModulatingControlTrial } from '../../../components/plant/views/modulating-control-trial';
import {
  createPartSet,
  mushroomStop,
  pushButton,
} from '../../../components/core/parts/parts';
import { createBoilerPanel } from '../../../components/plant/views/boiler-controls';
import { createGasBallValve } from '../../../components/plant/views/gas-fittings';
import type { BallValveView } from '../../../components/plant/views/gas-fittings';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import {
  boilerStatus,
  gasPressures,
  gasTo,
  meterFlow,
} from '../../../components/plant/logic/boiler-house';
import type {
  BoilerState,
  GasHouse,
} from '../../../components/plant/logic/boiler-house';
import { createCombustionPanel } from '../../../components/plant/views/combustion-panel';
import { createPoolTemperatureControlTrial } from '../../../components/plant/views/pool-temperature-control-trial';
import {
  createPoolTemperatureController,
  createPoolTemperatureProbe,
} from '../../../components/plant/views/pool-temperature-controller';
import { layoutPlantRoom, WALL_FACE } from '../../logic/plant-room-layout';
import type {
  ExhibitSize,
  PlantRoomLayout,
} from '../../logic/plant-room-layout';
import { tools } from '../../../components/core/views/fitting-tools';
import { currentPlant } from './live-plant';
import { GAS_MIMIC, gasState } from '../../logic/pool-mimics';
import {
  BOILER_HEAT_MIMIC,
  BOILER_HEAT_PANEL,
  boilerHeatState,
  cascadeOf,
} from '../../logic/boiler-heat-mimic';
import {
  CM6_INSTALLED_WIDTH,
  CM6_SIZE,
  createCascadeManager,
} from '../../../components/plant/views/cascade-manager';
import type { CascadeManagerView } from '../../../components/plant/logic/cascade-manager';
import {
  cascadeAction,
  cascadeViewOf,
  logHeader,
} from '../../logic/cascade-manager-view';
import type { HeaderLog } from '../../logic/cascade-manager-view';
import {
  createBoilerCascade,
  createCalorifier,
  createDosingPot,
  createGasSafetyBoard,
  createGasTrain,
  createLowLossHeader,
  createPressurisation,
  createTwinHeadPump,
} from '../../../components/plant/views/boiler-plant';
import { gasBeacon } from '../../../components/general-safety/parts/gas-parts';
import { roomWorld } from '../../../save/world-store';
import {
  actOnBoilerGas,
  newBoilerGas,
  stepBoilerGas,
} from '../../../../game/plant/boiler-gas';
import type {
  BoilerGasAction,
  BoilerGasState,
} from '../../../../game/plant/boiler-gas';
import {
  actOnBoilerHouse,
  newBoilerHouse,
  stepBoilerHouse,
} from '../../../../game/plant/boiler-plant';
import type {
  BoilerHouseAction,
  BoilerHouseState,
} from '../../../../game/plant/boiler-plant';

/**
 * The boiler house, working: its six boilers' controllers, their
 * combustion air and their sequencer are the world's (mission 121,
 * `game/plant/boiler-plant.ts`): they run whichever room the player is
 * in, and here they are shown and worked. Each boiler fires as the
 * sequencer calls it, on the LTHW ring's header; closing the emergency
 * control valve or striking the emergency stop takes the boilers' gas
 * away, the sequencer releases them, and the displays say GAS.
 *
 * The gas safety itself (the ECV, the emergency stop, the detector and
 * the SSOV) is the world's too (`game/plant/boiler-gas.ts`). Where there
 * is no world (no page), the room runs its own copies of both.
 */
const room = {
  ecv: null as BallValveView | null,
  /** The boiler house's electrical supply where there is no world: on, unless bound. */
  powered: () => true,
  seconds: 0,
};

/** The world, where there is a page to keep it (not in tests). */
const store = () => (typeof window === 'undefined' ? null : roomWorld());
/** The gas safety where there is no world (no page): the room's own. */
const ownGas = signal<BoilerGasState>(newBoilerGas());
/** The boiler house where there is no world: the room's own. */
const ownHouse = signal<BoilerHouseState>(newBoilerHouse());
/** The boiler house's gas safety, as the world has it. */
const gasSafety = (): BoilerGasState =>
  store()?.world.value.boilerGas ?? ownGas.value;
/** The boiler house's boilers, combustion and sequencer, as the world has them. */
const houseNow = (): BoilerHouseState =>
  store()?.world.value.boilerHouse ?? ownHouse.value;
/** Work the gas safety: in the world, else the room's own. */
const actOnGas = (action: BoilerGasAction) => {
  const world = store();
  if (world) world.dispatch({ type: 'boiler-gas', action });
  else ownGas.value = actOnBoilerGas(ownGas.value, action);
};
/** Work the boiler house: in the world, else the room's own. */
const actOnHouse = (action: BoilerHouseAction) => {
  const world = store();
  if (world) world.dispatch({ type: 'boiler-house', action });
  else ownHouse.value = actOnBoilerHouse(ownHouse.value, action);
};

/** Each boiler's manual gas isolating valve: all open (none is drawn to shut). */
const ISOLATORS: readonly boolean[] = [true, true, true, true, true, true];
let gasShown: { from: BoilerGasState; house: GasHouse } | null = null;
/** The gas house as the world's gas safety has it, the same object until that changes. */
const gasHouse = (): GasHouse => {
  const g = gasSafety();
  if (gasShown?.from !== g)
    gasShown = {
      from: g,
      house: {
        ecvOpen: g.ecvOpen,
        stopPressed: g.stopPressed,
        gasDetected: g.gasDetected,
        ssovOpen: g.ssovOpen,
        isolators: [...ISOLATORS],
      },
    };
  return gasShown.house;
};

/**
 * The boiler house's boilers and gas, read only: for the control room's
 * copies of its mimics (the owner, 2026-11-01), which show what the
 * boiler house's boards show. The world's (mission 121).
 */
export const boilerHouseShown = (): {
  readonly boilers: readonly BoilerState[];
  readonly gas: GasHouse;
} => ({ boilers: houseNow().boilers, gas: gasHouse() });

// A development handle for the console: the boiler house's state.
if (typeof window !== 'undefined')
  Object.defineProperty(window, 'boilerHouse', {
    get: () => ({ ...houseNow(), gas: gasHouse() }),
    configurable: true,
  });

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Boilers, low-loss header, heating pumps, pressurisation and gas safety';

/** Bind the boiler house's supply where there is no world (the world's own steps its boilers). */
export function bindBoilerSupply(powered: () => boolean) {
  room.powered = powered;
}

export function createLiveBoilerCascade(
  kit: Parameters<PlantExhibit['build']>[0],
  first: number,
): LiveExhibit {
  const parts = createPartSet();
  const panels = [0, 1].map((offset) => {
    const i = first + offset;
    const panel = createBoilerPanel(
      kit,
      (key) => actOnHouse({ act: 'press', boiler: i, key }),
      (celsius) => actOnHouse({ act: 'setpoint', boiler: i, celsius }),
    );
    for (const [o, use] of panel.parts.uses) parts.uses.set(o, use);
    return panel;
  });
  const cascade = createBoilerCascade(kit, {
    panels: panels.map((panel) => panel.group),
    first: first + 1,
  });
  // Each boiler's sounds, from its casing (`boiler-sounder.ts`; the owner,
  // 2026-11-01).
  const sounders = cascade.boilers.map((boiler, offset) => {
    const sounder = createBoilerSounder(kit, `B-50${first + offset + 1}`);
    // Beside it, not in it: the boiler's own body stays what is inspected.
    sounder.object.position.copy(boiler.position);
    sounder.object.position.y += 0.8;
    boiler.parent?.add(sounder.object);
    parts.add(sounder);
    return sounder;
  });
  cascade.boilers.forEach((boiler, offset) => {
    const tag = `B-50${first + offset + 1}`;
    const index = first + offset;
    markComponent(boiler, {
      tag,
      model: { node: tag },
      status: () =>
        boilerStatus(houseNow().boilers[index], {
          powered: store() ? true : room.powered(),
          gas: gasTo(gasHouse(), index),
        }),
    });
  });
  return {
    object: cascade,
    parts,
    update(delta) {
      // The world steps the boilers (mission 121); with no world, one
      // cascade steps the room's own, as the world would, on the plant's
      // reading. Either stands still with the world's clock (the menu, the
      // console's pause): its displays then have nothing new to show
      // (mission 094).
      const running = !paused.value && !clockStopped.value;
      if (first === 0 && running) {
        room.seconds += delta;
        if (!store()) {
          const plant = currentPlant();
          const gas = gasSafety();
          ownHouse.value = stepBoilerHouse(
            ownHouse.value,
            {
              gas: gas.ecvOpen && gas.ssovOpen,
              powered: room.powered(),
              circulating: true,
              outside: 12,
              loadCalling: true,
            },
            plant.lthw,
            plant.lthwReturn ?? plant.lthw - 4,
            Math.min(delta, 1),
          );
        }
      }
      const { boilers } = houseNow();
      const gas = gasHouse();
      // What each boiler's sounds follow; the room updates its parts.
      sounders.forEach((sounder, offset) =>
        sounder.show(boilers[first + offset]),
      );
      // Each display says GAS while no gas reaches its boiler, firing or not.
      panels.forEach((panel, offset) =>
        panel.show(
          boilers[first + offset],
          room.seconds,
          delta,
          gasTo(gas, first + offset),
        ),
      );
    },
  };
}

/** The wall-mounted controller and a physically separate outlet probe for dev65. */
function createPoolTemperatureControllerCabinet(
  kit: Parameters<PlantExhibit['build']>[0],
): LiveExhibit {
  const t = tools(kit);
  const controller = createPoolTemperatureController(
    kit,
    'pool_01',
    'analogue',
  );
  const object = new Group();
  object.name = 'Pool exchanger temperature controller cabinet exhibit';
  const backboard = t.box(
    object,
    t.paint('#a8aa9f', 0.7),
    0.84,
    1.28,
    0.04,
    0,
    0,
    0.02,
  );
  backboard.name = 'Controller cabinet wall backboard';
  controller.group.position.z = 0.03;
  object.add(controller.group);

  // A separate outlet-pipe spool carries the pocket Pt100 probe below the rack.
  const pipe = t.paint('#aeb5b5', 0.55, 0.68);
  t.cyl(object, pipe, 0.04, 0.72, 0.43, -0.62, 0.48, 'x', 16).name =
    'Pool-water outlet demonstration pipe';
  const probe = createPoolTemperatureProbe(kit, 'DEV65-TE1', 0.08);
  probe.position.set(0.43, -0.62, 0.48);
  probe.rotation.x = -Math.PI / 2;
  object.add(probe);
  const cable = t.paint('#272b2d', 0.35, 0.75);
  t.cyl(object, cable, 0.009, 0.38, 0.43, -0.35, 0.54, 'y', 8);
  t.cyl(object, cable, 0.009, 0.42, 0.22, -0.16, 0.54, 'x', 8);
  t.cyl(object, cable, 0.009, 0.3, 0.01, -0.16, 0.38, 'z', 8);

  return {
    object,
    parts: controller.parts,
    update: controller.update,
    status: controller.status,
  };
}

/**
 * The room's equipment, in the order it is shown: each after a real
 * product (`doc/research/plant-products-boiler-air.md`).
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Pool exchanger temperature controller wall cabinet',
    maker: 'penfold',
    reference:
      'Working 8U cabinet with a 2U controller inspired by the West Controls 6000, separate local controls and 1U music source; remote Pt100 pocket probe shown on an outlet-pipe spool',
    size: { w: 1.2, d: 0.28, h: 1.5, mount: 'wall', y: 2.0 },
    build: createPoolTemperatureControllerCabinet,
  },
  {
    title: 'Condensing boilers in cascade',
    maker: 'hamwarmy',
    reference:
      'After 2 × Remeha Gas 220 Ace 300 kW (800 × 1662 × 657 mm); top flue, LTHW and gas ports for room pipe routing',
    size: { w: 2.2, d: 1.0, h: 1.9, mount: 'floor' },
    build: (kit) => createLiveBoilerCascade(kit, 0),
  },
  {
    title: 'Low-loss header',
    maker: 'gorskiy',
    reference: 'After Hamworthy sizing: DN200, length 4 × diameter, < 0.5 m/s',
    size: { w: 1.0, d: 0.5, h: 1.7, mount: 'floor' },
    build: createLowLossHeader,
  },
  {
    title: 'Twin-head LTHW circulator',
    maker: 'grundflow',
    reference: 'After Grundfos MAGNA3 D 65-120 F, DN65, 340 mm port to port',
    size: { w: 1.6, d: 0.8, h: 1.3, mount: 'floor' },
    build: createTwinHeadPump,
  },
  {
    title: 'Pressurisation unit and expansion vessel',
    maker: 'hamwarmy',
    reference:
      'After Reflex G 300 (Ø634 × 1272 mm) and Mikrofill MIDI (504 × 415 × 270 mm)',
    size: { w: 1.4, d: 0.7, h: 1.6, mount: 'floor' },
    build: createPressurisation,
  },
  {
    title: 'Hot-water calorifier',
    maker: 'hamwarmy',
    reference: 'After ICS Cool Energy Calorifier 1000, Ø1000 × 1850 mm',
    size: { w: 1.7, d: 1.2, h: 2.3, mount: 'floor' },
    build: createCalorifier,
  },
  {
    title: 'Gas train',
    maker: 'trager-feinstein',
    reference:
      'After Itron G25 meter (280 mm centres) and Elektrogas VMR6 2" safety valve',
    size: { w: 2.2, d: 0.6, h: 1.7, mount: 'floor' },
    build(kit): LiveExhibit {
      const parts = createPartSet();
      room.ecv = createGasBallValve(kit, {
        pipeRadius: 0.03,
        name: 'Gas emergency control valve',
        binding: {
          open: () => gasSafety().ecvOpen,
          set: (open) => actOnGas({ act: 'ecv', open }),
        },
      });
      parts.add(room.ecv);
      const train = createGasTrain(kit, { ecv: room.ecv.object });
      return {
        object: train,
        parts,
        update: () => train.setSsov(gasHouse().ssovOpen),
      };
    },
  },
  {
    title: 'Dosing pot',
    maker: 'gorskiy',
    reference: 'After Flamco 11 litre, Ø215 × 935 mm, ¾", 16 bar',
    size: { w: 0.7, d: 0.3, h: 1.2, mount: 'wall', y: 1.2 },
    build: createDosingPot,
  },
  {
    title: 'Gas detection and emergency stop',
    maker: 'kessler-moody',
    reference: 'After Crowcon Gasflag (210 × 145 × 46 mm); boiler house stop',
    size: { w: 1.4, d: 0.15, h: 1.8, mount: 'wall', y: 1.6 },
    build(kit): LiveExhibit {
      const parts = createPartSet();
      // The stop, struck in, shuts the SSOV until it is pulled out and
      // GAS RESET pressed: the world's (`boiler-gas.ts`).
      const stop = parts.add(
        mushroomStop(kit, {
          name: 'Boiler house emergency stop',
          bound: {
            get value() {
              return gasSafety().stopPressed;
            },
            set: (pressed: boolean) => actOnGas({ act: 'stop', pressed }),
          },
        }),
      );
      // TEST simulates a leak at the detector head; GAS RESET reopens the
      // gas safety valve once all is well, and does nothing otherwise.
      const test = parts.add(
        pushButton(kit, {
          colour: 'black',
          legend: 'TEST',
          action: () => actOnGas({ act: 'test' }),
        }),
      );
      const reset = parts.add(
        pushButton(kit, {
          colour: 'green',
          legend: 'GAS RESET',
          action: () => actOnGas({ act: 'reset' }),
        }),
      );
      // The sounder-beacon: flashing and sounding while the stop is in
      // or gas is detected.
      const alarm = computed(() => {
        const g = gasSafety();
        return g.stopPressed || g.gasDetected;
      });
      const beacon = parts.add(
        gasBeacon(kit, { lens: 'red', flashing: alarm, sounding: alarm }),
      );
      const board = createGasSafetyBoard(kit, {
        stop: stop.object,
        test: test.object,
        reset: reset.object,
        beacon: beacon.object,
      });
      let seconds = 0;
      return {
        object: board,
        parts,
        update(delta) {
          seconds += delta;
          // With no world the room runs its own detector's TEST.
          if (!store()) ownGas.value = stepBoilerGas(ownGas.value, delta);
          const g = gasHouse();
          const flash = Math.floor(seconds * 2) % 2 === 0;
          // Healthy; fault (the SSOV shut), flashing while the stop is
          // in; gas detected.
          board.setLamps(
            !g.gasDetected && !g.stopPressed && g.ssovOpen,
            !g.ssovOpen && (!g.stopPressed || flash),
            g.gasDetected,
          );
        },
      };
    },
  },
  {
    title: 'Combustion and ventilation panel',
    maker: 'penfold',
    reference:
      'Penfold Controls wall panel: flue gas temperatures, combustion air fan proving, CO in ppm, the boilers’ interlock',
    size: { w: 1.0, d: 0.25, h: 0.75, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      const panel = createCombustionPanel(kit, {
        setFan: (hoa) => actOnHouse({ act: 'fan', hoa }),
        reset: () => actOnHouse({ act: 'combustion-reset' }),
      });
      return {
        object: panel.group,
        parts: panel.parts,
        update: () => panel.show(houseNow().combustion),
      };
    },
  },
  {
    title: 'Mimic: boiler house gas',
    maker: 'penfold',
    reference:
      'Hard-wired mimic board: ECV, meter, safety valve, isolators and boilers; PRESS and FLOW modes',
    size: {
      w: GAS_MIMIC.width + 0.1,
      d: 0.08,
      h: GAS_MIMIC.height + 0.1,
      mount: 'wall',
      y: 1.7,
    },
    build(kit): LiveExhibit {
      const board = createMimicBoard(kit, GAS_MIMIC);
      return {
        object: board.group,
        parts: board.parts,
        update() {
          const gas = gasHouse();
          const { boilers } = houseNow();
          const flow = meterFlow(gas, boilers);
          const { supply, burners } = gasPressures(gas, flow);
          board.show(
            gasState({
              ecvOpen: gas.ecvOpen,
              ssovOpen: gas.ssovOpen,
              stopPressed: gas.stopPressed,
              gasDetected: gas.gasDetected,
              isolators: gas.isolators,
              boilers: boilers.map((b) => ({
                firing: b.code === 3,
                lockout: b.lockout !== null,
                rate: b.rate,
              })),
              flow,
              supply,
              burners,
            }),
          );
        },
      };
    },
  },
  {
    title: 'Mimic: boiler status and heat output',
    maker: 'penfold',
    reference:
      'Hard-wired boiler cascade mimic: ready, firing and fault indications; estimated output in kW per 300 kW boiler and total',
    size: {
      w: BOILER_HEAT_MIMIC.width + 0.1,
      d: 0.08,
      h: BOILER_HEAT_MIMIC.height + 0.1,
      mount: 'wall',
      y: 1.7,
    },
    build(kit): LiveExhibit {
      // Indications only: PLANT ENABLE, ACCEPT and RESET, its rough
      // panel's (mission 121), are the CM6's beside it (mission 122).
      const board = createMimicBoard(kit, BOILER_HEAT_PANEL);
      return {
        object: board.group,
        parts: board.parts,
        update: () => {
          const house = houseNow();
          const ring = store()?.world.value.lthw;
          const plant = ring ? null : currentPlant();
          board.show(
            boilerHeatState(
              house.boilers,
              cascadeOf(
                house,
                ring ?? {
                  flow: plant!.lthw,
                  return: plant!.lthwReturn ?? plant!.lthw,
                },
              ),
            ),
          );
        },
      };
    },
  },
  {
    title: 'Boiler cascade manager',
    maker: 'hamwarmy',
    reference:
      'Mission 122: the Hamwarmy CM6, after Hamworthy’s Merley, Siemens’ Albatros RVS cascade controllers and Viessmann’s Vitotronic 300-K: 300 × 240 × 85 mm, a 240 × 128 dot FSTN display, a turn-and-push knob, HOME, BACK and INFO keys, six boiler LEDs, a terminal flap over its SERVICE key, and the PLANT ENABLE key switch beside it; the world’s sequencer shown and worked',
    size: {
      w: CM6_INSTALLED_WIDTH + 0.02,
      d: CM6_SIZE.d + 0.01,
      h: CM6_SIZE.h + 0.02,
      mount: 'wall',
      y: 1.5,
    },
    build(kit): LiveExhibit {
      // Its view, worked out once for each new world (or each new house
      // where there is none), its header log kept as the unit would.
      let log: HeaderLog | null = null;
      let from: object | null = null;
      let shown: CascadeManagerView | null = null;
      const view = (): CascadeManagerView => {
        const world = store()?.world.value;
        const house = houseNow();
        const key = world ?? house;
        if (shown && from === key) return shown;
        const flow = world?.lthw.flow ?? currentPlant().lthw;
        const time = world?.time ?? room.seconds;
        log = logHeader(log, time, flow);
        from = key;
        shown = cascadeViewOf(house, {
          flow,
          time,
          log,
          powered: world ? true : room.powered(),
        });
        return shown;
      };
      const cm = createCascadeManager(kit, {
        view,
        edit: (e) => actOnHouse(cascadeAction(e)),
        setEnable: (enable) => actOnHouse({ act: 'enable', enable }),
      });
      // Centred on its footprint: the unit and its key-switch box.
      cm.group.position.x = -(CM6_INSTALLED_WIDTH - CM6_SIZE.w) / 2;
      const object = new Group();
      object.add(cm.group);
      return {
        object,
        parts: cm.parts,
        update: (delta) => cm.update(delta),
        status: cm.status,
        dispose: () => cm.dispose(),
      };
    },
  },
  {
    title: 'Pool exchanger valve and controller component trial',
    maker: 'penfold',
    reference:
      'Separate older component-scale trial of the West 6000-inspired regulator, exchanger valve and hand isolators',
    size: { w: 2.4, d: 1.2, h: 1.5, mount: 'floor' },
    build: createPoolTemperatureControlTrial,
  },
  {
    title: 'Modulating temperature control trial',
    maker: 'water-margin',
    reference:
      'Mission 146: the placeholder temperature controller (SET and ACTUAL red LEDs, BAND 1–10, HAND/OFF/AUTO, valve-open bar) driving a modulating control valve and a thermal probe on a heat source whose temperature fluctuates, to watch it regulate',
    size: { w: 1.2, d: 0.8, h: 1.6, mount: 'floor' },
    build(kit): LiveExhibit {
      const trial = createModulatingControlTrial(kit);
      return {
        object: trial.object,
        parts: trial.parts,
        update: trial.update,
        status: trial.status,
        dispose: trial.dispose,
      };
    },
  },
];

/** Keep the owner's dev65 review cabinet on the west wall at its supplied view. */
export function layoutRoom(sizes: readonly ExhibitSize[]): PlantRoomLayout {
  const layout = layoutPlantRoom(sizes);
  const places = [...layout.places];
  places[0] = {
    x: -layout.halfX + WALL_FACE,
    z: 1.28,
    y: 2.0,
    yaw: Math.PI / 2,
  };
  return { ...layout, places };
}
