import { Group, Mesh, PlaneGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitGlow } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createCanvasTexture } from '../../core/views/screens';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createPartSet } from '../../core/parts/parts';
import type { PartSet } from '../../core/parts/parts';
import { membraneKey } from '../../core/parts/small-parts';
import { describe } from './describe';
import type { WeatherReading } from '../../../../game/weather';
import {
  newStationUi,
  stationPress,
  stationScreen,
} from '../logic/weather-station';
import type {
  StationKey,
  StationScreen,
  StationUi,
} from '../logic/weather-station';

/**
 * The Calloway WeatherWatch Pro console (mission 123): a 2000s weather
 * station console after the Davis Vantage Pro2's, 270 × 160 × 40 mm, in a
 * light grey case, its sensors (in the fiction) on the roof. A segment-
 * style monochrome LCD (temperature large, a compass rose with the wind's
 * arrow, wind, gusts, humidity, barometer with its trend, rain, the time
 * of the reading; a second page of feels-like, today's high and low, cloud
 * and the sun's times), worked by its own PAGE, UNITS and LAMP keys.
 * Without sensor data it says so: NO DATA, ESTIMATED.
 *
 * It holds none of the world: `reading` gives it the world's reading and
 * `trend` the barometer's trend each frame (the same object until the
 * world takes a new one). The LCD is drawn only when what it shows
 * changes, compared before any drawing.
 */
export interface WeatherStationControl {
  reading(): WeatherReading | null;
  trend(): 'rising' | 'falling' | 'steady';
}

export const STATION_SIZE = { w: 0.27, h: 0.16, d: 0.04 };

const LCD_W = 320;
const LCD_H = 192;
const SEG = '#1c2420';
const FIELD = '#a9b59c';
const LIT = '#bfe3c4';

export function createWeatherStation(
  kit: PanelKit,
  control: WeatherStationControl,
) {
  const t = tools(kit);
  const group = new Group();
  const parts: PartSet = createPartSet();
  const { w, h, d } = STATION_SIZE;
  const unit = describe(
    new Group(),
    'Calloway WeatherWatch Pro weather station console',
    () => status(),
  );
  group.add(unit);
  const shell = new Mesh(
    new RoundedBoxGeometry(w, h, d, 3, 0.012),
    t.paint('#cfd2cc', 0.55),
  );
  shell.position.z = d / 2;
  unit.add(shell);
  const front = d + 0.0005;
  // The blue band across its top, with the maker's name.
  t.box(
    unit,
    t.paint('#1d5c9e', 0.5),
    w - 0.02,
    0.022,
    0.001,
    0,
    h / 2 - 0.018,
    front,
  );
  const badge = createBrandBadge(kit, 'calloway', {
    height: 0.011,
    ink: '#f3efe6',
  });
  badge.position.set(-w / 2 + 0.05, h / 2 - 0.018, front + 0.001);
  unit.add(badge);
  t.label(
    unit,
    'WeatherWatch Pro',
    w / 2 - 0.055,
    h / 2 - 0.018,
    front + 0.001,
    0.0065,
    '#f6c04a',
  );

  // The LCD, behind its bezel.
  const lcdW = 0.165;
  const lcdH = (lcdW * LCD_H) / LCD_W;
  const lcdX = -w / 2 + 0.012 + lcdW / 2 + 0.004;
  const lcdY = -0.01;
  t.box(
    unit,
    t.paint('#3b4044', 0.4),
    lcdW + 0.01,
    lcdH + 0.01,
    0.002,
    lcdX,
    lcdY,
    front,
  );
  const art = createCanvasTexture(LCD_W, LCD_H, 'lcd', { maxHz: 4 });
  kit.textures.push(art.texture);
  const glass = kitGlow(kit, '#ffffff');
  glass.map = art.texture;
  const screen = new Mesh(new PlaneGeometry(lcdW, lcdH), glass);
  screen.position.set(lcdX, lcdY, front + 0.0022);
  screen.userData.live = true;
  unit.add(screen);

  // Its keys, right of the LCD.
  let ui = newStationUi();
  const keys: [string, StationKey, string][] = [
    ['PAGE', 'page', '#7f97b3'],
    ['UNITS', 'units', '#7f97b3'],
    ['LAMP', 'lamp', '#f2b51f'],
  ];
  const keysX = w / 2 - 0.038;
  keys.forEach(([legend, k, colour], i) => {
    const key = parts.add(
      membraneKey(kit, {
        legend,
        colour,
        ink: '#1b1b1b',
        name: `WeatherWatch ${legend} key`,
        action: () => {
          ui = stationPress(ui, k);
        },
      }),
    );
    key.object.position.set(keysX, 0.025 - i * 0.034, front);
    key.object.scale.setScalar(1.1);
    unit.add(key.object);
  });

  const c = art.context;
  const paint = (s: StationScreen) => {
    const W = LCD_W;
    const H = LCD_H;
    c.fillStyle = s.lamp ? LIT : FIELD;
    c.fillRect(0, 0, W, H);
    c.fillStyle = SEG;
    c.strokeStyle = SEG;
    c.textBaseline = 'alphabetic';
    // The compass rose, top left, its arrow from where the wind blows.
    const cx = 52;
    const cy = 56;
    const r = 38;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();
    c.font = 'bold 12px monospace';
    c.textAlign = 'center';
    c.fillText('N', cx, cy - r + 13);
    c.fillText('S', cx, cy + r - 4);
    c.fillText('E', cx + r - 8, cy + 4);
    c.fillText('W', cx - r + 8, cy + 4);
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      c.beginPath();
      c.moveTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
      c.lineTo(cx + Math.sin(a) * (r - 5), cy - Math.cos(a) * (r - 5));
      c.stroke();
    }
    if (s.windFrom !== null) {
      const a = (s.windFrom * Math.PI) / 180;
      // A wedge on the rim at the wind's quarter, pointing in.
      c.beginPath();
      c.moveTo(cx + Math.sin(a) * (r + 2), cy - Math.cos(a) * (r + 2));
      c.lineTo(
        cx + Math.sin(a + 0.25) * (r - 14),
        cy - Math.cos(a + 0.25) * (r - 14),
      );
      c.lineTo(
        cx + Math.sin(a - 0.25) * (r - 14),
        cy - Math.cos(a - 0.25) * (r - 14),
      );
      c.closePath();
      c.fill();
    }
    // The big figure.
    c.textAlign = 'right';
    c.font = 'bold 54px monospace';
    c.fillText(s.big, 262, 66);
    c.font = 'bold 18px monospace';
    c.textAlign = 'left';
    c.fillText(s.bigUnit, 266, 48);
    c.font = 'bold 11px monospace';
    c.fillText(s.page === 'main' ? 'OUTSIDE' : 'FEELS LIKE', 112, 20);
    // The barometer's trend arrow, top right.
    c.lineWidth = 3;
    c.beginPath();
    const tx = 296;
    const ty = 80;
    if (s.trend === 'steady') {
      c.moveTo(tx - 12, ty);
      c.lineTo(tx + 10, ty);
      c.moveTo(tx + 4, ty - 5);
      c.lineTo(tx + 10, ty);
      c.lineTo(tx + 4, ty + 5);
    } else {
      const up = s.trend === 'rising' ? -1 : 1;
      c.moveTo(tx - 10, ty - up * 7);
      c.lineTo(tx + 8, ty + up * 7);
      c.moveTo(tx + 1, ty + up * 8);
      c.lineTo(tx + 8, ty + up * 7);
      c.lineTo(tx + 7, ty);
    }
    c.stroke();
    // The fields, two columns.
    c.textAlign = 'left';
    s.fields.forEach(([k, v], i) => {
      const col = i < 3 ? 0 : 1;
      const row = i < 3 ? i : i - 3;
      const x = 10 + col * 160;
      const y = 122 + row * 22;
      c.font = 'bold 11px monospace';
      c.fillText(k, x, y);
      c.font = 'bold 16px monospace';
      c.fillText(v, x + 44, y, 112);
    });
    // The time of the reading, and the estimate's flag.
    c.font = 'bold 13px monospace';
    c.textAlign = 'right';
    c.fillText(s.time, W - 8, H - 8);
    if (s.estimated) {
      c.textAlign = 'left';
      c.fillText('NO DATA, ESTIMATED', 170, H - 30);
    }
    art.texture.needsUpdate = true;
  };

  let shownKey = '';
  let lastReading: WeatherReading | null | undefined;
  let lastTrend = '';
  let lastUi = ui;
  const status = () => {
    const r = control.reading();
    if (!r) return 'no data';
    return `${r.temperature.toFixed(1)} °C, wind ${r.windSpeed.toFixed(0)} km/h; ${r.source === 'open-meteo' ? 'sensors reading' : 'NO DATA, ESTIMATED'}`;
  };
  const update = (delta: number) => {
    parts.update(delta);
    const reading = control.reading();
    const trend = control.trend();
    // Compared before any drawing: the same reading, trend and keys
    // cannot show anything new.
    if (reading === lastReading && trend === lastTrend && ui === lastUi) return;
    lastReading = reading;
    lastTrend = trend;
    lastUi = ui;
    const s = stationScreen(reading, trend, ui);
    if (s.key === shownKey) return;
    shownKey = s.key;
    paint(s);
  };
  return {
    group,
    parts,
    update,
    status,
    /**
     * Set what its own keys would (page, units, backlight), as the magic
     * room's panel does (mission 130): a look, not a press.
     */
    show(next: Partial<StationUi>) {
      ui = { ...ui, ...next };
    },
    dispose() {
      parts.dispose();
    },
  };
}
