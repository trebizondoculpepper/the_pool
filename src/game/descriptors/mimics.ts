/**
 * Mimic boards' descriptors (mission 131), made from each board's spec
 * (`MimicSpec`: its buttons, modes, lamps and readouts) with its pure
 * command function (what a button's press sends) and its pure state
 * function (what its lamps and readouts show). The spec carries neither.
 * The views take their presses from here. Pure.
 */
import type {
  MimicSpec,
  MimicState,
} from '../../toolkit/components/industrial-control/logic/mimic';
import {
  BOILER_HEAT_COPY,
  boilerHeatPress,
} from '../../toolkit/gallery/logic/boiler-heat-mimic';
import {
  JACUZZI_MIMIC,
  jacuzziMimicState,
} from '../../toolkit/gallery/logic/jacuzzi-mimic';
import {
  LOUNGE_FILTER_MIMIC,
  loungeFilterMimicOf,
} from '../../toolkit/gallery/logic/lounge-filter-mimic';
import {
  GAS_MIMIC,
  HEATING_MIMIC,
  MAIN_POOL_MIMIC,
  mainPoolMimicCommand,
  mainPoolState,
  poolPumpTags,
  poolPumpsShown,
  heatingState,
} from '../../toolkit/gallery/logic/pool-mimics';
import { plantReadingOf } from '../../toolkit/gallery/logic/world-reading';
import type { World, WorldAction } from '../world';
import { classOf, partRef } from './descriptor';
import type { Control, ObjectDescriptor, Reading } from './descriptor';

export interface MimicDescription {
  ref: string;
  room: string;
  kind: string;
  name: string;
  spec: MimicSpec;
  /** What a button's press sends; absent, its buttons work nothing. */
  command?: (button: string) => WorldAction | null;
  /** What it shows; absent, its readings wait for a pure state (stage 2). */
  state?: (world: World) => MimicState;
  /** What each button works, as model refs. */
  targets?: (button: string) => readonly string[];
}

/** A mimic board's descriptor from its spec, command and state. */
export function mimicDescriptor(m: MimicDescription): ObjectDescriptor {
  const { ref, spec } = m;
  const modes = spec.modes.map((x) => x.id);
  const buttons: Control[] = (spec.buttons ?? []).map((b) => ({
    key: b.id,
    ref: partRef(ref, b.id),
    label: b.legend ?? b.id,
    form: 'push-button',
    inputs: ['press'],
    // A read-only copy's buttons light but work nothing.
    action: () => m.command?.(b.id) ?? null,
    targets: m.targets?.(b.id) ?? [],
  }));
  const pages: Control[] = spec.modes.map((x) => ({
    key: `mode-${x.id}`,
    ref: partRef(ref, `mode-${x.id}`),
    label: x.legend,
    form: 'page-button',
    inputs: ['press'],
    view: { key: 'mode', values: { press: x.id } },
    targets: [],
  }));
  const state = m.state;
  const readings: Reading[] = state
    ? [
        ...spec.lamps.map((l): Reading => ({
          key: l.id,
          ref: partRef(ref, l.id),
          label: l.label ?? l.id,
          form: 'lamp',
          read: (w) => state(w).lamps[l.id] ?? false,
        })),
        ...spec.readouts.map((r): Reading => ({
          key: r.id,
          ref: partRef(ref, r.id),
          label: r.id,
          form: 'readout',
          read: (w, view) => {
            const reading = state(w).readouts[r.id]?.[view?.mode ?? modes[0]];
            return reading
              ? Number(reading.value.toFixed(reading.places ?? 0))
              : null;
          },
        })),
      ]
    : [];
  return {
    ref,
    room: m.room,
    kind: m.kind,
    class: classOf(m.kind),
    name: m.name,
    controls: [...buttons, ...pages],
    readings,
    view: modes.length
      ? [{ key: 'mode', values: modes, initial: modes[0] }]
      : [],
    presets: spec.modes.map((x) => ({
      id: x.id,
      label: x.legend,
      actions: [],
      view: { mode: x.id },
    })),
  };
}

const ROOM = 'control_room';
const mainPool = (w: World) => {
  const reading = plantReadingOf(w, 'pool_02');
  return mainPoolState(reading, poolPumpsShown(w, reading, 'pool_02'));
};
const pumpTarget = (tags: Partial<Record<string, string>>) => (b: string) => {
  const tag = tags[b.split('-')[0]];
  return tag ? [tag] : [];
};

/** The control room's spec-driven boards, by their tags. */
export const CONTROL_ROOM_MIMICS: readonly MimicDescription[] = [
  {
    ref: 'CR-MP1',
    room: ROOM,
    kind: 'mimic-pool',
    name: 'Mimic: main pool circuit',
    spec: MAIN_POOL_MIMIC,
    command: (b) => mainPoolMimicCommand(b, 'pool_02'),
    state: mainPool,
    targets: pumpTarget(poolPumpTags('pool_02')),
  },
  {
    ref: 'CR-MP2',
    room: ROOM,
    kind: 'mimic-heating',
    name: 'Mimic: heating',
    spec: HEATING_MIMIC,
    state: (w) => heatingState(plantReadingOf(w, 'pool_02')),
  },
  {
    // The upper row's copy, out of reach: shown only, its buttons inert.
    ref: 'CR-MP6',
    room: ROOM,
    kind: 'mimic-lounge-filter',
    name: 'Mimic: lounge pool filters',
    spec: LOUNGE_FILTER_MIMIC,
    state: loungeFilterMimicOf,
  },
  {
    ref: 'CR-MP7',
    room: ROOM,
    kind: 'mimic-boiler-heat',
    name: 'Mimic: boiler status and heat output',
    spec: BOILER_HEAT_COPY,
    command: (b) => {
      const action = boilerHeatPress(b);
      return action?.act === 'run' ? { type: 'boiler-house', action } : null;
    },
    targets: () => ['BH-CP3'],
  },
  {
    ref: 'CR-MP8',
    room: ROOM,
    kind: 'mimic-gas',
    name: 'Mimic: boiler house gas',
    spec: GAS_MIMIC,
  },
  {
    ref: 'CR-MP9',
    room: ROOM,
    kind: 'mimic-jacuzzi',
    name: 'Mimic: jacuzzi water circuit',
    spec: JACUZZI_MIMIC,
    state: jacuzziMimicState,
  },
];

let made: readonly ObjectDescriptor[] | undefined;
/** The control room's mimic boards' descriptors. */
export function controlRoomMimicDescriptors(): readonly ObjectDescriptor[] {
  made ??= CONTROL_ROOM_MIMICS.map(mimicDescriptor);
  return made;
}
