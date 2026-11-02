import { describe, expect, it } from 'vite-plus/test';
import { estimatedReading } from '../../../../game/weather';
import { weatherPage } from './period-pc-weather';

describe('the Gateway 3000’s Open-Meteo page', () => {
  it('says NO DATA with no reading, and ESTIMATED for the climate model', () => {
    expect(weatherPage(null).words).toBe('NO DATA');
    const page = weatherPage(estimatedReading(Date.UTC(2026, 10, 2, 12)));
    expect(page.estimated).toBe(true);
    expect(page.words).toBe('NO DATA, ESTIMATED');
    expect(page.credit).toBe('Weather data by Open-Meteo.com');
  });

  it('keys its picture on the reading alone', () => {
    const r = { ...estimatedReading(0), source: 'open-meteo' as const };
    expect(weatherPage(r).key).toBe(weatherPage({ ...r }).key);
    expect(weatherPage(r).key).not.toBe(weatherPage({ ...r, takenAt: 1 }).key);
    expect(weatherPage(r).rows.map(([k]) => k)).toContain('Gusts');
  });
});
