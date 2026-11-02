import { describe, expect, it } from 'vite-plus/test';
import {
  STALE_AFTER_MS,
  compassPoint,
  easeAmbient,
  estimatedReading,
  newWeather,
  parseOpenMeteo,
  pressureTrend,
  readingStale,
  takeReading,
  weatherIcon,
  weatherWords,
} from './weather';
import { advance, applyAction, newWorld } from './world';
import { AMBIENT } from './plant/thermal';

// Open-Meteo's answer for Manchester, 2026-11-02, as `OPEN_METEO_URL` asks it.
const SAMPLE = {
  utc_offset_seconds: 0,
  current: {
    time: 1793582100,
    interval: 900,
    temperature_2m: 7.2,
    apparent_temperature: 5.0,
    relative_humidity_2m: 83,
    wind_speed_10m: 5.8,
    wind_direction_10m: 348,
    wind_gusts_10m: 12.6,
    pressure_msl: 1038.8,
    cloud_cover: 0,
    precipitation: 0.0,
    weather_code: 0,
    is_day: 0,
  },
  daily: {
    time: [1793577600],
    temperature_2m_max: [11.7],
    temperature_2m_min: [5.6],
    sunrise: [1793603382],
    sunset: [1793637273],
  },
};

describe('the weather', () => {
  it('reads Open-Meteo’s answer', () => {
    const r = parseOpenMeteo(SAMPLE);
    expect(r).toMatchObject({
      source: 'open-meteo',
      takenAt: 1793582100_000,
      temperature: 7.2,
      apparent: 5,
      humidity: 83,
      windDirection: 348,
      gusts: 12.6,
      pressure: 1038.8,
      code: 0,
      isDay: false,
      todayMax: 11.7,
      todayMin: 5.6,
      sunrise: 1793603382_000,
    });
    expect(parseOpenMeteo({ error: true, reason: 'x' })).toBeNull();
    expect(parseOpenMeteo(null)).toBeNull();
  });

  it('models a UK climate for the date: cold winter dawns, warm summer afternoons', () => {
    const janDawn = estimatedReading(Date.UTC(2026, 0, 15, 6));
    const julAfternoon = estimatedReading(Date.UTC(2026, 6, 15, 15));
    expect(janDawn.source).toBe('estimated');
    expect(janDawn.temperature).toBeGreaterThan(-1);
    expect(janDawn.temperature).toBeLessThan(4);
    expect(julAfternoon.temperature).toBeGreaterThan(19);
    expect(julAfternoon.temperature).toBeLessThan(23);
    expect(janDawn.isDay).toBe(false);
    expect(julAfternoon.isDay).toBe(true);
    // Midsummer's day is far longer than midwinter's.
    const day = (r: { sunrise: number; sunset: number }) =>
      (r.sunset - r.sunrise) / 3600_000;
    expect(day(estimatedReading(Date.UTC(2026, 5, 21, 12)))).toBeGreaterThan(
      16,
    );
    expect(day(estimatedReading(Date.UTC(2026, 11, 21, 12)))).toBeLessThan(8);
  });

  it('calls a reading stale when estimated or too old', () => {
    const r = parseOpenMeteo(SAMPLE)!;
    expect(readingStale(r, r.takenAt + 60_000)).toBe(false);
    expect(readingStale(r, r.takenAt + STALE_AFTER_MS + 1)).toBe(true);
    expect(readingStale(estimatedReading(r.takenAt), r.takenAt)).toBe(true);
    expect(readingStale(null, 0)).toBe(true);
  });

  it('eases toward its target, never stepping', () => {
    expect(easeAmbient(12, null, 60)).toBe(12);
    const a = easeAmbient(12, 2, 60);
    expect(a).toBeLessThan(12);
    expect(a).toBeGreaterThan(10.5);
    let t = 12;
    for (let i = 0; i < 3600; i++) t = easeAmbient(t, 2, 1);
    expect(t).toBeCloseTo(2, 1);
  });

  it('tracks the pressure’s trend between readings', () => {
    const r = parseOpenMeteo(SAMPLE)!;
    let w = takeReading(newWeather(), { ...r, pressure: 1030 });
    expect(pressureTrend(w)).toBe('steady');
    w = takeReading(w, { ...r, takenAt: r.takenAt + 900_000 });
    expect(pressureTrend(w)).toBe('rising');
    expect(takeReading(w, w.reading!)).toBe(w);
  });

  it('names its codes and directions', () => {
    expect(weatherWords(0)).toBe('Clear sky');
    expect(weatherWords(63)).toBe('Rain');
    expect(weatherIcon(0, false)).toBe('moon');
    expect(weatherIcon(95, true)).toBe('storm');
    expect(compassPoint(348)).toBe('NNW');
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(225)).toBe('SW');
  });

  it('draws the world’s outside temperature toward a reading, and a test one over it', () => {
    let w = newWorld();
    expect(w.ambient).toBe(AMBIENT);
    w = applyAction(w, {
      type: 'weather/reading',
      reading: parseOpenMeteo(SAMPLE)!,
    });
    expect(w.weather.reading?.temperature).toBe(7.2);
    w = advance(w, 60);
    expect(w.ambient).toBeLessThan(AMBIENT);
    expect(w.ambient).toBeGreaterThan(11);
    w = applyAction(w, { type: 'weather/test', celsius: -3 });
    const before = w.ambient;
    w = advance(w, 30);
    expect(w.ambient).toBeLessThan(before - 0.5);
    w = applyAction(w, { type: 'weather/test', celsius: null });
    expect(w.weather.test).toBeNull();
  });

  it('leaves weather/ambient’s setting alone with no reading', () => {
    let w = applyAction(newWorld(), { type: 'weather/ambient', celsius: 3 });
    w = advance(w, 30);
    expect(w.ambient).toBe(3);
  });
});
