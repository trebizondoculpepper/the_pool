import { Group } from 'three';
import { Banner, Frame, Readout, Stack } from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { createTouchSurface } from '../../components/industrial-control/views/touch-surface';
import { OUTSIDE_WEATHER, outsideView } from '../logic/outside-weather';
import type { LiveExhibit } from '../rooms/plant/exhibit';
import type { LivePage, PageLive } from './olympic-filter-washing';

/**
 * OUTSIDE CONDITIONS as a `ui2d` page (mission 123): the outside
 * temperature large, the conditions, wind, gusts, humidity, pressure and
 * its trend, the heat load they drive, and the reading's source and time
 * (Manchester's, credited to Open-Meteo, or NO DATA, ESTIMATED). Shown
 * only; its readouts change only when what they show does.
 */
export function outsideWeatherPage(_live: PageLive): LivePage {
  const banner = new Banner({ size: 26 });
  const outside = new Readout('OUTSIDE', '°C', {
    colour: 'anakiwa',
    grow: 1.5,
  });
  const reading = new Readout('READING', '°C', { colour: 'blue-bell' });
  const conditions = new Readout('CONDITIONS', '', {
    colour: 'golden-tanoi',
    grow: 2,
  });
  const wind = new Readout('WIND', 'km/h', { colour: 'lilac' });
  const gusts = new Readout('GUSTS', 'km/h', { colour: 'lilac' });
  const humidity = new Readout('HUMIDITY', '%', { colour: 'blue-bell' });
  const pressure = new Readout('PRESSURE', 'hPa', { colour: 'anakiwa' });
  const trend = new Readout('TREND', '', { colour: 'anakiwa' });
  const load = new Readout('HEAT LOAD', 'kW', {
    colour: 'orange-peel',
    grow: 1.5,
  });
  const node = new Stack(
    'column',
    [
      banner,
      new Stack('row', [outside, reading, load], { size: 72, gap: 10 }),
      new Stack('row', [conditions, trend], { size: 44, gap: 10 }),
      new Stack('row', [wind, gusts, humidity, pressure], {
        size: 44,
        gap: 10,
      }),
    ],
    { gap: 6 },
  );
  return {
    id: OUTSIDE_WEATHER.id,
    name: OUTSIDE_WEATHER.short,
    node,
    read(world) {
      const v = outsideView(world);
      banner.set(v.source, false, v.estimated ? 'alert' : 'anakiwa');
      outside.set(v.ambient);
      reading.set(v.reading);
      conditions.set(v.conditions, v.estimated);
      wind.set(v.wind);
      gusts.set(v.gusts);
      humidity.set(v.humidity);
      pressure.set(v.pressure);
      trend.set(v.trend);
      load.set(v.heatLoad);
    },
  };
}

/** The panel's glass, m. */
export const OUTSIDE_PANEL = { w: 1.2, h: 0.9 };

/** OUTSIDE CONDITIONS on a touch surface of its own, its glass `size` about its middle facing +z. */
export function createOutsideWeatherPanel(
  kit: PanelKit,
  live: PageLive,
  size = OUTSIDE_PANEL,
): LiveExhibit {
  const page = outsideWeatherPage(live);
  const tree = new Frame({
    title: OUTSIDE_WEATHER.title,
    code: OUTSIDE_WEATHER.code,
    footer: '',
    colour: 'anakiwa',
    sidebar: [],
    content: page.node,
  });
  const surface = createTouchSurface(kit, {
    name: `${OUTSIDE_WEATHER.title} touch panel`,
    bezel: 0.012,
    screens: [
      {
        rect: { x: 0, y: 0, w: size.w, h: size.h },
        tree,
        pixelsPerMetre: 560,
      },
    ],
  });
  const parts = createPartSet();
  parts.add(surface.part);
  const object = new Group();
  surface.group.position.z = 0.02;
  object.add(surface.group);
  let seconds = 0;
  let nextRead = 0;
  const run = (delta: number) => {
    seconds += delta;
    const w = live.world();
    if (w && (seconds >= nextRead || delta === 0)) {
      nextRead = seconds + 1;
      page.read(w, delta);
    }
  };
  run(0);
  return {
    object,
    parts,
    update(delta) {
      run(delta);
      parts.update(delta);
    },
    status: () => {
      const w = live.world();
      if (!w) return OUTSIDE_WEATHER.title;
      const v = outsideView(w);
      return `${OUTSIDE_WEATHER.title}: ${v.ambient} °C, ${v.conditions}`;
    },
  };
}
