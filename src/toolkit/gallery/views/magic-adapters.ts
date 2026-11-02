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
import { MODELS } from './room-equipment';

/**
 * The magic room's factory adapters (mission 130): for each kind with a 3D
 * form, how the magic room builds it with the game's own view builder, its
 * size and mounting, its curated looks and display pages, a setter for
 * each, and the dev rooms that hold it working. Explicit adapters first;
 * any other kind with a model exhibit (`MODELS`) is built from that, with
 * no looks curated yet. A kind with neither has no 3D form: a magic page.
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
  source: 'explicit' | 'model';
  build(kit: PanelKit): MagicItem;
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

/** The kind's adapter, if it has a 3D form the magic room can build. */
export function adapterFor(kind: string): MagicAdapter | undefined {
  if (Object.hasOwn(EXPLICIT, kind)) return EXPLICIT[kind];
  return Object.hasOwn(MODELS, kind)
    ? fromModel(kind, MODELS[kind])
    : undefined;
}
