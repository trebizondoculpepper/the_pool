import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createWeatherStation } from '../../components/plant/views/weather-station';
import { pressureTrend } from '../../../game/weather';
import { roomWorld } from '../../save/world-store';
import { createBoard } from './test-boards';
import type { TestFitting } from './test-boards';

/**
 * The Calloway WeatherWatch Pro console on trial (mission 123), half as
 * big again as life, before the old control room has one: it shows the
 * player's world's weather, Manchester's from Open-Meteo or, offline, the
 * modelled climate's estimate; PAGE, UNITS and LAMP work it.
 */
export function createWeatherStationBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'WEATHER STATION CONSOLE',
    width: 0.34,
    height: 0.25,
    scale: 1.5,
    captionScale: 1.1,
  });
  const weather = () => roomWorld().world.value.weather;
  const station = createWeatherStation(kit, {
    reading: () => weather().reading,
    trend: () => pressureTrend(weather()),
  });
  board.at(station.group, 0, 0.005);
  board.caption(
    'THE WORLD’S READING: MANCHESTER, WEATHER DATA BY OPEN-METEO.COM',
    0,
    -0.1,
    0.0055,
  );
  return {
    group: board.group,
    parts: station.parts,
    update(_seconds, delta) {
      station.update(delta);
    },
    dispose: () => station.dispose(),
  };
}
