import { BoxGeometry, Group, Mesh, PlaneGeometry } from 'three';
import type { BufferGeometry, Material, MeshBasicMaterial } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import { kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { SEGMENTS, segmentStroke, starburst } from '../logic/starburst-font';
import type { Segment } from '../logic/starburst-font';
import type { TextDisplay } from './panel-instruments';

/**
 * A 14-segment ("starburst") vacuum fluorescent display (mission 143,
 * `doc/research/starburst-vfd.md`), after the early-1980s alphanumeric
 * fluorescent indicator panels of Futaba, NEC and Ise: `rows` lines of
 * `columns` characters, each drawn segment by segment from the starburst
 * set (`../logic/starburst-font.ts`). A sibling of `createVfd`.
 *
 * Its phosphor's cyan-green, each lit segment a separate rounded bar with
 * a soft glow drawn under it; every unlit segment of every character a
 * faint grey-green ghost; a fine grid mesh over each character. The
 * segments lie a few millimetres behind tinted glass, with the hair-thin
 * filaments across the whole width between them, so they shift against
 * each other as the eye moves. At power-on every segment lights for a
 * moment, as the period's controllers did on reset; off, it is dark glass.
 *
 * Its canvas is drawn and uploaded only when its text, power, brightness
 * or the power-on test changes, and is a `vfd` display (`display-reach.ts`).
 */

/** The power-on test's length, s: every segment lit. */
export const STARBURST_LAMP_TEST = 0.8;

export interface StarburstVfd extends TextDisplay {
  /** Its brightness, as its controller dims it: 0.25 to 1. */
  setBrightness(level: number): void;
  /** Time passing: ends the power-on test. */
  update(delta: number): void;
}

const PHOSPHOR = '#5effc8';
const GHOST = '#0e2520';
const BACK = '#050d0b';
const DARK = '#030605';

const add = (
  parent: Group,
  geometry: BufferGeometry,
  material: Material,
  x: number,
  y: number,
  z: number,
) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

export function createStarburstVfd(
  kit: PanelKit,
  {
    columns = 20,
    rows = 2,
    /** A character's height, m: 5 mm, as the period's 2 × 20 glass. */
    charHeight = 0.005,
    /** The bezel's paint. */
    bezel = '#141516',
  } = {},
): StarburstVfd {
  const group = new Group();
  // The character cell in metres: 0.56 of its height wide, at a pitch of
  // 1.45 widths, its rows 1.5 heights apart; a 2.5 mm margin round them.
  const cw = charHeight * 0.56;
  const pitch = cw * 1.45;
  const rowPitch = charHeight * 1.5;
  const margin = 0.0025;
  const width = columns * pitch + 2 * margin;
  const height = (rows - 1) * rowPitch + charHeight + 2 * margin;

  // The canvas, 8 pixels to the millimetre.
  const ppm = 8000;
  const W = Math.round(width * ppm);
  const H = Math.round(height * ppm);
  const art = createCanvasTexture(W, H, 'vfd');
  kit.textures.push(art.texture);
  const px = (m: number) => m * ppm;
  const slant = 0.12;
  const stroke = px(charHeight) * 0.085;
  // A segment's ends in canvas pixels, for character `k` of row `r`.
  const cell = (k: number, r: number) => ({
    x: px(margin + k * pitch + (pitch - cw) / 2),
    y: px(margin + r * rowPitch),
    w: px(cw),
    h: px(charHeight),
  });
  const trace = (
    c: CanvasRenderingContext2D,
    k: number,
    r: number,
    segments: Iterable<Segment>,
  ) => {
    const { x, y, w, h } = cell(k, r);
    const at = (u: number, v: number): [number, number] => [
      x + u * w + slant * (1 - v) * h * 0.5,
      y + v * h,
    ];
    for (const s of segments) {
      const [u0, v0, u1, v1] = segmentStroke(s);
      // The point a short stroke, which a round cap makes a dot.
      const [a, b] = at(u0 - (s === 'DP' ? 0.02 : 0), v0);
      const [e, f] = at(u1 + (s === 'DP' ? 0.02 : 0), v1);
      c.moveTo(a, b);
      c.lineTo(e, f);
    }
  };

  // What never changes, drawn once: the anode plate with every segment's
  // ghost, and the grid mesh over each character.
  const layer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    return { canvas, c: canvas.getContext('2d')! };
  };
  const base = layer();
  {
    const { c } = base;
    c.fillStyle = BACK;
    c.fillRect(0, 0, W, H);
    c.lineCap = 'round';
    c.lineWidth = stroke;
    c.strokeStyle = GHOST;
    c.beginPath();
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < columns; k++) trace(c, k, r, SEGMENTS);
    c.stroke();
  }
  const mesh = layer();
  {
    const { c } = mesh;
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    c.lineWidth = 0.6;
    c.beginPath();
    const step = 2.5;
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < columns; k++) {
        const { x, y, w, h } = cell(k, r);
        const x0 = x - w * 0.12;
        const x1 = x + w * 1.32 + slant * h * 0.5;
        const y0 = y - h * 0.12;
        const y1 = y + h * 1.12;
        for (let gx = x0; gx <= x1; gx += step) {
          c.moveTo(gx, y0);
          c.lineTo(gx, y1);
        }
        for (let gy = y0; gy <= y1; gy += step) {
          c.moveTo(x0, gy);
          c.lineTo(x1, gy);
        }
      }
    c.stroke();
    // Each character's grid in its own frame.
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < columns; k++) {
        const { x, y, w, h } = cell(k, r);
        c.rect(
          x - w * 0.12,
          y - h * 0.12,
          w * 1.44 + slant * h * 0.5,
          h * 1.24,
        );
      }
    c.stroke();
  }

  // The housing: a bezel round a recess 4 mm deep, the anode plate at its
  // back, the filaments 2 mm in front of it, the glass at the front.
  const depth = 0.006;
  const rim = 0.004;
  const frame = kitPaint(kit, bezel);
  const sides: [number, number, number, number][] = [
    [width + 2 * rim, rim, 0, (height + rim) / 2],
    [width + 2 * rim, rim, 0, -(height + rim) / 2],
    [rim, height, -(width + rim) / 2, 0],
    [rim, height, (width + rim) / 2, 0],
  ];
  for (const [w, h, x, y] of sides)
    add(group, new BoxGeometry(w, h, depth), frame, x, y, depth / 2);
  const face = createPs1Material(
    { map: art.texture },
    true,
    true,
  ) as MeshBasicMaterial;
  kit.materials.push(face);
  const plateZ = 0.0015;
  add(group, new PlaneGeometry(width, height), face, 0, 0, plateZ);
  // The filaments: two hair-thin tungsten wires to a row, running the
  // whole width, a touch off level, held taut by springs at either end.
  const wire = createPs1Material({ color: '#2b2622' }, true);
  kit.materials.push(wire);
  for (let r = 0; r < rows; r++)
    for (const v of [0.3, 0.72]) {
      const y = height / 2 - margin - r * rowPitch - v * charHeight;
      const filament = add(
        group,
        new BoxGeometry(width, 0.00011, 0.00011),
        wire,
        0,
        y,
        plateZ + 0.002,
      );
      filament.rotation.z = (v < 0.5 ? 1 : -1) * 0.0025;
    }
  const glass = createPs1Material({
    color: '#3f6e64',
    transparent: true,
    opacity: 0.12,
    roughness: 0.08,
    metalness: 0,
  });
  glass.depthWrite = false;
  kit.materials.push(glass);
  add(group, new PlaneGeometry(width, height), glass, 0, 0, depth - 0.0004);

  let lines: string[] = [];
  let on = false;
  let level = 1;
  let test = 0;
  let last = '';
  const draw = () => {
    const testing = on && test > 0;
    const key = `${on}|${testing}|${level}|${testing ? '' : lines.join('|')}`;
    if (key === last) return;
    last = key;
    const c = art.context;
    if (!on) {
      c.fillStyle = DARK;
      c.fillRect(0, 0, W, H);
      art.texture.needsUpdate = true;
      return;
    }
    c.drawImage(base.canvas, 0, 0);
    c.lineCap = 'round';
    c.beginPath();
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < columns; k++) {
        const lit = testing
          ? SEGMENTS
          : (starburst(lines[r]?.[k] ?? ' ') ?? new Set<Segment>());
        trace(c, k, r, lit);
      }
    // The glow under each stroke, the stroke, and its hot core.
    c.globalAlpha = 0.2 * level;
    c.strokeStyle = PHOSPHOR;
    c.lineWidth = stroke * 2.4;
    c.stroke();
    c.globalAlpha = 0.35 + 0.65 * level;
    c.lineWidth = stroke;
    c.stroke();
    c.globalAlpha = 0.6 * level;
    c.strokeStyle = '#d6fff0';
    c.lineWidth = stroke * 0.35;
    c.stroke();
    c.globalAlpha = 1;
    c.drawImage(mesh.canvas, 0, 0);
    art.texture.needsUpdate = true;
  };
  draw();
  return {
    group,
    show(next, power = true) {
      if (power && !on) test = STARBURST_LAMP_TEST;
      on = power;
      lines = next;
      draw();
    },
    setBrightness(next) {
      level = Math.max(0.25, Math.min(1, next));
      draw();
    },
    update(delta) {
      if (test <= 0) return;
      test -= delta;
      if (test <= 0) draw();
    },
  };
}
