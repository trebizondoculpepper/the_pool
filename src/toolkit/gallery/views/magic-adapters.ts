import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { PartSet } from '../../components/core/parts/parts';
import type { BrandId } from '../../components/core/logic/brands';
import {
  STATION_SIZE,
  createWeatherStation,
} from '../../components/plant/views/weather-station';
import { estimatedReading } from '../../../game/weather';
import type { WeatherReading } from '../../../game/weather';
import type { ItemSize } from '../logic/magic-room-layout';
import { isLive } from '../rooms/plant/exhibit';
import type { PlantExhibit } from '../rooms/plant/exhibit';
import { MODELS, buildRoomItem } from './room-equipment';
import { KIND_BUILDERS } from './magic-builders';
import type { KindBuilder } from './magic-builders';
import { placedRoomItems } from '../logic/room-usage';
import { isDevRoom } from '../logic/kind-catalogue';
import type { Item } from '../logic/room-equipment';
import { newWorld } from '../../../game/world';
import { createScenarioStore, setRoomWorld } from '../../save/world-store';

/**
 * The magic room's factory adapters (mission 130): for each kind with a 3D
 * form, how the magic room builds it with the game's own view builder, its
 * size and mounting, its curated looks and display pages, a setter for
 * each, and the dev rooms that hold it working. Explicit adapters first;
 * any other kind with a model exhibit (`MODELS`) is built from that, with
 * no looks curated yet; any other kind a room layout places is built by
 * the very item builder the rooms use (`buildRoomItem`), at the layout
 * item's size and mount, so every kind the game draws has a magic room and
 * CAD views with no work of its own (the owner, 2026-11-04). A kind with
 * none of these has no 3D form: a magic page.
 * The item is never bound to the world: what it shows is a stand-in.
 */

/** One position of the panel's knob: a representative look or a page. */
export interface MagicChoice {
  id: string;
  /** Short, as engraved on the panel: `LAMP`. */
  label: string;
  /** In words, for the page and the room's bar. */
  words: string;
}

/** The item as built for the magic room. */
export interface MagicItem {
  object: Object3D;
  /** Its parts a click works. */
  parts?: PartSet;
  /** Everything it does each frame, its parts included. */
  update?(delta: number): void;
  dispose?(): void;
  /** Show one of its curated looks. */
  setLook?(id: string): void;
  /** Show one of its display pages. */
  setPage?(id: string): void;
}

export interface MagicAdapter {
  kind: string;
  title: string;
  /** The real product it is modelled after. */
  reference?: string;
  maker?: BrandId;
  size: ItemSize;
  /** Curated looks (never every combination), and display pages. */
  looks: readonly MagicChoice[];
  pages: readonly MagicChoice[];
  /** Dev rooms holding it working that the catalogue does not count from data. */
  devRooms: readonly { room: string; words: string }[];
  /** Where its adapter comes from. */
  source: 'explicit' | 'model' | 'layout' | 'builder';
  build(kit: PanelKit): MagicItem;
  /**
   * Its hand-made low-poly version, where it has one (mission 135); without
   * one, its LOW version is its far version (`createFarVersion`).
   */
  buildLow?(kit: PanelKit): { object: Object3D; dispose?(): void };
}

/** A fixed moment for its stand-in readings, so its pictures repeat: 15 June 2026, noon. */
const SAMPLE_TIME = Date.UTC(2026, 5, 15, 12);
const sampleReading = (): WeatherReading => ({
  ...estimatedReading(SAMPLE_TIME),
  source: 'open-meteo',
});

const weatherStation: MagicAdapter = {
  kind: 'weather-station',
  title: 'Weather station console',
  reference: 'After the Davis Vantage Pro2 console, 270 × 160 × 40 mm',
  maker: 'calloway',
  size: { ...STATION_SIZE, mount: 'wall', y: 1.5 },
  looks: [
    { id: 'reading', label: 'READING', words: 'Sensors reading, lamp off' },
    { id: 'lamp', label: 'LAMP', words: 'Sensors reading, backlight lit' },
    { id: 'imperial', label: 'IMPERIAL', words: 'Imperial units' },
    { id: 'no-data', label: 'NO DATA', words: 'No sensor data: estimated' },
  ],
  pages: [
    { id: 'main', label: 'MAIN', words: 'Main page' },
    { id: 'more', label: 'MORE', words: 'Second page' },
  ],
  devRooms: [
    { room: 'dev0', words: 'its trial board, at 1.5 times life size' },
  ],
  source: 'explicit',
  build(kit) {
    const present = sampleReading();
    let reading: WeatherReading | null = present;
    const station = createWeatherStation(kit, {
      reading: () => reading,
      trend: () => 'steady',
    });
    return {
      object: station.group,
      parts: station.parts,
      update: station.update,
      dispose: station.dispose,
      setLook(id) {
        reading = id === 'no-data' ? null : present;
        station.show({ lamp: id === 'lamp', metric: id !== 'imperial' });
      },
      setPage(id) {
        station.show({ page: id === 'more' ? 'more' : 'main' });
      },
    };
  },
};

const EXPLICIT: Readonly<Record<string, MagicAdapter>> = {
  // A curated adapter: the weather station's LOOK and PAGE selectors step
  // through settings the model's plain build can't show. Every other kind
  // with a 3D form is discovered through MODELS (`fromModel`), so a model
  // never needs a side-channel here (the owner, 2026-11-03).
  'weather-station': weatherStation,
};

/** An adapter from a kind's model exhibit: its size, mount and builder, no looks curated. */
function fromModel(kind: string, exhibit: PlantExhibit): MagicAdapter {
  return {
    kind,
    title: exhibit.title,
    reference: exhibit.reference,
    ...(exhibit.maker ? { maker: exhibit.maker } : {}),
    size: {
      w: exhibit.size.w,
      d: exhibit.size.d,
      h: exhibit.size.h,
      mount: exhibit.size.mount,
      ...(exhibit.size.y !== undefined ? { y: exhibit.size.y } : {}),
    },
    looks: [],
    pages: [],
    devRooms: [],
    source: 'model',
    build(kit) {
      const built = exhibit.build(kit);
      if (!isLive(built)) return { object: built };
      return {
        object: built.object,
        ...(built.parts ? { parts: built.parts } : {}),
        update(delta: number) {
          built.parts?.update(delta);
          built.update?.(delta);
        },
        ...(built.dispose ? { dispose: built.dispose } : {}),
      };
    },
  };
}

/**
 * The magic room's own world: a fresh one in memory, never loaded or
 * saved, so a machine built bound to the room's world reads stand-in
 * values and nothing it does reaches the player's save (mission 130).
 */
let scratchWorld = false;
const useScratchWorld = () => {
  if (scratchWorld) return;
  scratchWorld = true;
  setRoomWorld(createScenarioStore(newWorld()));
};

/** A kind's first placed layout item, preferring rooms outside development. */
function layoutItemOf(kind: string): { item: Item; room: string } | undefined {
  let found: { item: Item; room: string } | undefined;
  for (const { room, items } of placedRoomItems())
    for (const item of items) {
      if (item.key.split(':')[0] !== kind) continue;
      if (!isDevRoom(room)) return { item, room };
      found ??= { item, room };
    }
  return found;
}

/** An adapter from the rooms' own item builder: the machine as a room draws it. */
function fromLayoutItem(kind: string, item: Item, room: string): MagicAdapter {
  return {
    kind,
    title: item.label,
    size: {
      w: item.w,
      d: item.d,
      h: item.h,
      mount: item.mount,
      ...(item.y !== undefined ? { y: item.y } : {}),
    },
    looks: [],
    pages: [],
    devRooms: [],
    source: 'layout',
    build(kit) {
      useScratchWorld();
      const built = buildRoomItem(kit, item, room);
      if (!built)
        throw new Error(`The rooms' builder draws nothing for ${item.key}`);
      if (!isLive(built)) return { object: built };
      return {
        object: built.object,
        ...(built.parts ? { parts: built.parts } : {}),
        update(delta: number) {
          built.parts?.update(delta);
          built.update?.(delta);
        },
        ...(built.dispose ? { dispose: built.dispose } : {}),
      };
    },
  };
}

/** The kind's adapter, if it has a 3D form the magic room can build. */
export function adapterFor(kind: string): MagicAdapter | undefined {
  if (Object.hasOwn(EXPLICIT, kind)) return EXPLICIT[kind];
  if (Object.hasOwn(MODELS, kind)) return fromModel(kind, MODELS[kind]);
  const placed = layoutItemOf(kind);
  if (placed) return fromLayoutItem(kind, placed.item, placed.room);
  return Object.hasOwn(KIND_BUILDERS, kind)
    ? fromBuilder(kind, KIND_BUILDERS[kind])
    : undefined;
}

/** An adapter from a standalone builder (`magic-builders.ts`). */
function fromBuilder(kind: string, b: KindBuilder): MagicAdapter {
  return {
    kind,
    title: b.title,
    size: b.size,
    looks: [],
    pages: [],
    devRooms: [],
    source: 'builder',
    build(kit) {
      useScratchWorld();
      const built = b.build(kit);
      return {
        ...built,
        update(delta: number) {
          built.parts?.update(delta);
          built.update?.(delta);
        },
      };
    },
  };
}
