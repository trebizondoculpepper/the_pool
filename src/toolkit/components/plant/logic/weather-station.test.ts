import { describe, expect, it } from 'vite-plus/test';
import { estimatedReading, parseOpenMeteo } from '../../../../game/weather';
import { newStationUi, stationPress, stationScreen } from './weather-station';

const live = {
  ...estimatedReading(Date.UTC(2026, 10, 2, 1)),
  source: 'open-meteo' as const,
  temperature: 7.2,
  windSpeed: 5.8,
  windDirection: 348,
  pressure: 1038.8,
};

describe('the Calloway WeatherWatch Pro console', () => {
  it('shows the outside temperature, wind and pressure, and flags an estimate', () => {
    const s = stationScreen(live, 'rising', newStationUi());
    expect(s.big).toBe('7.2');
    expect(s.estimated).toBe(false);
    expect(s.fields[0]).toEqual(['WIND', '6 km/h NNW']);
    expect(s.fields[3]).toEqual(['BAR', '1038.8 hPa']);
    expect(
      stationScreen(estimatedReading(0), 'steady', newStationUi()).estimated,
    ).toBe(true);
    expect(stationScreen(null, 'steady', newStationUi()).big).toBe('---.-');
    expect(parseOpenMeteo(null)).toBeNull();
  });

  it('works by its keys: pages, units and lamp', () => {
    let ui = stationPress(newStationUi(), 'units');
    const s = stationScreen(live, 'steady', ui);
    expect(s.big).toBe('45.0');
    expect(s.fields[0][1]).toBe('4 mph NNW');
    ui = stationPress(stationPress(ui, 'page'), 'lamp');
    const more = stationScreen(live, 'steady', ui);
    expect(more.page).toBe('more');
    expect(more.lamp).toBe(true);
    expect(more.fields.map(([k]) => k)).toContain('HI');
  });

  it('keys its picture on what it shows', () => {
    const ui = newStationUi();
    expect(stationScreen(live, 'steady', ui).key).toBe(
      stationScreen({ ...live }, 'steady', ui).key,
    );
    expect(stationScreen(live, 'steady', ui).key).not.toBe(
      stationScreen(live, 'falling', ui).key,
    );
  });
});
