/**
 * Control descriptors (mission 131, `doc/prompts/131-control-descriptors.md`):
 * one scene-free description of each game object, made by its kind: its
 * controls (stable ids in mission 125's ref form, `PL3-CAB1/power`), the
 * world action each sends, its visible readings (only what its own lamps,
 * displays, gauges and positions show: the overlay's no-peeking rule), its
 * view-held state and its curated presets. The 3D views take their
 * controls' actions from here; mission 128's text mode, 129's room audit
 * and 130's item audit read it too. Pure: no DOM, no Three.js.
 */
import type { Classification } from '../plant/equipment-kinds';
import { equipmentKind, isKindId } from '../plant/equipment-kinds';
import { applyAction, stepWorld } from '../world';
import type { World, WorldAction } from '../world';

/**
 * Its class: the kinds' (`EQUIPMENT_KINDS`), and the owner's
 * `architectural` (2026-11-02): signs, electrical and fire fittings and
 * doors, with a game function but not simulated, never flagged unbound.
 */
export type DescriptorClass = Classification | 'architectural';

/** What a control is, as a player would call it. */
export type ControlForm =
  | 'selector'
  | 'push-button'
  | 'illuminated-button'
  | 'valve-handle'
  | 'isolator'
  | 'page-button';

/** View-held values a reading may need, declared, never assumed: `{ doors: 'open' }`. */
export type ViewValues = Readonly<Record<string, string>>;

export interface Control {
  /** Its part key: `power`. */
  key: string;
  /** Its id: its object's ref, a slash and its key, `PL3-CAB1/power`. */
  ref: string;
  /** Its legend or name: `POWER`. */
  label: string;
  form: ControlForm;
  /** What can be done to it: `['on', 'off']`, `['press']`, `['open', 'shut']`. */
  inputs: readonly string[];
  /** Only on its plant room's own panel. */
  local?: boolean;
  /**
   * The world action an input sends as the world stands, or null when that
   * input does nothing. Absent on a page button, which changes view state.
   */
  action?(world: World, input: string): WorldAction | null;
  /** The view state a page button changes, and the value each input gives. */
  view?: { key: string; values: Readonly<Record<string, string>> };
  /** Its own position, as seen: `on`, `open`. */
  position?(world: World): string;
  /** What it works, as model refs: 129's "controlled by". */
  targets: readonly string[];
}

export type ReadingForm = 'lamp' | 'display' | 'gauge' | 'position' | 'readout';

export interface Reading {
  key: string;
  ref: string;
  label: string;
  form: ReadingForm;
  /** What it shows: a lamp lit or not, a display's text, a gauge's value. */
  read(
    world: World,
    view?: ViewValues,
  ): string | number | boolean | readonly string[] | null;
}

/** View-held state: a cabinet's doors, a board's page. */
export interface ViewState {
  key: string;
  values: readonly string[];
  initial: string;
}

/** A representative state, put into a world by `applyPreset`. */
export interface Preset {
  id: string;
  label: string;
  /** How a world is put into it. */
  actions: readonly WorldAction[];
  /** World time run after the actions, s. */
  seconds?: number;
  /** The view state shown with it. */
  view?: ViewValues;
}

export interface ObjectDescriptor {
  /** Its ref (mission 125): its tag, else its name's slug. */
  ref: string;
  room: string;
  /** Its kind's key, as mission 126's catalogue has it. */
  kind: string;
  class: DescriptorClass;
  /** From the model, never written by hand. */
  name: string;
  controls: readonly Control[];
  readings: readonly Reading[];
  view: readonly ViewState[];
  presets: readonly Preset[];
}

/** A kind's class from the kinds' register, else `fallback`. */
export const classOf = (
  kind: string,
  fallback: DescriptorClass = 'plant',
): DescriptorClass => (isKindId(kind) ? equipmentKind(kind).class : fallback);

/** A control's or reading's id: its object's ref and its key. */
export const partRef = (ref: string, key: string) => `${ref}/${key}`;

/** The view state a descriptor starts in. */
export const initialView = (d: ObjectDescriptor): ViewValues =>
  Object.fromEntries(d.view.map((v) => [v.key, v.initial]));

/** A preset applied to `world` (a scratch world of the caller's), as a new world. */
export function applyPreset(world: World, preset: Preset): World {
  let w = preset.actions.reduce(applyAction, world);
  // In steps of a second, as the game steps.
  for (let t = 0; t < (preset.seconds ?? 0); t += 1) w = stepWorld(w, 1);
  return w;
}

/** Every reading of a descriptor, as it reads now. */
export const readAll = (
  d: ObjectDescriptor,
  world: World,
  view: ViewValues = initialView(d),
) => Object.fromEntries(d.readings.map((r) => [r.key, r.read(world, view)]));
