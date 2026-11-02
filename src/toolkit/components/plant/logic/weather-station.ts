import type { WeatherReading } from '../../../../game/weather';
import { compassPoint, ukClock, weatherIcon } from '../../../../game/weather';
import type { WeatherIcon } from '../../../../game/weather';

/**
 * The Calloway WeatherWatch Pro console (mission 123): a 2000s weather
 * station console after the Davis Vantage Pro2's, its LCD showing what its
 * roof sensors read (in the game, the world's weather reading). Its own
 * keys: PAGE between the main page and the second, UNITS between metric
 * and imperial, LAMP for its backlight. What the LCD shows is worked out
 * here; `views/weather-station.ts` draws it. Pure.
 */

export type StationPage = 'main' | 'more';

export interface StationUi {
  page: StationPage;
  metric: boolean;
  lamp: boolean;
}

export const newStationUi = (): StationUi => ({
  page: 'main',
  metric: true,
  lamp: false,
});

export type StationKey = 'page' | 'units' | 'lamp';

export function stationPress(ui: StationUi, key: StationKey): StationUi {
  if (key === 'page')
    return { ...ui, page: ui.page === 'main' ? 'more' : 'main' };
  if (key === 'units') return { ...ui, metric: !ui.metric };
  return { ...ui, lamp: !ui.lamp };
}

/** What the LCD shows. */
export interface StationScreen {
  /** Changes only when the picture does. */
  key: string;
  lamp: boolean;
  page: StationPage;
  /** No sensor data: the estimate, flagged on the LCD. */
  estimated: boolean;
  /** The big figure and its unit. */
  big: string;
  bigUnit: string;
  /** Where the wind blows from, degrees, for the compass rose's arrow (null with no reading). */
  windFrom: number | null;
  icon: WeatherIcon;
  /** Small fields: label and value. */
  fields: readonly [string, string][];
  trend: 'rising' | 'falling' | 'steady';
  time: string;
}

const temp = (c: number, metric: boolean) =>
  metric ? c.toFixed(1) : ((c * 9) / 5 + 32).toFixed(1);
const speed = (kmh: number, metric: boolean) =>
  metric ? `${kmh.toFixed(0)} km/h` : `${(kmh / 1.609).toFixed(0)} mph`;
const press = (hpa: number, metric: boolean) =>
  metric ? `${hpa.toFixed(1)} hPa` : `${(hpa * 0.02953).toFixed(2)} inHg`;
const rain = (mm: number, metric: boolean) =>
  metric ? `${mm.toFixed(1)} mm` : `${(mm / 25.4).toFixed(2)} in`;

export function stationScreen(
  reading: WeatherReading | null,
  trend: 'rising' | 'falling' | 'steady',
  ui: StationUi,
): StationScreen {
  const unit = ui.metric ? '°C' : '°F';
  if (!reading)
    return {
      key: `none|${ui.page}|${ui.metric}|${ui.lamp}`,
      lamp: ui.lamp,
      page: ui.page,
      estimated: true,
      big: '---.-',
      bigUnit: unit,
      windFrom: null,
      icon: 'cloud',
      fields: [],
      trend: 'steady',
      time: '--:--',
    };
  const m = ui.metric;
  const fields: [string, string][] =
    ui.page === 'main'
      ? [
          [
            'WIND',
            `${speed(reading.windSpeed, m)} ${compassPoint(reading.windDirection)}`,
          ],
          ['GUST', speed(reading.gusts, m)],
          ['HUM', `${reading.humidity.toFixed(0)}%`],
          ['BAR', press(reading.pressure, m)],
          ['RAIN', rain(reading.precipitation, m)],
        ]
      : [
          ['FEELS', `${temp(reading.apparent, m)}${unit}`],
          ['HI', `${temp(reading.todayMax, m)}${unit}`],
          ['LO', `${temp(reading.todayMin, m)}${unit}`],
          ['CLOUD', `${reading.cloud.toFixed(0)}%`],
          ['SUN', `${ukClock(reading.sunrise)}-${ukClock(reading.sunset)}`],
        ];
  const screen = {
    lamp: ui.lamp,
    page: ui.page,
    estimated: reading.source !== 'open-meteo',
    big:
      ui.page === 'main'
        ? temp(reading.temperature, m)
        : temp(reading.apparent, m),
    bigUnit: unit,
    windFrom: reading.windDirection,
    icon: weatherIcon(reading.code, reading.isDay),
    fields,
    trend,
    time: ukClock(reading.takenAt),
  };
  return {
    ...screen,
    key: JSON.stringify(screen),
  };
}
