/**
 * The Jacuzzi plant room's descriptors (mission 131): its cabinet PL3-CAB1,
 * its isolator PL3-CAB1-IS1, the motorised valves' panel, its 18 valves,
 * its balance tank PL3-BT1 and its day tanks PL3-DT1 and PL3-DT2, from its
 * model (`jacuzzi-schematic.ts`, `MODEL_VALVES`). Each control's action is
 * the one its 3D part sends (`spa-pack.ts`, `cabinet-mimic.ts`,
 * `cabinet-services.ts`), which take it from here. Pure.
 */
import { dayTankOf } from '../plant/chemical-distribution';
import type { Chemical } from '../plant/chemicals';
import { JACUZZI_ROOM } from '../plant/jacuzzi-schematic';
import { MODEL_VALVES } from '../plant/model-valves';
import type { ModelValve } from '../plant/model-valves';
import type { IsolatorName } from '../plant/services';
import { clampSetpoint, jacuzziCabinetPanel, jacuzziRuns } from '../world';
import type { World, WorldAction } from '../world';
import { classOf, partRef } from './descriptor';
import type {
  Control,
  ObjectDescriptor,
  Reading,
  ViewValues,
} from './descriptor';

const ROOM = JACUZZI_ROOM;
export const JACUZZI_CABINET_REF = 'PL3-CAB1';
/**
 * The cabinet's switch-fuse isolator: the cabinet's tag and its first
 * isolator, `IS1`, as the plant's tags are built (no plant tag written
 * whole by hand: the registration test reads the code for them).
 */
export const JACUZZI_ISOLATOR_REF = `${JACUZZI_CABINET_REF}-IS1`;
/** The motorised valves' panel (`JACUZZI VALVES`): no tag, so its name's slug. */
export const JACUZZI_VALVE_PANEL_REF = 'valve-panel';
/** The world's name for the cabinet's isolator. */
export const JACUZZI_ISOLATOR: IsolatorName = 'Jacuzzi cabinet isolator';
/** The thermostat's step per press of + or −, °C (`cabinet-mimic.ts`). */
export const SETPOINT_STEP = 0.5;

const onOff = (input: string) => input === 'on';
const opens = (input: string) => input === 'open';

/** The room's valves, from its model, in the schematic's order. */
export const JACUZZI_ROOM_VALVES: readonly ModelValve[] = MODEL_VALVES.filter(
  (v) => v.room === ROOM && v.kind === 'isolating-valve',
);

/** Whether a valve stands open in the world (the drain's, the pool's drain-down). */
export function jacuzziValveOpen(world: World, v: ModelValve): boolean {
  if (v.id === 'jacuzzi.drain') return world.pools.pool_03.drainDown;
  return world.installedValves[v.id] ?? v.normal === 'open';
}

/**
 * A valve opened or shut: `plant/valve` with its model id; the drain's,
 * the pool's drain-down (its view's one action, prompt 064).
 */
export function jacuzziValveAction(v: ModelValve, open: boolean): WorldAction {
  return v.id === 'jacuzzi.drain'
    ? { type: 'pool/drain-down', pool: 'pool_03', open }
    : { type: 'plant/valve', id: v.id, open };
}

const doorsOf = (view?: ViewValues) => view?.doors === 'open';

function cabinet(): ObjectDescriptor {
  const ref = JACUZZI_CABINET_REF;
  const targets = [ref];
  const panel = (w: World, view?: ViewValues) =>
    jacuzziCabinetPanel(w, doorsOf(view));
  const button = (
    key: string,
    label: string,
    action: Control['action'],
    form: Control['form'] = 'push-button',
  ): Control => ({
    key,
    ref: partRef(ref, key),
    label,
    form,
    inputs: ['press'],
    action,
    targets,
  });
  const step = (sign: 1 | -1) => (w: World) => ({
    type: 'pool/setpoint' as const,
    pool: 'pool_03' as const,
    celsius: clampSetpoint(w.pools.pool_03.setpoint + sign * SETPOINT_STEP),
  });
  const controls: Control[] = [
    {
      key: 'power',
      ref: partRef(ref, 'power'),
      label: 'POWER',
      form: 'selector',
      inputs: ['on', 'off'],
      action: (_w, input) => ({
        type: 'jacuzzi/cabinet',
        action: { act: 'power', on: onOff(input) },
      }),
      position: (w) => (w.jacuzziCabinet.power ? 'on' : 'off'),
      targets,
    },
    button('reset', 'RESET', () => ({
      type: 'jacuzzi/cabinet',
      action: { act: 'reset' },
    })),
    ...(['jets', 'air'] as const).map((what) => ({
      ...button(
        what,
        what.toUpperCase(),
        () => ({ type: 'jacuzzi', action: { act: 'toggle', what } }) as const,
        'illuminated-button',
      ),
      position: (w: World) => (jacuzziRuns(w)[what] ? 'lit' : 'dark'),
    })),
    button('set-up', '+', step(1)),
    button('set-down', '−', step(-1)),
    {
      key: 'display',
      ref: partRef(ref, 'display'),
      label: 'DISPLAY',
      form: 'push-button',
      inputs: ['press'],
      view: { key: 'page', values: { press: 'next' } },
      targets,
    },
    button('wash-mode', 'WASH MODE', () => ({
      type: 'spa-filter',
      pool: 'pool_03',
      action: { act: 'mode' },
    })),
    button('wash-now', 'WASH NOW', () => ({
      type: 'spa-filter',
      pool: 'pool_03',
      action: { act: 'wash-now' },
    })),
  ];
  const lamp = (
    key: string,
    label: string,
    lit: (p: ReturnType<typeof panel>) => boolean,
  ): Reading => ({
    key,
    ref: partRef(ref, key),
    label,
    form: 'lamp',
    read: (w, view) => lit(panel(w, view)),
  });
  const readings: Reading[] = [
    lamp('pump-run', 'PUMP RUN', (p) => p.pumpRun),
    lamp('flow', 'FLOW', (p) => p.flowing),
    lamp('uv', 'UV', (p) => p.uv),
    lamp('dosing', 'DOSING', (p) => p.dosing),
    lamp('no-flow', 'NO FLOW', (p) => p.noFlow),
    {
      key: 'display',
      ref: partRef(ref, 'display'),
      label: 'Display',
      form: 'display',
      read: (w, view) => panel(w, view).lines ?? null,
    },
  ];
  return {
    ref,
    room: ROOM,
    kind: 'jacuzzi-pack',
    class: classOf('jacuzzi-pack'),
    name: 'Packaged Jacuzzi plant cabinet',
    controls,
    readings,
    view: [
      { key: 'doors', values: ['shut', 'open'], initial: 'shut' },
      {
        key: 'page',
        values: ['status', 'wash', 'pressure'],
        initial: 'status',
      },
    ],
    presets: [
      { id: 'in-service', label: 'In service', actions: [] },
      {
        id: 'off',
        label: 'Switched off',
        actions: [
          { type: 'jacuzzi/cabinet', action: { act: 'power', on: false } },
        ],
      },
      {
        id: 'doors-open',
        label: 'Doors open',
        actions: [],
        view: { doors: 'open' },
      },
      {
        id: 'tripped',
        label: 'Tripped: no flow',
        actions: [{ type: 'plant/valve', id: 'jacuzzi.suction', open: false }],
        seconds: 10,
      },
    ],
  };
}

function isolator(): ObjectDescriptor {
  const ref = JACUZZI_ISOLATOR_REF;
  return {
    ref,
    room: ROOM,
    kind: 'power-isolator',
    class: 'plant',
    name: 'Switch-fuse to the cabinet isolator',
    controls: [
      {
        key: 'handle',
        ref: partRef(ref, 'handle'),
        label: 'Isolator handle',
        form: 'isolator',
        inputs: ['on', 'off'],
        action: (_w, input) => ({
          type: 'plant/isolator',
          name: JACUZZI_ISOLATOR,
          on: onOff(input),
        }),
        position: (w) => (w.plant.isolators[JACUZZI_ISOLATOR] ? 'on' : 'off'),
        targets: ['fitting:jacuzzi.isolator', JACUZZI_CABINET_REF],
      },
    ],
    readings: [
      {
        key: 'handle',
        ref: partRef(ref, 'handle'),
        label: 'Handle position',
        form: 'position',
        read: (w) => (w.plant.isolators[JACUZZI_ISOLATOR] ? 'on' : 'off'),
      },
    ],
    view: [],
    presets: [
      { id: 'on', label: 'On', actions: [] },
      {
        id: 'off',
        label: 'Off',
        actions: [
          { type: 'plant/isolator', name: JACUZZI_ISOLATOR, on: false },
        ],
      },
    ],
  };
}

function valve(v: ModelValve): ObjectDescriptor {
  const ref = v.tag;
  const motor = v.operator === 'motor';
  const position = (w: World) => (jacuzziValveOpen(w, v) ? 'open' : 'shut');
  const targets = [`fitting:${v.id}`];
  const controls: Control[] = motor
    ? [
        {
          // Its actuator's red override: works it by hand, either way.
          key: 'override',
          ref: partRef(ref, 'override'),
          label: 'Override',
          form: 'push-button',
          inputs: ['press'],
          action: (w) => jacuzziValveAction(v, !jacuzziValveOpen(w, v)),
          position,
          targets,
        },
      ]
    : [
        {
          key: 'handle',
          ref: partRef(ref, 'handle'),
          label: 'Handle',
          form: 'valve-handle',
          inputs: ['open', 'shut'],
          action: (_w, input) => jacuzziValveAction(v, opens(input)),
          position,
          targets,
        },
      ];
  return {
    ref,
    room: ROOM,
    kind: 'butterfly-valve',
    class: classOf('butterfly-valve'),
    name: v.name,
    controls,
    readings: [
      {
        key: 'position',
        ref: partRef(ref, 'position'),
        label: motor ? 'Position lamp' : 'Handle position',
        form: 'position',
        read: position,
      },
    ],
    view: [],
    presets: [
      { id: 'open', label: 'Open', actions: [jacuzziValveAction(v, true)] },
      { id: 'shut', label: 'Shut', actions: [jacuzziValveAction(v, false)] },
    ],
  };
}

/** The motorised valves' wall panel: OPEN and SHUT for each, its lamps their limit switches. */
function valvePanel(): ObjectDescriptor {
  const ref = JACUZZI_VALVE_PANEL_REF;
  const motors = JACUZZI_ROOM_VALVES.filter((v) => v.operator === 'motor');
  return {
    ref,
    room: ROOM,
    kind: 'valve-panel',
    class: 'plant',
    name: 'Valve panel',
    controls: motors.flatMap((v) =>
      (['open', 'shut'] as const).map((verb): Control => ({
        key: `${v.tag}-${verb}`,
        ref: partRef(ref, `${v.tag}-${verb}`),
        label: `${v.tag} ${verb.toUpperCase()}`,
        form: 'push-button',
        inputs: ['press'],
        action: () => jacuzziValveAction(v, verb === 'open'),
        targets: [`fitting:${v.id}`],
      })),
    ),
    readings: motors.map((v) => ({
      key: v.tag,
      ref: partRef(ref, v.tag),
      label: `${v.tag} position`,
      form: 'lamp' as const,
      read: (w: World) => (jacuzziValveOpen(w, v) ? 'open' : 'shut'),
    })),
    view: [],
    presets: [{ id: 'in-service', label: 'In service', actions: [] }],
  };
}

function balanceTank(): ObjectDescriptor {
  const ref = 'PL3-BT1';
  return {
    ref,
    room: ROOM,
    kind: 'balance-tank',
    class: classOf('balance-tank'),
    name: 'Jacuzzi balance tank',
    controls: [],
    readings: [
      {
        key: 'gauge',
        ref: partRef(ref, 'gauge'),
        label: 'Level gauge',
        form: 'gauge',
        read: (w) => w.pools.pool_03.balance,
      },
    ],
    view: [],
    presets: [{ id: 'in-service', label: 'In service', actions: [] }],
  };
}

function dayTank(chemical: Chemical, code: 'DT1' | 'DT2'): ObjectDescriptor {
  const ref = `PL3-${code}`;
  const i = dayTankOf(chemical, 'pool_03');
  return {
    ref,
    room: ROOM,
    kind: 'chem-day',
    class: classOf('chem-day'),
    name: `${chemical === 'hypochlorite' ? 'Hypochlorite' : 'Acid'} day tank`,
    controls: [],
    readings: [
      {
        // Seen through its translucent wall, against its graduations.
        key: 'level',
        ref: partRef(ref, 'level'),
        label: 'Level, litres',
        form: 'gauge',
        read: (w) => w.distribution[chemical]?.tanks[i]?.litres ?? null,
      },
    ],
    view: [],
    presets: [{ id: 'in-service', label: 'In service', actions: [] }],
  };
}

let made: readonly ObjectDescriptor[] | undefined;
/** Every descriptor of the Jacuzzi plant room. */
export function jacuzziRoomDescriptors(): readonly ObjectDescriptor[] {
  made ??= [
    cabinet(),
    isolator(),
    valvePanel(),
    ...JACUZZI_ROOM_VALVES.map(valve),
    balanceTank(),
    dayTank('hypochlorite', 'DT1'),
    dayTank('acid', 'DT2'),
  ];
  return made;
}
