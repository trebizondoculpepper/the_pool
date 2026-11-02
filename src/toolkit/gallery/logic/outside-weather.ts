import type { World } from '../../../game/world';
import {
  WEATHER_CREDIT,
  compassPoint,
  pressureTrend,
  ukClock,
  weatherWords,
} from '../../../game/weather';
import { heatDemand } from './schematic-overviews';

/**
 * OUTSIDE CONDITIONS (mission 123): the weather on the bridge, in its
 * own style: the outside temperature, wind, humidity, pressure and the
 * conditions, from the world's reading (Manchester's, from Open-Meteo, or
 * the climate model's estimate), and the heat load it drives, the LTHW
 * ring's demand (mission 120). It only shows; nothing is worked from it.
 * Pure.
 */
export const OUTSIDE_WEATHER = {
  id: 'outside-weather',
  title: 'OUTSIDE CONDITIONS',
  short: 'WEATHER',
  code: 'CR-CP10',
  /** Bound to the old control room's weather station console, which shows the same reading. */
  model: { room: 'control_room', node: 'weather-station' },
} as const;

export interface OutsideView {
  /** No live reading: NO DATA, ESTIMATED. */
  estimated: boolean;
  /** The world's outside temperature now, eased toward the reading, °C. */
  ambient: string;
  /** The reading's own temperature, °C. */
  reading: string;
  conditions: string;
  wind: string;
  gusts: string;
  humidity: string;
  pressure: string;
  trend: string;
  heatLoad: string;
  /** Where the reading came from, and when. */
  source: string;
}

export function outsideView(world: World): OutsideView {
  const w = world.weather;
  const r = w.reading;
  const ambient = world.ambient.toFixed(1);
  const heatLoad = Math.round(heatDemand(world)).toString();
  if (!r)
    return {
      estimated: true,
      ambient,
      reading: '--.-',
      conditions: 'NO DATA',
      wind: '--',
      gusts: '--',
      humidity: '--',
      pressure: '----',
      trend: '',
      heatLoad,
      source: 'NO READING YET',
    };
  const estimated = r.source !== 'open-meteo';
  return {
    estimated,
    ambient,
    reading: r.temperature.toFixed(1),
    conditions: estimated
      ? 'NO DATA, ESTIMATED'
      : weatherWords(r.code).toUpperCase(),
    wind: `${r.windSpeed.toFixed(0)} ${compassPoint(r.windDirection)}`,
    gusts: r.gusts.toFixed(0),
    humidity: r.humidity.toFixed(0),
    pressure: r.pressure.toFixed(0),
    trend: pressureTrend(w).toUpperCase(),
    heatLoad,
    source: estimated
      ? `MODELLED UK CLIMATE ${ukClock(r.takenAt)}`
      : `MANCHESTER ${ukClock(r.takenAt)} · ${WEATHER_CREDIT.toUpperCase()}`,
  };
}
