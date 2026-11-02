import type { GameEvent } from '../events/game-event';
import { boilerStatus } from '../../toolkit/components/plant/logic/boiler-house';
import { BOILER_TAGS } from '../plant/boiler-plant';
import { boilerGasOn } from '../plant/boiler-gas';
import { DAY_TANKS } from '../plant/chemical-distribution';
import { CHEMICALS, STORE_CAPACITY } from '../plant/chemicals';
import { inspectionStatus, inventoryForWorld } from '../plant/component-status';
import { INSTALLED_VALVES } from '../plant/installed-valves';
import {
  LOCATIONS,
  LOCATION_ANNUNCIATORS,
} from '../plant/location-annunciators';
import { MODEL_VALVES } from '../plant/model-valves';
import { MOTORS, MOTOR_TAGS } from '../plant/motor-starters';
import { olympicFlowsOf } from '../plant/olympic-battery';
import { POOL_IDS } from '../plant/pools';
import { serviceAvailable } from '../plant/services';
import { WET_HALL_PLANT } from '../plant/wet-hall';
import { ALARMS as WASH_ALARMS } from '../plant/wash-o-tron';
import { washSensingOfWorld } from '../plant/wash-o-tron-world';
import { describedComponents, roomOfTag } from '../plant/equipment-catalogue';
import { identifiedPart } from '../plant/identification';
import { transferRunsIn } from '../world';
import type { World } from '../world';
import { plantConnectionsFor } from './plant-connections';

/** Facts that may be given to a browser assistant. No World or action object escapes. */
export interface PlantEquipmentFact {
  ref: string;
  assetId?: string;
  room: string | null;
  name: string;
  kind: string;
  brand: string;
  status: string | null;
  stateAvailable: boolean;
  normal: string | null;
  details?: Record<string, string | number | boolean | null>;
  connection?: {
    link: string;
    from: string;
    to: string;
    medium: string;
  };
  lookUrl: string | null;
}

export interface PlantAlarmFact {
  ref: string;
  room: string;
  board: string;
  label: string;
  present: boolean;
  window: 'off' | 'flashing' | 'steady';
  firstOut: boolean;
  details?: Record<string, string | number | boolean | null>;
}

export interface PlantContextPage<T> {
  schema: 1;
  worldTime: number;
  total: number;
  offset: number;
  items: T[];
}

export interface PlantContextCoverage {
  schema: 1;
  worldTime: number;
  equipment: number;
  withReadableState: number;
  withoutReadableState: number;
  installedValves: number;
  starterPumps: number;
  annunciatorWindows: number;
  washControllerWindows: number;
  unreadableByKind: { kind: string; count: number }[];
  note: string;
}

export interface PlantSystemFact {
  room: string;
  equipment: number;
  readableStates: number;
  activeAlarms: number;
}

/** The controller's observed state and inputs, without a separate cause narrative. */
export function plantWashFacts(world: World) {
  const controller = world.washOTron;
  const sensing = washSensingOfWorld(world);
  return {
    schema: 1 as const,
    worldTime: world.time,
    room: 'plant_pool_02',
    schedulerEnabled: controller.running,
    hold: controller.hold,
    activeFilter: controller.washing === null ? null : controller.washing + 1,
    step: controller.step,
    stepTimeSeconds: controller.stepTime,
    waiting: controller.waiting,
    circulationPumping: sensing.pumping,
    pit: {
      volumeM3: sensing.pit,
      highM3: sensing.pitHigh,
      inletInhibited: sensing.pitInhibit,
    },
    loungeFilterWashing: sensing.loungeWashing,
    filters: controller.filters.map((filter, index) => ({
      number: index + 1,
      mode: filter.mode,
      phase: filter.phase,
      auto: filter.auto,
      lockout: filter.lockout,
      bedFlowM3h: sensing.bedFlow[index] ?? null,
      lastWashAtSeconds: filter.lastWash,
    })),
  };
}

const MAX_PAGE = 50;
const page = <T>(
  world: World,
  items: T[],
  offset = 0,
  limit = MAX_PAGE,
): PlantContextPage<T> => {
  const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const size = Number.isFinite(limit)
    ? Math.max(1, Math.min(MAX_PAGE, Math.floor(limit)))
    : MAX_PAGE;
  return {
    schema: 1,
    worldTime: world.time,
    total: items.length,
    offset: start,
    items: items.slice(start, start + size),
  };
};

const lookUrl = (room: string | null, ref: string) =>
  room
    ? `?room=${encodeURIComponent(room)}&look=${encodeURIComponent(ref)}`
    : null;

const modelValves = new Map(MODEL_VALVES.map((valve) => [valve.id, valve]));
const installedValves = new Map(
  Object.entries(INSTALLED_VALVES).map(([key, valve]) => [
    valve.assetId,
    { key, valve },
  ]),
);

function otherPumpState(
  world: World,
  ref: string,
  kind: string,
  room: string | null,
): { status: string; details: PlantEquipmentFact['details'] } | null {
  if (ref === 'AS-P1' || ref === 'HS-P1') {
    const chemical = ref === 'AS-P1' ? 'acid' : 'hypochlorite';
    const line = world.distribution[chemical];
    const running = transferRunsIn(world, chemical);
    return {
      status: line.tripped ? 'tripped' : running ? 'running' : 'stopped',
      details: {
        mode: line.hoa,
        running,
        tripped: line.tripped,
        servingOutlet: line.serving,
      },
    };
  }
  if (ref === 'WH-P1')
    return {
      status: world.wetHall.boosterTripped
        ? 'tripped'
        : world.wetHall.boosterRunning
          ? 'running'
          : 'stopped',
      details: {
        running: world.wetHall.boosterRunning,
        tripped: world.wetHall.boosterTripped,
        dutyPump: world.wetHall.booster.duty + 1,
        flowM3h: world.wetHall.flow,
      },
    };
  if (ref === 'BH-P1')
    return {
      status: world.lthw.pumps ? 'running' : 'stopped',
      details: {
        running: world.lthw.pumps,
        flowTemperatureC: world.lthw.flow,
        returnTemperatureC: world.lthw.return,
      },
    };
  if (room === 'plant_pool_04' && ref === 'PL4-CAB1-P1') {
    const running = world.pools.pool_04.flow > 0;
    return {
      status: running ? 'running' : 'stopped',
      details: { running, flowM3h: world.pools.pool_04.flow },
    };
  }
  if (
    (kind === 'hypo-pumps' || kind === 'acid-pump') &&
    (room === 'plant_pool_01' || room === 'plant_pool_02')
  ) {
    const pool = room === 'plant_pool_01' ? 'pool_01' : 'pool_02';
    const chemical = kind === 'hypo-pumps' ? 'hypochlorite' : 'acid';
    const pump = world.dosingPumps[pool][chemical];
    return {
      status: pump.fault ? 'fault' : pump.running ? 'running' : 'stopped',
      details: {
        running: pump.running,
        fault: pump.fault,
        setLh: pump.setLh,
        deliveredLh: pump.meanLh,
      },
    };
  }
  return null;
}

function tankState(
  world: World,
  kind: string,
  room: string | null,
  name: string,
): {
  status: string;
  details: NonNullable<PlantEquipmentFact['details']>;
} | null {
  if (kind === 'balance-tank' && room?.startsWith('plant_')) {
    const pool = room.slice(6);
    if (POOL_IDS.some((id) => id === pool)) {
      const fill = world.pools[pool as (typeof POOL_IDS)[number]].balance;
      return {
        status: `${Math.round(fill * 100)}% full`,
        details: { fillFraction: fill },
      };
    }
  }
  if (
    room === 'wet_hall' &&
    (kind === 'break-tank' || kind === 'backwash-tank')
  ) {
    const volumeM3 =
      kind === 'break-tank'
        ? world.wetHall.breakTank
        : world.wetHall.backwashTank;
    const capacityM3 =
      kind === 'break-tank'
        ? WET_HALL_PLANT.breakTank
        : WET_HALL_PLANT.backwashTank;
    return {
      status: `${Math.round((volumeM3 / capacityM3) * 100)}% full`,
      details: {
        volumeM3,
        capacityM3,
        fillFraction: volumeM3 / capacityM3,
        ...(kind === 'backwash-tank'
          ? { inletInhibited: world.wetHall.inhibit }
          : {}),
      },
    };
  }
  if (kind === 'chem-day' && room?.startsWith('plant_pool_')) {
    const pool = room.slice(6);
    const chemical = /hypochlorite|hypo/i.test(name)
      ? 'hypochlorite'
      : /acid/i.test(name)
        ? 'acid'
        : null;
    if (!chemical) return null;
    const index = DAY_TANKS[chemical].findIndex((tank) => tank.site === pool);
    if (index < 0) return null;
    const tank = world.distribution[chemical].tanks[index];
    const capacityL = DAY_TANKS[chemical][index].litres;
    return {
      status: `${Math.round((tank.litres / capacityL) * 100)}% full`,
      details: {
        litres: tank.litres,
        capacityL,
        lowL: tank.lowL,
        highL: tank.highL,
        calling: tank.calling,
        fillInhibited: tank.inhibited,
      },
    };
  }
  return null;
}

function boilerState(world: World, kind: string, name: string) {
  if (kind !== 'boiler') return null;
  const index = BOILER_TAGS.findIndex((tag) => name.includes(tag));
  if (index < 0) return null;
  const boiler = world.boilerHouse.boilers[index];
  const powerAvailable = serviceAvailable(world.plant, 'boiler_house', 'power');
  const gasAvailable = boilerGasOn(world.boilerGas) && world.plant.sources.heat;
  return {
    status: boilerStatus(boiler, {
      powered: powerAvailable,
      gas: gasAvailable,
    }),
    details: {
      on: boiler.on,
      controllerCode: boiler.code,
      firingRate: boiler.rate,
      flowTemperatureC: boiler.flow,
      returnTemperatureC: boiler.return,
      pressureBar: boiler.pressure,
      setpointC: boiler.setpoint,
      lockout: boiler.lockout,
      powerAvailable,
      gasAvailable,
    },
  };
}

function meterState(
  world: World,
  kind: string,
  ref: string,
  room: string | null,
  flows: ReturnType<typeof olympicFlowsOf>,
): {
  status: string;
  details: NonNullable<PlantEquipmentFact['details']>;
} | null {
  let flowM3h: number | null = null;
  if (kind === 'flowmeter' && room === 'plant_pool_02') {
    const filter = /^PL2-F([1-5])-FT\d+$/.exec(ref);
    if (filter) flowM3h = flows.filters[Number(filter[1]) - 1].riser;
    else if (/^PL2-P1-FT\d+$/.test(ref)) flowM3h = flows.discharge;
  } else if (kind === 'make-up-flowmeter' && room === 'wet_hall')
    flowM3h = world.wetHall.flow;
  if (flowM3h !== null)
    return {
      status: `${flowM3h.toFixed(1)} m³/h`,
      details: { flowM3h },
    };
  if (kind === 'water-meter' && room === 'wet_hall')
    return {
      status: `${world.wetHall.meter.toFixed(1)} m³ total`,
      details: { totalM3: world.wetHall.meter },
    };
  return null;
}

/** One live, scene-free inventory. Unknown readings remain explicitly unavailable. */
export function plantEquipmentFacts(world: World): PlantEquipmentFact[] {
  const subjects = describedComponents().subjects;
  const olympicFlows = olympicFlowsOf(world);
  const facts = inventoryForWorld(world).map((entry) => {
    const modelValve =
      modelValves.get(entry.assetId ?? '') ?? modelValves.get(entry.id);
    const installed = installedValves.get(entry.assetId ?? '');
    const subject = subjects.get(entry.id);
    const route = modelValve?.route ?? subject?.route;
    const motor = Object.hasOwn(MOTORS, entry.id)
      ? MOTORS[entry.id as keyof typeof MOTORS]
      : undefined;
    const room =
      installed?.key.split('|')[0] ??
      modelValve?.room ??
      (motor
        ? `plant_${motor.pool}`
        : (subject?.room ?? roomOfTag(entry.id))) ??
      null;
    const starter = motor
      ? world.motors.starters[entry.id as keyof typeof MOTORS]
      : undefined;
    const travel = entry.assetId
      ? world.loungeValvePositions[entry.assetId]
      : undefined;
    const installedOpen = entry.assetId
      ? world.installedValves[entry.assetId]
      : undefined;
    const identifiedOpen = modelValve
      ? (
          identifiedPart(world.identifiedPlant, modelValve.id)?.state as
            | { open?: unknown }
            | undefined
        )?.open
      : undefined;
    const valvePosition =
      typeof travel === 'number'
        ? travel <= 0.02
          ? 'shut'
          : travel >= 0.98
            ? 'open'
            : 'moving'
        : typeof installedOpen === 'boolean'
          ? installedOpen
            ? 'open'
            : 'shut'
          : typeof identifiedOpen === 'boolean'
            ? identifiedOpen
              ? 'open'
              : 'shut'
            : null;
    const otherPump = otherPumpState(world, entry.id, entry.kind, room);
    const tank = tankState(world, entry.kind, room, entry.name);
    const boiler = boilerState(world, entry.kind, entry.name);
    const meter = meterState(world, entry.kind, entry.id, room, olympicFlows);
    const status = starter
      ? starter.tripped
        ? 'tripped'
        : starter.running
          ? 'running'
          : 'stopped'
      : (valvePosition ??
        otherPump?.status ??
        tank?.status ??
        boiler?.status ??
        meter?.status ??
        inspectionStatus(world, entry.id) ??
        null);
    const details: PlantEquipmentFact['details'] = starter
      ? {
          mode: starter.mode,
          command: starter.command,
          running: starter.running,
          tripped: starter.tripped,
          currentA: starter.current,
          role: motor!.role,
          isolator: motor!.isolator,
          isolatorOn: world.plant.isolators[motor!.isolator],
        }
      : valvePosition
        ? { actualPosition: valvePosition }
        : (otherPump?.details ??
          tank?.details ??
          boiler?.details ??
          meter?.details);
    return {
      ref: entry.id,
      ...(entry.assetId ? { assetId: entry.assetId } : {}),
      room,
      name: entry.name,
      kind: entry.kind,
      brand: entry.brand,
      status,
      stateAvailable: status !== null,
      normal: entry.normal ?? null,
      ...(details ? { details } : {}),
      ...(route
        ? {
            connection: {
              link: modelValve?.link ?? installed?.key.split('|')[1] ?? '',
              from: route.from,
              to: route.to,
              medium: route.medium,
            },
          }
        : {}),
      lookUrl: lookUrl(room, entry.id),
    };
  });
  for (const pump of [0, 1] as const) {
    const running = world.wetHall.pitPumps.running[pump];
    facts.push({
      ref: `world:wetHall.pitPumps.${pump + 1}`,
      room: 'wet_hall',
      name: `Backwash pit pump ${pump + 1}`,
      kind: 'pump',
      brand: 'unbranded',
      status: running ? 'running' : 'stopped',
      stateAvailable: true,
      normal: null,
      details: {
        running,
        mode: world.wetHall.pitPumps.modes[pump],
        duty: world.wetHall.pitPumps.duty === pump,
        boost: world.wetHall.pitPumps.boost,
      },
      lookUrl: null,
    });
  }
  // Only the combined stock is modelled; individual bulk vessels have no reader.
  for (const chemical of CHEMICALS) {
    const litres = world.chemicals[chemical];
    facts.push({
      ref: `world:chemicals.${chemical}`,
      room: chemical === 'acid' ? 'acid_store' : 'hypo_store',
      name: `${chemical === 'acid' ? 'Acid' : 'Hypochlorite'} store total`,
      kind: 'chemical-store-total',
      brand: 'unbranded',
      status: `${Math.round((litres / STORE_CAPACITY[chemical]) * 100)}% in store`,
      stateAvailable: true,
      normal: null,
      details: {
        storeLitres: litres,
        storeCapacityL: STORE_CAPACITY[chemical],
      },
      lookUrl: null,
    });
  }
  return facts.sort((a, b) =>
    `${a.room ?? ''}/${a.ref}`.localeCompare(`${b.room ?? ''}/${b.ref}`),
  );
}

/** Paging keeps the main page and chatbot responses bounded. */
export function listPlantEquipment(
  world: World,
  query: {
    room?: string;
    kind?: string;
    state?: 'known' | 'unavailable';
    offset?: number;
    limit?: number;
  } = {},
): PlantContextPage<PlantEquipmentFact> {
  const matches = plantEquipmentFacts(world).filter(
    (fact) =>
      (!query.room || fact.room === query.room) &&
      (!query.kind || fact.kind === query.kind) &&
      (!query.state || fact.stateAvailable === (query.state === 'known')),
  );
  return page(world, matches, query.offset, query.limit);
}

export function getPlantEquipment(
  world: World,
  ref: string,
): PlantEquipmentFact | null {
  const needle = ref.toLowerCase();
  return (
    plantEquipmentFacts(world).find(
      (fact) =>
        fact.ref.toLowerCase() === needle ||
        fact.assetId?.toLowerCase() === needle,
    ) ?? null
  );
}

export function listPlantSystems(world: World): PlantSystemFact[] {
  const alarms = plantAlarmFacts(world);
  const rooms = new Map<string, PlantSystemFact>();
  for (const fact of plantEquipmentFacts(world)) {
    if (!fact.room) continue;
    const row = rooms.get(fact.room) ?? {
      room: fact.room,
      equipment: 0,
      readableStates: 0,
      activeAlarms: 0,
    };
    row.equipment++;
    if (fact.stateAvailable) row.readableStates++;
    rooms.set(fact.room, row);
  }
  for (const alarm of alarms) {
    if (!alarm.present) continue;
    const row = rooms.get(alarm.room) ?? {
      room: alarm.room,
      equipment: 0,
      readableStates: 0,
      activeAlarms: 0,
    };
    row.activeAlarms++;
    rooms.set(alarm.room, row);
  }
  return [...rooms.values()].sort((a, b) => a.room.localeCompare(b.room));
}

export function getPlantConnections(world: World, ref: string) {
  const facts = plantEquipmentFacts(world);
  const needle = ref.toLowerCase();
  const fact = facts.find(
    (item) =>
      item.ref.toLowerCase() === needle ||
      item.assetId?.toLowerCase() === needle,
  );
  const links = fact ? plantConnectionsFor(fact, facts) : [];
  return fact
    ? {
        schema: 1 as const,
        worldTime: world.time,
        ref: fact.ref,
        connection: fact.connection ?? null,
        links,
        available: Boolean(fact.connection || links.length),
      }
    : null;
}

export function plantAlarmFacts(world: World): PlantAlarmFact[] {
  const locationAlarms = LOCATIONS.flatMap((location) => {
    const spec = LOCATION_ANNUNCIATORS[location];
    const state = world.locationAnnunciators[location];
    return spec.alarms.map((id) => ({
      ref: `${location}/${id}`,
      room: location === 'wet_hall' ? 'wet_hall' : `plant_${location}`,
      board: spec.name,
      label: spec.text[id] ?? id,
      present: state.present[id] ?? false,
      window: state.windows[id] ?? 'off',
      firstOut: state.firstOut === id,
    }));
  });
  const washAlarms: PlantAlarmFact[] = WASH_ALARMS.map((id) => {
    const alarm = world.washOTron.alarms[id];
    return {
      ref: `wash-o-tron/${id}`,
      room: 'plant_pool_02',
      board: 'Wash-O-Tron',
      label: id.replace(/([A-Z])/g, ' $1').toUpperCase(),
      present: alarm.on,
      window: alarm.on ? (alarm.accepted ? 'steady' : 'flashing') : 'off',
      firstOut: false,
      details: {
        waiting: world.washOTron.waiting,
        activeFilter:
          world.washOTron.washing === null ? null : world.washOTron.washing + 1,
        step: world.washOTron.step,
        pitM3: world.wetHall.backwashTank,
        pitInhibited: world.wetHall.inhibit,
        circulationFlowM3h: world.pools.pool_02.flow,
      },
    };
  });
  return [...locationAlarms, ...washAlarms];
}

export function listPlantAlarms(
  world: World,
  query: { activeOnly?: boolean; offset?: number; limit?: number } = {},
): PlantContextPage<PlantAlarmFact> {
  const alarms = plantAlarmFacts(world).filter(
    (alarm) => !query.activeOnly || alarm.present || alarm.window !== 'off',
  );
  return page(world, alarms, query.offset, query.limit);
}

export function getPlantAlarm(
  world: World,
  ref: string,
): PlantAlarmFact | null {
  return (
    plantAlarmFacts(world).find(
      (alarm) => alarm.ref.toLowerCase() === ref.toLowerCase(),
    ) ?? null
  );
}

export function listPlantEvents(
  world: World,
  events: readonly GameEvent[],
  query: { subject?: string; limit?: number } = {},
): PlantContextPage<GameEvent> {
  const matching = events
    .filter(
      (event) =>
        event.time <= world.time &&
        (query.subject ? event.subject === query.subject : true),
    )
    .slice()
    .reverse()
    .map((event) => ({ ...event }));
  return page(world, matching, 0, Math.min(query.limit ?? 20, 20));
}

export function plantContextCoverage(world: World): PlantContextCoverage {
  const equipment = plantEquipmentFacts(world);
  const unreadable = new Map<string, number>();
  for (const item of equipment)
    if (!item.stateAvailable)
      unreadable.set(item.kind, (unreadable.get(item.kind) ?? 0) + 1);
  return {
    schema: 1,
    worldTime: world.time,
    equipment: equipment.length,
    withReadableState: equipment.filter((item) => item.stateAvailable).length,
    withoutReadableState: equipment.filter((item) => !item.stateAvailable)
      .length,
    installedValves: installedValves.size,
    starterPumps: MOTOR_TAGS.length,
    annunciatorWindows: LOCATIONS.reduce(
      (count, location) =>
        count + LOCATION_ANNUNCIATORS[location].alarms.length,
      0,
    ),
    washControllerWindows: WASH_ALARMS.length,
    unreadableByKind: [...unreadable]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)),
    note: 'Readable state is reported only where a model reader exists. Other equipment and alarm families still need coverage.',
  };
}
