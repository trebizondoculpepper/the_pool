import { currentPlant } from './live-plant';
import { roomWorld } from '../../../save/world-store';
import { createWeatherStation } from '../../../components/plant/views/weather-station';
import { newWeather, pressureTrend } from '../../../../game/weather';
import { createLocationAnnunciator } from '../../views/location-annunciator';
import { worldAnnunciator } from '../../logic/world-annunciator';
import { installedTagOf } from '../../../../game/plant/installed-asset-ids';
import { SHELL_ROOMS } from '../../logic/shell-rooms';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import {
  createBmsOutstation,
  createFireRepeater,
  createPoolAlarm,
  createWaterControllerDisplay,
  createWaterTestKit,
} from '../../../components/plant/views/control-room';
import {
  createAnnunciatorAssembly,
  createCctvCrt,
  createPoolmonDesk,
  createPrinterStand,
  createReadoutBoard,
  createRecorderPanel,
} from '../../../components/plant/views/control-panels';
import type { PrinterStandView } from '../../../components/plant/views/control-panels';
import { ALARM_TEXT } from '../../logic/control-room-demo';
import type { PlantReading } from '../../logic/control-room-demo';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';
import {
  AIR_MIMIC,
  HEATING_MIMIC,
  MAIN_POOL_MIMIC,
  airState,
  heatingState,
  mainPoolState,
} from '../../logic/pool-mimics';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import {
  createDirtyWaterMimic,
  createFreshWaterMimic,
} from '../../views/wet-hall';
import { pumpsShown } from './pump-panel';
import { controlFor } from '../../../../game/descriptors/registry';
import { workControl } from '../../../../game/descriptors/binding';
import { CONTROL_ROOM_MIMICS } from '../../../../game/descriptors/mimics';
import type { MimicSpec } from '../../../components/industrial-control/logic/mimic';

/** A board's tag in the control room, by its spec (`CONTROL_ROOM_MIMICS`). */
const refOf = (spec: MimicSpec) =>
  CONTROL_ROOM_MIMICS.find((m) => m.spec === spec)?.ref ?? spec.title;

/** What this plant room is for, printed on its title card. */
/**
 * The control room's annunciator's title, as the location boards' (WH · WET
 * HALL): its room's tag, from its own (CR-CP2), and the room's name.
 */
const CONTROL_ANNUNCIATOR_TITLE = `${installedTagOf('control_room', 'annunciator')!.split('-')[0]} · ${SHELL_ROOMS.control_room.title}`;

export const PURPOSE =
  'Where problems show first: mimic, annunciator, recorders, readouts, POOLMON';

/**
 * The plant as the control room sees it: the world's (`world-reading.ts`),
 * the main pool's circuit, gas detection and all; the scripted loop only
 * where there is no world. The same for every instrument at a moment.
 */
const clock = () => performance.now() / 1000;
const reading = (): PlantReading => currentPlant('pool_02', clock());

/** The time printed against each alarm, from the reading's clock. */
const stamp = () => {
  const s = Math.floor(7 * 3600 + 42 * 60 + clock());
  const hh = String(Math.floor(s / 3600) % 24).padStart(2, '0');
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `20/10/99 ${hh}:${mm}:${ss}`;
};

/** The alarm printer, once built, and lines waiting for it. */
let printer: PrinterStandView | null = null;
const waiting: string[] = [];
const print = (line: string) => {
  if (printer) printer.print(line);
  else waiting.push(line);
};

/** The room's equipment, in the order it is shown. */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: "Operator's desk, POOLMON",
    reference:
      'BBC Micro Model B, Microvitec Cub monitor and disk drive, running the plant’s own monitoring pages',
    size: { w: 1.3, d: 1.5, h: 1.4, mount: 'floor' },
    build(kit): LiveExhibit {
      const desk = createPoolmonDesk(kit);
      return {
        object: desk.group,
        update: (delta) => desk.update(reading(), clock(), delta),
        dispose: desk.dispose,
      };
    },
  },
  {
    title: 'Alarm printer',
    reference:
      'Teleprinter on endless fanfold paper, logging each alarm with the room to go to',
    size: { w: 0.7, d: 1.5, h: 1.3, mount: 'floor' },
    build(kit): LiveExhibit {
      const stand = createPrinterStand(kit);
      printer = stand;
      for (const line of waiting.splice(0)) stand.print(line);
      return {
        object: stand.group,
        update: stand.update,
        dispose: () => {
          if (printer === stand) printer = null;
        },
      };
    },
  },
  {
    title: 'Water-test kit',
    reference:
      'After Palintest Pooltest 25 photometer kit, case about 270 × 170 mm',
    size: { w: 0.8, d: 0.5, h: 1.1, mount: 'floor' },
    build: createWaterTestKit,
  },
  ...(
    [
      [
        'Mimic: main pool circuit',
        'Pumps, filters, UV, heat exchanger and dosing; FLOW, PRESS, TEMP and WATER modes',
        MAIN_POOL_MIMIC,
        mainPoolState,
      ],
      [
        'Mimic: heating',
        'Boilers, header, pool heat exchanger and calorifier; TEMP, PRESS and FLOW modes',
        HEATING_MIMIC,
        heatingState,
      ],
      [
        'Mimic: air handling',
        'Fresh air, plate heat exchanger, heat pump, coil and fans; TEMP, RH and FANS modes',
        AIR_MIMIC,
        airState,
      ],
    ] as const
  ).map(([title, reference, spec, state]): PlantExhibit => ({
    title,
    reference: `Hard-wired mimic board: ${reference}`,
    size: {
      w: spec.width + 0.1,
      d: 0.08,
      h: spec.height + 0.1,
      mount: 'wall',
      y: 1.7,
    },
    build(kit): LiveExhibit {
      // The main pool's board works the filter pumps' starters, as their
      // local panel does (`pump-panel.ts`): the one world's.
      // Its presses its descriptor's (CR-MP1's, mission 131).
      const board = createMimicBoard(kit, spec, {
        press: (id) => {
          const control = controlFor(`${refOf(spec)}/${id}`, 'control_room');
          if (control)
            workControl(
              typeof window === 'undefined' ? null : roomWorld(),
              control,
              'press',
            );
        },
      });
      // Its state worked out once per world step: the reading is the same
      // object until the world steps (`plantReadingOf`), and the board sets
      // nothing for a state it has shown (mission 094).
      let shownReading: PlantReading | null = null;
      let shown: MimicState | null = null;
      return {
        object: board.group,
        parts: board.parts,
        update: () => {
          const now = reading();
          if (now !== shownReading || !shown) {
            shownReading = now;
            shown =
              spec === MAIN_POOL_MIMIC
                ? mainPoolState(now, pumpsShown(now))
                : state(now);
          }
          board.show(shown);
        },
      };
    },
  })),
  {
    title: 'Fresh Water Distribution mimic',
    reference:
      'Penfold Controls copy of WH-MP1: break tank, booster and the four pool make-up branches',
    size: { w: 2.8, d: 0.08, h: 1.6, mount: 'wall', y: 1.7 },
    build: (kit) => createFreshWaterMimic(kit, false, true),
  },
  {
    title: 'Pit Inflow Sources mimic',
    reference:
      'Penfold Controls copy of WH-MP2: four pool waste branches and the backwash pit',
    size: { w: 2.8, d: 0.08, h: 1.6, mount: 'wall', y: 1.7 },
    build: createDirtyWaterMimic,
  },
  {
    title: 'Alarm annunciator',
    reference:
      '30 windows, ISA sequence M: flashes until ACCEPT, steady until RESET; LAMP TEST; the gas windows from the gas detection',
    size: { w: 0.9, d: 0.2, h: 1.1, mount: 'wall', y: 1.65 },
    build(kit): LiveExhibit {
      // The world's annunciator (`game/annunciator.ts`), accepted here or
      // at any console, the bridge's too; its own only without a world.
      const annunciator = createAnnunciatorAssembly(
        kit,
        typeof window === 'undefined'
          ? undefined
          : worldAnnunciator(roomWorld()),
        CONTROL_ANNUNCIATOR_TITLE,
      );
      annunciator.onEvent = (event, alarm) => {
        if (!alarm) return;
        const text = ALARM_TEXT[alarm];
        const name = text.window.replace('\n', ' ');
        if (event === 'in')
          print(`${stamp()} ALARM  ${name.padEnd(20)} ${text.room}`);
        if (event === 'accept') print(`${stamp()} ACCEPT ${name}`);
        if (event === 'clear') print(`${stamp()} NORMAL ${name}`);
      };
      return {
        object: annunciator.group,
        parts: annunciator.parts,
        update: () => annunciator.update(reading(), clock()),
      };
    },
  },
  {
    title: 'Lounge pool annunciator',
    reference:
      '16 windows of the lounge plant room’s faults, ISA sequence M with first-out; the twin of the one on its plant room’s wall, one state for both',
    size: { w: 0.9, d: 0.2, h: 1.1, mount: 'wall', y: 1.75 },
    build: (kit) =>
      createLocationAnnunciator(
        kit,
        'pool_01',
        typeof window === 'undefined' ? undefined : roomWorld(),
      ),
  },
  {
    title: 'Olympic pool annunciator',
    reference:
      '24 windows of the Olympic’s plant and hall faults, ISA sequence M with first-out; one state with the bridge (mission 099)',
    size: { w: 1.25, d: 0.2, h: 1.1, mount: 'wall', y: 1.75 },
    build: (kit) =>
      createLocationAnnunciator(
        kit,
        'pool_02',
        typeof window === 'undefined' ? undefined : roomWorld(),
      ),
  },
  {
    title: 'Wet hall annunciator',
    reference:
      '18 windows of the wet hall’s faults (make-up, backwash pit, chemical transfer), ISA sequence M with first-out; the twin of the one in the wet hall, one state for both (mission 099)',
    size: { w: 1.25, d: 0.2, h: 1.0, mount: 'wall', y: 1.75 },
    build: (kit) =>
      createLocationAnnunciator(
        kit,
        'wet_hall',
        typeof window === 'undefined' ? undefined : roomWorld(),
      ),
  },
  {
    title: 'Chart recorders',
    reference:
      'Strip charts of pool temperatures and of chlorine and pH; a circular 7-day chart of the hall air',
    size: { w: 1.3, d: 0.2, h: 0.6, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      const recorders = createRecorderPanel(kit);
      return {
        object: recorders.group,
        update: (delta) => recorders.show(reading(), delta),
      };
    },
  },
  {
    title: 'Readout board',
    reference: 'Red LED indicators and 96 mm moving-coil ammeters',
    size: { w: 1.3, d: 0.12, h: 0.55, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      const board = createReadoutBoard(kit);
      return {
        object: board.group,
        update: (delta) => board.show(reading(), delta),
      };
    },
  },
  {
    title: 'BMS outstation',
    reference:
      'After Trend IQ4E controller and I/O in a Rittal AE 1076, 600 × 760 × 210 mm',
    size: { w: 0.62, d: 0.75, h: 0.78, mount: 'wall', y: 1.4 },
    build: createBmsOutstation,
  },
  {
    title: 'Pool water controller display',
    reference: 'After ProMinent DULCOMARIN 3, 430 × 290 × 150 mm',
    size: { w: 0.44, d: 0.16, h: 0.3, mount: 'wall', y: 1.5 },
    build: createWaterControllerDisplay,
  },
  {
    title: 'Fire alarm repeater',
    reference: 'After Kentec Syncro View, 330 × 255 × 90 mm',
    size: { w: 0.34, d: 0.1, h: 0.26, mount: 'wall', y: 1.5 },
    build: createFireRepeater,
  },
  {
    title: 'Weather station console',
    reference:
      'Mission 123: the Calloway WeatherWatch Pro, after the Davis Vantage Pro2 console, 270 × 160 × 40 mm; its sensors on the roof (the world’s Manchester reading)',
    maker: 'calloway',
    size: { w: 0.28, d: 0.05, h: 0.17, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      // Outside a browser (a test's build), no world: no reading.
      const weather = () =>
        typeof window === 'undefined'
          ? newWeather()
          : roomWorld().world.value.weather;
      const station = createWeatherStation(kit, {
        reading: () => weather().reading,
        trend: () => pressureTrend(weather()),
      });
      return {
        object: station.group,
        parts: station.parts,
        update: station.update,
        status: station.status,
        dispose: station.dispose,
      };
    },
  },
  {
    title: 'CCTV monitor',
    reference: '14-inch CRT on a wall bracket, four cameras in quarters',
    size: { w: 0.4, d: 0.42, h: 0.45, mount: 'wall', y: 1.8 },
    build(kit): LiveExhibit {
      const cctv = createCctvCrt(kit);
      return { object: cctv.group, update: () => cctv.update(clock()) };
    },
  },
  {
    title: 'Poolside emergency alarm',
    reference:
      'After Hoyles Aidalarm A600 (receiver about 250 × 180 × 80 mm), call point and sounder',
    size: { w: 0.7, d: 0.1, h: 0.2, mount: 'wall', y: 1.4 },
    build: createPoolAlarm,
  },
];
