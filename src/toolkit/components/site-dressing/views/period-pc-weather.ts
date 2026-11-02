import type { WeatherIcon } from '../../../../game/weather';
import type { WeatherPage } from '../logic/period-pc-weather';

const SANS = 'Arial, Helvetica, sans-serif';
const SERIF = '"Times New Roman", Times, serif';

/** A weather code's icon, drawn in `s` pixels with its top left at (x, y). */
export function drawWeatherIcon(
  c: CanvasRenderingContext2D,
  icon: WeatherIcon,
  x: number,
  y: number,
  s: number,
) {
  const sun = (cx: number, cy: number, r: number) => {
    c.fillStyle = '#f5c518';
    c.strokeStyle = '#f5a000';
    c.lineWidth = Math.max(1, s * 0.03);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3);
      c.lineTo(cx + Math.cos(a) * r * 1.7, cy + Math.sin(a) * r * 1.7);
      c.stroke();
    }
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
  };
  const cloud = (cx: number, cy: number, w: number, colour: string) => {
    c.fillStyle = colour;
    c.beginPath();
    c.arc(cx - w * 0.25, cy, w * 0.22, 0, Math.PI * 2);
    c.arc(cx + w * 0.05, cy - w * 0.12, w * 0.28, 0, Math.PI * 2);
    c.arc(cx + w * 0.3, cy + w * 0.02, w * 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillRect(cx - w * 0.25, cy, w * 0.55, w * 0.22);
  };
  const drops = (colour: string, flakes = false) => {
    c.fillStyle = colour;
    c.strokeStyle = colour;
    for (let i = 0; i < 3; i++) {
      const dx = x + s * (0.3 + i * 0.2);
      const dy = y + s * 0.8;
      if (flakes) c.fillText('*', dx, dy + s * 0.12);
      else {
        c.beginPath();
        c.moveTo(dx, dy);
        c.lineTo(dx - s * 0.05, dy + s * 0.14);
        c.lineWidth = Math.max(1, s * 0.04);
        c.stroke();
      }
    }
  };
  if (icon === 'sun') sun(x + s / 2, y + s / 2, s * 0.22);
  else if (icon === 'moon') {
    c.fillStyle = '#e8e4c0';
    c.beginPath();
    c.arc(x + s / 2, y + s / 2, s * 0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x + s * 0.62, y + s * 0.4, s * 0.26, 0, Math.PI * 2);
    c.fill();
  } else if (icon === 'part-cloud') {
    sun(x + s * 0.38, y + s * 0.36, s * 0.16);
    cloud(x + s * 0.55, y + s * 0.58, s * 0.6, '#b8bcc4');
  } else if (icon === 'fog') {
    c.fillStyle = '#9aa0a8';
    for (let i = 0; i < 4; i++)
      c.fillRect(x + s * 0.12, y + s * (0.3 + i * 0.13), s * 0.76, s * 0.06);
  } else {
    cloud(
      x + s * 0.48,
      y + s * 0.45,
      s * 0.72,
      icon === 'storm' ? '#5d6470' : '#9aa0a8',
    );
    if (icon === 'rain') drops('#2a6ad8');
    if (icon === 'snow') {
      c.font = `bold ${Math.round(s * 0.28)}px ${SANS}`;
      drops('#4a6a9a', true);
    }
    if (icon === 'storm') {
      c.fillStyle = '#f5c518';
      c.beginPath();
      c.moveTo(x + s * 0.52, y + s * 0.62);
      c.lineTo(x + s * 0.4, y + s * 0.86);
      c.lineTo(x + s * 0.5, y + s * 0.84);
      c.lineTo(x + s * 0.44, y + s * 1.0);
      c.lineTo(x + s * 0.62, y + s * 0.76);
      c.lineTo(x + s * 0.52, y + s * 0.78);
      c.fill();
    }
  }
}

/**
 * The Open-Meteo page in the period browser's window: grey chrome, a
 * title bar, an address bar, and a plain page of a late-nineties site:
 * Manchester's temperature large with its icon and words, a table of the
 * rest, the time of the reading and the credit.
 */
export function drawWeatherWindow(
  c: CanvasRenderingContext2D,
  W: number,
  H: number,
  page: WeatherPage,
) {
  const wx = W * 0.2;
  const wy = H * 0.05;
  const ww = W * 0.76;
  const wh = H * 0.84;
  c.fillStyle = '#c0c0c0';
  c.fillRect(wx, wy, ww, wh);
  c.fillStyle = '#000080';
  c.fillRect(wx + 3, wy + 3, ww - 6, H * 0.05);
  c.fillStyle = '#ffffff';
  c.textAlign = 'left';
  c.font = `bold ${Math.round(H * 0.032)}px ${SANS}`;
  c.fillText('Open-Meteo - Navigator 4', wx + 8, wy + H * 0.04);
  // The address bar.
  c.fillStyle = '#000000';
  c.font = `${Math.round(H * 0.026)}px ${SANS}`;
  c.fillText('Location:', wx + 8, wy + H * 0.095);
  c.fillStyle = '#ffffff';
  c.fillRect(wx + W * 0.1, wy + H * 0.07, ww - W * 0.12, H * 0.036);
  c.fillStyle = '#000000';
  c.fillText(
    'http://open-meteo.com/manchester',
    wx + W * 0.105,
    wy + H * 0.096,
  );
  // The page.
  const px = wx + 8;
  const py = wy + H * 0.12;
  const pw = ww - 16;
  const ph = wh - H * 0.13;
  c.fillStyle = '#ffffff';
  c.fillRect(px, py, pw, ph);
  c.fillStyle = '#003399';
  c.font = `bold ${Math.round(H * 0.045)}px ${SERIF}`;
  c.fillText(page.headline, px + pw * 0.04, py + H * 0.06);
  drawWeatherIcon(c, page.icon, px + pw * 0.04, py + H * 0.08, H * 0.17);
  c.fillStyle = page.estimated ? '#b00000' : '#000000';
  c.font = `bold ${Math.round(H * 0.1)}px ${SANS}`;
  c.fillText(page.temperature, px + pw * 0.3, py + H * 0.19);
  c.font = `${Math.round(H * 0.036)}px ${SANS}`;
  c.fillText(page.words, px + pw * 0.3, py + H * 0.24);
  c.fillStyle = '#000000';
  c.font = `${Math.round(H * 0.028)}px ${SANS}`;
  const rowH = H * 0.036;
  page.rows.forEach(([k, v], i) => {
    const col = i < 5 ? 0 : 1;
    const row = i < 5 ? i : i - 5;
    const x = px + pw * (0.04 + col * 0.48);
    const y = py + H * 0.31 + row * rowH;
    c.fillStyle = '#000000';
    c.fillText(k, x, y);
    c.font = `bold ${Math.round(H * 0.028)}px ${SANS}`;
    c.fillText(v, x + pw * 0.2, y, pw * 0.27);
    c.font = `${Math.round(H * 0.028)}px ${SANS}`;
  });
  c.fillStyle = '#555555';
  c.font = `italic ${Math.round(H * 0.026)}px ${SERIF}`;
  c.fillText(page.observed, px + pw * 0.04, py + ph - H * 0.06);
  c.fillStyle = '#0000ee';
  c.font = `${Math.round(H * 0.026)}px ${SANS}`;
  c.fillText(page.credit, px + pw * 0.04, py + ph - H * 0.025);
  c.fillRect(
    px + pw * 0.04,
    py + ph - H * 0.02,
    c.measureText(page.credit).width,
    1,
  );
}
