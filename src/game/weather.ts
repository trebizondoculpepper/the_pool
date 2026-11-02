/**
 * The weather outside (mission 123): Manchester's, now, from Open-Meteo
 * (CC-BY 4.0, "Weather data by Open-Meteo.com"), or, with no reading or
 * one too old, a modelled UK climate for the date (`estimatedReading`).
 * The world keeps the last reading and eases its `ambient` toward the
 * reading's temperature (`easeAmbient`), so a new reading never steps the
 * heat load. The fetch itself lives outside `src/game/`
 * (`toolkit/weather/weather-feed.ts`); here everything is pure: readings
 * are handed in, parsed from the API's JSON, or modelled from a date.
 */

/** Manchester, fixed: never the player's own location. */
export const MANCHESTER = { latitude: 53.48, longitude: -2.24 } as const;

/** The credit Open-Meteo's CC-BY licence asks for, on every display naming the source. */
export const WEATHER_CREDIT = 'Weather data by Open-Meteo.com';

/** The one call: current conditions and today's extremes, times as Unix seconds. */
export const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${MANCHESTER.latitude}&longitude=${MANCHESTER.longitude}` +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,' +
  'wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,' +
  'cloud_cover,precipitation,weather_code,is_day' +
  '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset' +
  '&timezone=Europe%2FLondon&timeformat=unixtime&forecast_days=1';

/** At most one fetch in this many milliseconds: Open-Meteo's current values refresh every 15 minutes. */
export const FETCH_INTERVAL_MS = 15 * 60_000;

/** A live reading older than this is no longer trusted; the climate model takes over. */
export const STALE_AFTER_MS = 3 * 3600_000;

/** How fast the world's outside temperature follows a reading: its time constant, seconds. */
export const AMBIENT_EASE_SECONDS = 10 * 60;

/** One reading of the weather outside. Temperatures °C, wind km/h, pressure hPa, times Unix ms. */
export interface WeatherReading {
  /** Open-Meteo's live data, or the climate model's estimate. */
  source: 'open-meteo' | 'estimated';
  /** When the conditions were observed (Open-Meteo's own time), Unix ms. */
  takenAt: number;
  temperature: number;
  apparent: number;
  /** Relative humidity, %. */
  humidity: number;
  windSpeed: number;
  /** Where the wind blows from, degrees clockwise from north. */
  windDirection: number;
  gusts: number;
  /** Mean sea-level pressure, hPa. */
  pressure: number;
  /** Cloud cover, %. */
  cloud: number;
  /** Precipitation in the last quarter hour, mm. */
  precipitation: number;
  /** The WMO weather code (0 clear … 99 thunderstorm with hail). */
  code: number;
  isDay: boolean;
  todayMax: number;
  todayMin: number;
  sunrise: number;
  sunset: number;
}

/** The world's weather: its last reading, the one before (for the pressure trend), and a console test temperature. */
export interface WeatherState {
  reading: WeatherReading | null;
  /** The pressure of the reading before, hPa, for the trend arrow; null with none. */
  previousPressure: number | null;
  /** A test temperature set from the console (`weather 3`), held until `weather live`. */
  test: number | null;
}

export function newWeather(): WeatherState {
  return { reading: null, previousPressure: null, test: null };
}

/** The temperature the world's ambient is drawn toward, or null to leave it where it is. */
export function weatherTarget(weather: WeatherState): number | null {
  return weather.test ?? weather.reading?.temperature ?? null;
}

/** The ambient `delta` seconds on, eased toward `target` (exponentially, `AMBIENT_EASE_SECONDS`). */
export function easeAmbient(
  ambient: number,
  target: number | null,
  delta: number,
): number {
  if (target === null || ambient === target) return ambient;
  const next =
    target + (ambient - target) * Math.exp(-delta / AMBIENT_EASE_SECONDS);
  return Math.abs(next - target) < 1e-4 ? target : next;
}

/** The weather with a new reading taken in; the same record back for one already held. */
export function takeReading(
  weather: WeatherState,
  reading: WeatherReading,
): WeatherState {
  const old = weather.reading;
  if (
    old &&
    old.takenAt === reading.takenAt &&
    old.source === reading.source &&
    old.temperature === reading.temperature
  )
    return weather;
  return {
    ...weather,
    reading,
    previousPressure: old ? old.pressure : weather.previousPressure,
  };
}

/** Whether a reading is missing, estimated, or too old at `now` (Unix ms) to trust. */
export function readingStale(
  reading: WeatherReading | null,
  now: number,
): boolean {
  return (
    !reading ||
    reading.source !== 'open-meteo' ||
    now - reading.takenAt > STALE_AFTER_MS
  );
}

/** Pressure's trend from the reading before: rising, falling or steady (within 0.5 hPa). */
export function pressureTrend(
  weather: WeatherState,
): 'rising' | 'falling' | 'steady' {
  const now = weather.reading?.pressure;
  const before = weather.previousPressure;
  if (now === undefined || before === null) return 'steady';
  if (now - before > 0.5) return 'rising';
  if (before - now > 0.5) return 'falling';
  return 'steady';
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** A reading from Open-Meteo's JSON (`OPEN_METEO_URL`), or null if it is not one. */
export function parseOpenMeteo(json: unknown): WeatherReading | null {
  if (typeof json !== 'object' || json === null) return null;
  const { current, daily } = json as {
    current?: Record<string, unknown>;
    daily?: Record<string, unknown>;
  };
  if (!current) return null;
  const first = (key: string) =>
    Array.isArray(daily?.[key]) ? num((daily[key] as unknown[])[0]) : null;
  const time = num(current.time);
  const temperature = num(current.temperature_2m);
  if (time === null || temperature === null) return null;
  const or = (v: unknown, fallback: number) => num(v) ?? fallback;
  const climate = estimatedReading(time * 1000);
  return {
    source: 'open-meteo',
    takenAt: time * 1000,
    temperature,
    apparent: or(current.apparent_temperature, temperature),
    humidity: or(current.relative_humidity_2m, climate.humidity),
    windSpeed: or(current.wind_speed_10m, 0),
    windDirection: or(current.wind_direction_10m, 0),
    gusts: or(current.wind_gusts_10m, or(current.wind_speed_10m, 0)),
    pressure: or(current.pressure_msl, climate.pressure),
    cloud: or(current.cloud_cover, 0),
    precipitation: or(current.precipitation, 0),
    code: Math.round(or(current.weather_code, 0)),
    isDay: or(current.is_day, climate.isDay ? 1 : 0) === 1,
    todayMax:
      first('temperature_2m_max') ?? Math.max(temperature, climate.todayMax),
    todayMin:
      first('temperature_2m_min') ?? Math.min(temperature, climate.todayMin),
    sunrise: (first('sunrise') ?? climate.sunrise / 1000) * 1000,
    sunset: (first('sunset') ?? climate.sunset / 1000) * 1000,
  };
}

/**
 * Manchester's monthly mean temperatures, °C, and half their mean daily
 * range, K (Manchester Airport, the Met Office's 1991-2020 averages,
 * rounded): January first.
 */
const MONTHLY_MEAN = [
  4.4, 4.7, 6.5, 8.9, 12.0, 14.7, 16.6, 16.3, 14.0, 10.6, 7.2, 4.8,
];
const MONTHLY_SWING = [
  2.6, 2.9, 3.4, 4.2, 4.5, 4.5, 4.4, 4.2, 3.9, 3.3, 2.8, 2.5,
];
const DAY_MS = 86_400_000;

/** A table's value for a date, eased between the months' middles. */
function monthly(table: readonly number[], date: Date): number {
  const month = date.getUTCMonth();
  const days = new Date(
    Date.UTC(date.getUTCFullYear(), month + 1, 0),
  ).getUTCDate();
  const f = (date.getUTCDate() - 0.5) / days - 0.5;
  const other = (month + (f < 0 ? 11 : 1)) % 12;
  return table[month] + (table[other] - table[month]) * Math.abs(f);
}

/** Sunrise and sunset at Manchester on a date, Unix ms (a simple solar model, to a few minutes). */
export function sunTimes(now: number): { sunrise: number; sunset: number } {
  const date = new Date(now);
  const midnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const dayOfYear = Math.floor(
    (midnight - Date.UTC(date.getUTCFullYear(), 0, 0)) / DAY_MS,
  );
  const declination =
    ((-23.44 * Math.PI) / 180) *
    Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const lat = (MANCHESTER.latitude * Math.PI) / 180;
  const cosH = Math.max(
    -1,
    Math.min(1, -Math.tan(lat) * Math.tan(declination)),
  );
  const halfDay = (Math.acos(cosH) / Math.PI) * 12; // hours
  const noon = 12 - MANCHESTER.longitude / 15; // UTC hours, solar noon
  return {
    sunrise: midnight + (noon - halfDay) * 3600_000,
    sunset: midnight + (noon + halfDay) * 3600_000,
  };
}

/**
 * The modelled climate at `now` (Unix ms), for when there is no live
 * reading: the month's mean, eased between months, and a daily swing,
 * coolest near dawn and warmest mid-afternoon (a cosine peaking at 15:00
 * UTC); a typical grey, damp westerly day otherwise.
 */
export function estimatedReading(now: number): WeatherReading {
  const date = new Date(now);
  const mean = monthly(MONTHLY_MEAN, date);
  const swing = monthly(MONTHLY_SWING, date);
  const hour = (now % DAY_MS) / 3600_000;
  const temperature = mean + swing * Math.cos(((hour - 15) / 24) * 2 * Math.PI);
  const { sunrise, sunset } = sunTimes(now);
  const round = (v: number) => Math.round(v * 10) / 10;
  return {
    source: 'estimated',
    takenAt: now,
    temperature: round(temperature),
    apparent: round(temperature - 2),
    humidity: 82,
    windSpeed: 15,
    windDirection: 240,
    gusts: 28,
    pressure: 1013,
    cloud: 75,
    precipitation: 0,
    code: 3,
    isDay: now >= sunrise && now < sunset,
    todayMax: round(mean + swing),
    todayMin: round(mean - swing),
    sunrise,
    sunset,
  };
}

/** WMO weather codes' words, as Open-Meteo documents them. */
export function weatherWords(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
}

/** The weather code's kind of icon, for the displays to draw. */
export type WeatherIcon =
  | 'sun'
  | 'moon'
  | 'part-cloud'
  | 'cloud'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'storm';

export function weatherIcon(code: number, isDay: boolean): WeatherIcon {
  if (code <= 1) return isDay ? 'sun' : 'moon';
  if (code === 2) return 'part-cloud';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (code >= 51) return 'rain';
  return 'cloud';
}

/** A compass point for a wind direction (sixteen points). */
export function compassPoint(degrees: number): string {
  const points = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  return points[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

/** HH:MM in UK time, for a Unix-ms time. */
export function ukClock(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  }).format(new Date(ms));
}

/** How old a reading is, said briefly: "4 min", "2 h 10 min". */
export function ageText(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** The world's weather in lines, for the console's `weather`. */
export function weatherLines(
  weather: WeatherState,
  ambient: number,
  now: number,
): string[] {
  const r = weather.reading;
  const lines: string[] = [];
  if (!r)
    lines.push('no reading yet (the world keeps its last outside temperature)');
  else {
    lines.push(
      r.source === 'open-meteo'
        ? `Manchester, ${WEATHER_CREDIT}, observed ${ukClock(r.takenAt)} (${ageText(now - r.takenAt)} ago)`
        : `NO DATA, ESTIMATED: modelled UK climate for ${ukClock(r.takenAt)}`,
      `${r.temperature.toFixed(1)} °C (feels ${r.apparent.toFixed(1)}), ${weatherWords(r.code)}, ${r.isDay ? 'day' : 'night'}`,
      `wind ${r.windSpeed.toFixed(0)} km/h from ${compassPoint(r.windDirection)} (${r.windDirection.toFixed(0)}°), gusts ${r.gusts.toFixed(0)}`,
      `humidity ${r.humidity.toFixed(0)} %, pressure ${r.pressure.toFixed(1)} hPa ${pressureTrend(weather)}, cloud ${r.cloud.toFixed(0)} %, rain ${r.precipitation.toFixed(1)} mm`,
      `today ${r.todayMin.toFixed(1)} to ${r.todayMax.toFixed(1)} °C, sunrise ${ukClock(r.sunrise)}, sunset ${ukClock(r.sunset)}`,
    );
  }
  if (weather.test !== null)
    lines.push(
      `TEST temperature ${weather.test} °C held (weather live to release)`,
    );
  lines.push(`the world's outside temperature now ${ambient.toFixed(2)} °C`);
  return lines;
}
