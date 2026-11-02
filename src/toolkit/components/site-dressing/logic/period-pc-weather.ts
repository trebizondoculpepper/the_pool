import type { WeatherReading } from '../../../../game/weather';
import {
  WEATHER_CREDIT,
  compassPoint,
  ukClock,
  weatherIcon,
  weatherWords,
} from '../../../../game/weather';
import type { WeatherIcon } from '../../../../game/weather';

/**
 * The Gateway 3000's Open-Meteo page (mission 123): Manchester's weather
 * now, as a simplified page in the period browser's look. What it says,
 * worked out from the world's reading alone; `views/period-pc-weather.ts`
 * draws it. Pure.
 */
export interface WeatherPage {
  /** Changes only when the page's picture does. */
  key: string;
  estimated: boolean;
  headline: string;
  temperature: string;
  words: string;
  icon: WeatherIcon;
  rows: readonly [string, string][];
  observed: string;
  credit: string;
}

const t = (v: number) => `${v.toFixed(1)} °C`;

export function weatherPage(reading: WeatherReading | null): WeatherPage {
  if (!reading)
    return {
      key: 'none',
      estimated: true,
      headline: 'Manchester, now',
      temperature: '--.- °C',
      words: 'NO DATA',
      icon: 'cloud',
      rows: [],
      observed: 'Waiting for the first reading',
      credit: WEATHER_CREDIT,
    };
  const estimated = reading.source !== 'open-meteo';
  const rows: [string, string][] = [
    ['Feels like', t(reading.apparent)],
    [
      'Wind',
      `${reading.windSpeed.toFixed(0)} km/h ${compassPoint(reading.windDirection)}`,
    ],
    ['Gusts', `${reading.gusts.toFixed(0)} km/h`],
    ['Humidity', `${reading.humidity.toFixed(0)} %`],
    ['Pressure', `${reading.pressure.toFixed(0)} hPa`],
    ['Cloud', `${reading.cloud.toFixed(0)} %`],
    ['Rain', `${reading.precipitation.toFixed(1)} mm`],
    ['Today', `${t(reading.todayMax)} / ${t(reading.todayMin)}`],
    [
      'Sunrise / set',
      `${ukClock(reading.sunrise)} / ${ukClock(reading.sunset)}`,
    ],
  ];
  return {
    key: `${reading.source}:${reading.takenAt}:${reading.temperature}`,
    estimated,
    headline: 'Manchester, now',
    temperature: t(reading.temperature),
    words: estimated ? 'NO DATA, ESTIMATED' : weatherWords(reading.code),
    icon: weatherIcon(reading.code, reading.isDay),
    rows,
    observed: estimated
      ? `Modelled UK climate, ${ukClock(reading.takenAt)}`
      : `Observed ${ukClock(reading.takenAt)}`,
    credit: WEATHER_CREDIT,
  };
}
