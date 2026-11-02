import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  Vector3,
} from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { createDotMatrixPrinter } from '../logic/dot-matrix-printer';
import type { PrinterLamps } from '../logic/dot-matrix-printer';
import { designate } from '../logic/machine-parts';
import { createPs1Material } from '../../core/parts/ps1-material';
import {
  createMicroLabel,
  createPanelKit,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * The Gateway 3000 MightyPrint 80: a 9-pin, 80-column dot-matrix printer
 * of the early 1980s, after the Epson FX-80 (1983), at its true size,
 * 420 × 347 × 100 mm (figures and sources in
 * `doc/research/mightyprint-80.md`), in metres, its feet at y = 0, its
 * front to +z. A low putty-beige case; a smoked lid over the platen,
 * through which the print head is seen shuttling along its rail; the
 * paper bail and the smoked paper separator behind; the platen knob on the
 * right side, the power switch on the left; and on the top at the front
 * right its panel: POWER, READY, PAPER OUT and ON LINE lamps, and the ON
 * LINE, FORM FEED and LINE FEED buttons. Its behaviour is
 * `logic/dot-matrix-printer.ts`; the buttons and switch are worked
 * through `parts/mightyprint.ts`.
 *
 * Its paper is the fanfold the old teleprinter printed on, kept for the
 * owner: 9½-inch stock with sprocket holes in its tear-off strips, fed from
 * a box below, up behind the printer into its pin feeders, round the
 * platen, out of the top over the separator, and down behind to a pile on
 * the floor that settles as each line feeds (or, `drape: 'front'`, over the
 * lid to a pile in front, where a wall is behind it). The printed face is
 * a ring of paper two forms long, each line drawn once as it is printed,
 * scrolled as the paper feeds.
 */

/** The case's putty beige, its darker trim, and the smoked plastic. */
const BEIGE = '#d6ccb0';
const BEIGE_DARK = '#bdb196';
const TRIM = '#5b4a3d';
const SMOKE = '#3a2b22';

/** The case, metres. */
export const MIGHTYPRINT_SIZE = { w: 0.42, d: 0.347, h: 0.1 } as const;

/** The fanfold stock: 9½ inches wide, folded every 11. */
const PAPER_W = 9.5 * 0.0254;
const FORM = 11 * 0.0254;

/**
 * The printed face: 72 pixels to the inch, a line every sixth of an inch,
 * two forms of 66 lines round its ring.
 */
const DPI = 72;
const LINE_PX = DPI / 6;
const FACE_W = Math.round(9.5 * DPI);
const FACE_H = 2 * 66 * LINE_PX;
const RING_LINES = FACE_H / LINE_PX;
const FACE_METRES = (FACE_H / DPI) * 0.0254;
const PAPER = '#ded7b6';
const HOLE = '#9d957c';
const PERF = '#c1b99d';
const INK = '#353c38';

/** The print line: column 0 at the left margin, 80 columns at 10 to the inch. */
const MARGIN_PX = 54;
const COLUMN_PX = DPI / 10;

function paperFace() {
  const { context, texture } = createCanvasTexture(FACE_W, FACE_H);
  texture.wrapT = RepeatWrapping;
  /** Fresh paper over rows `y0` to `y1` (pixels), its holes and perforations. */
  const blank = (y0: number, y1: number) => {
    context.save();
    context.beginPath();
    context.rect(0, y0, FACE_W, y1 - y0);
    context.clip();
    context.fillStyle = PAPER;
    context.fillRect(0, y0, FACE_W, y1 - y0);
    // The tear-off strips' perforations and sprocket holes, every half inch.
    context.fillStyle = PERF;
    for (let y = y0 - (y0 % 6); y < y1; y += 6) {
      context.fillRect(DPI / 2, y, 1, 3);
      context.fillRect(FACE_W - DPI / 2, y, 1, 3);
    }
    context.fillStyle = HOLE;
    const pitch = DPI / 2;
    for (let y = pitch / 2 - pitch; y < y1 + pitch; y += pitch) {
      if (y < y0 - pitch) continue;
      for (const x of [DPI / 4, FACE_W - DPI / 4]) {
        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
    // The fold's perforation at each top of form.
    context.fillStyle = PERF;
    for (let y = 0; y < FACE_H; y += 66 * LINE_PX)
      if (y >= y0 && y < y1)
        for (let x = 0; x < FACE_W; x += 8) context.fillRect(x, y, 5, 1);
    context.restore();
  };
  blank(0, FACE_H);
  texture.needsUpdate = true;
  /** The band of paper line `line` takes on the ring. */
  const band = (line: number) => {
    const y = (((line % RING_LINES) + RING_LINES) % RING_LINES) * LINE_PX;
    return [y, y + LINE_PX] as const;
  };
  return {
    texture,
    /** Clear line `line` for fresh paper. */
    clear(line: number) {
      const [y0, y1] = band(line);
      blank(y0, y1);
    },
    /** Print `text` on line `line`. */
    print(line: number, text: string) {
      const [y0, y1] = band(line);
      blank(y0, y1);
      context.fillStyle = INK;
      context.font = `${LINE_PX}px "Courier New", Courier, monospace`;
      context.textBaseline = 'alphabetic';
      context.fillText(text, MARGIN_PX, y1 - 2, 80 * COLUMN_PX);
    },
  };
}

/** A strip of blank fanfold for the stock fed in: 36 pixels to the inch. */
function blankStock() {
  const { context, texture } = createCanvasTexture(342, 36);
  texture.wrapT = RepeatWrapping;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, 342, 36);
  context.fillStyle = HOLE;
  for (const y of [9, 27])
    for (const x of [9, 333]) {
      context.beginPath();
      context.arc(x, y, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  texture.needsUpdate = true;
  return texture;
}

/** The ways the printed paper may fall. */
export type PaperDrape = 'rear' | 'front';

export interface TeleprinterOptions {
  /**
   * Where the printed paper goes: over the separator and down behind
   * (`rear`, as the FX-80's manual has it), or over the lid and down in
   * front (`front`, where a wall is behind it).
   */
  drape?: PaperDrape;
  /** Where the blank stock stands: in its box `below`, or `behind` it on the same surface. */
  stock?: 'below' | 'behind';
  /** Metres from its feet down to the floor, where the printed pile lands. */
  drop?: number;
  /** Height of the shelf the stock's box stands on, metres above the floor. */
  shelf?: number;
  /** Stand it on its own steel printer stand, `drop` high, the stock on its shelf. */
  stand?: boolean;
}

/** The (y, z) of the paper's path from the platen, by drape. */
const PATHS: Record<PaperDrape, (lower: number) => [number, number][]> = {
  rear: (lower) => [
    [0.04, -0.011],
    [0.062, -0.009],
    [0.084, -0.024],
    [0.112, -0.064],
    [0.16, -0.13],
    [0.212, -0.198],
    [0.196, -0.262],
    [0.08, -0.305],
    [lower + 0.3, -0.33],
    [lower, -0.38],
  ],
  front: (lower) => [
    [0.04, -0.011],
    [0.062, -0.009],
    [0.09, -0.02],
    [0.13, -0.035],
    [0.16, 0.02],
    [0.15, 0.12],
    [0.1, 0.22],
    [0, 0.27],
    [lower + 0.3, 0.3],
    [lower, 0.36],
  ],
};

/** The arc length, metres, of the print line along each path. */
const PRINT_LINE_AT = 0.022;

/**
 * The printer, its paper and its stock: `title` is printed at the head of
 * the paper as it is built.
 */
export function createTeleprinter(
  title = 'OPERATOR ACTION LOG',
  options: TeleprinterOptions = {},
) {
  const {
    drape = 'rear',
    stock = 'below',
    drop = 0.7,
    shelf = 0.12,
    stand = false,
  } = options;
  const kit = createPanelKit();
  // One paint per colour, shared by every piece of it.
  const paints = new Map<string, ReturnType<typeof kitPaint>>();
  const paint = (color: string, metalness = 0) => {
    const key = `${color}|${metalness}`;
    if (!paints.has(key)) paints.set(key, kitPaint(kit, color, metalness));
    return paints.get(key)!;
  };
  const group = new Group();
  group.name = 'Gateway 3000 MightyPrint 80';
  const machineName = 'MightyPrint 80';
  const box = (
    w: number,
    h: number,
    d: number,
    color: string,
    x: number,
    y: number,
    z: number,
    parent: Object3D = group,
  ) => {
    const item = new Mesh(new BoxGeometry(w, h, d), paint(color));
    item.position.set(x, y, z);
    parent.add(item);
    return item;
  };
  const rod = (
    r: number,
    length: number,
    color: string,
    x: number,
    y: number,
    z: number,
    parent: Object3D = group,
    sides = 12,
  ) => {
    const item = new Mesh(
      new CylinderGeometry(r, r, length, sides),
      paint(color, color === '#a8adb0' ? 0.6 : 0),
    );
    item.rotation.z = Math.PI / 2;
    item.position.set(x, y, z);
    parent.add(item);
    return item;
  };
  const smoke = createPs1Material({
    color: SMOKE,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  kit.materials.push(smoke);
  const flat = (label: Mesh, x: number, y: number, z: number) => {
    label.rotation.x = -Math.PI / 2;
    label.position.set(x, y, z);
    group.add(label);
    return label;
  };

  // ---- The case ------------------------------------------------------------
  const { w, d } = MIGHTYPRINT_SIZE;
  for (const x of [-0.18, 0.18])
    for (const z of [-0.14, 0.14])
      box(0.03, 0.006, 0.03, '#2a2623', x, 0.003, z);
  box(w, 0.062, d, BEIGE, 0, 0.037, 0);
  // The top deck at the front, where the panel is.
  box(w, 0.017, 0.098, BEIGE, 0, 0.0765, d / 2 - 0.049);
  // The cheeks either side of the lid, and the rear cover behind it.
  for (const x of [-1, 1])
    box(0.03, 0.027, 0.245, BEIGE, x * (w / 2 - 0.015), 0.0815, -0.0485);
  box(w - 0.06, 0.024, 0.094, BEIGE, 0, 0.08, -d / 2 + 0.047);
  // A darker band round the case's waist, as the FX-80's.
  box(w + 0.002, 0.006, d + 0.002, BEIGE_DARK, 0, 0.03, 0);
  // The upper-right vent, over the DIP switches.
  for (let i = 0; i < 7; i++)
    box(0.022, 0.002, 0.004, TRIM, w / 2 - 0.016, 0.0955, -0.13 + i * 0.01);
  // The parallel connector at the left rear, and the mains inlet.
  box(0.065, 0.016, 0.006, '#8d9194', -0.13, 0.034, -d / 2 - 0.003);
  box(0.03, 0.02, 0.006, '#2a2623', 0.15, 0.034, -d / 2 - 0.003);

  // ---- Under the smoked lid -----------------------------------------------
  // The well the mechanism sits in, dark.
  box(w - 0.06, 0.004, 0.135, '#2d2a27', 0, 0.07, 0.007);
  const platen = rod(0.02, 0.34, '#1f1d1c', 0, 0.062, -0.031);
  platen.userData.live = true;
  designate(platen, {
    machine: machineName,
    name: 'Platen',
    role: 'indicator',
  });
  rod(0.0035, 0.35, '#a8adb0', 0, 0.071, 0.034);
  rod(0.0035, 0.35, '#a8adb0', 0, 0.06, 0.05);
  // The ribbon cartridge, as wide as the mechanism.
  box(0.34, 0.016, 0.022, '#1b1a19', 0, 0.083, 0.052);
  // The paper bail and its rollers.
  rod(0.0022, 0.33, '#a8adb0', 0, 0.086, -0.052);
  for (const x of [-0.08, 0, 0.08])
    rod(0.006, 0.014, '#2b2826', x, 0.086, -0.052);
  // The print head on its carriage, which shuttles as it prints.
  const carriage = new Group();
  carriage.position.set(0, 0, 0);
  group.add(carriage);
  carriage.userData.live = true;
  box(0.05, 0.028, 0.046, '#262422', 0, 0.072, 0.026, carriage);
  box(0.03, 0.03, 0.012, '#7d8285', 0, 0.074, 0.001, carriage);
  for (let i = 0; i < 4; i++)
    box(0.034, 0.002, 0.03, '#6d7276', 0, 0.088 + i * 0.003, 0.03, carriage);
  designate(carriage, {
    machine: machineName,
    name: 'Print head carriage',
    role: 'indicator',
  });
  // The pin feeders either side of the paper, behind the platen.
  for (const x of [-1, 1])
    box(0.022, 0.018, 0.04, '#252321', x * (PAPER_W / 2 + 0.006), 0.075, -0.07);
  // The lid itself, smoked, sloping a little to the front.
  const lid = new Mesh(new BoxGeometry(w - 0.06, 0.004, 0.14), smoke);
  lid.position.set(0, 0.097, 0.005);
  lid.rotation.x = 0.06;
  group.add(lid);
  designate(lid, {
    machine: machineName,
    name: 'Smoked lid',
    role: 'indicator',
  });
  // The smoked paper separator, rising from the rear cover.
  const separator = new Mesh(new BoxGeometry(0.3, 0.003, 0.16), smoke);
  separator.position.set(0, 0.152, -0.142);
  separator.rotation.x = Math.atan2(0.105, 0.11);
  if (drape === 'rear') group.add(separator);

  // ---- The platen knob and the power switch --------------------------------
  const knob = rod(
    0.022,
    0.02,
    '#2b2724',
    w / 2 + 0.01,
    0.062,
    -0.031,
    group,
    18,
  );
  designate(knob, {
    machine: machineName,
    name: 'Platen knob',
    role: 'indicator',
  });
  knob.userData.live = true;
  rod(0.009, 0.012, '#2b2724', w / 2 + 0.024, 0.062, -0.031);
  // The power switch on the left side, near the front: a rocker in a bezel.
  box(0.004, 0.024, 0.032, '#2a2623', -w / 2 - 0.002, 0.04, 0.11);
  const powerRocker = new Group();
  powerRocker.position.set(-w / 2 - 0.006, 0.04, 0.11);
  group.add(powerRocker);
  powerRocker.userData.live = true;
  box(0.006, 0.018, 0.026, '#1e1c1b', 0, 0, 0, powerRocker);
  const powerMark = createMicroLabel(kit, 'I  O', {
    height: 0.004,
    ink: '#f1ecdc',
  });
  powerMark.rotation.y = -Math.PI / 2;
  powerMark.position.set(-0.0032, 0, 0);
  powerRocker.add(powerMark);
  const powerLabel = createMicroLabel(kit, 'POWER', {
    height: 0.004,
    ink: TRIM,
  });
  powerLabel.rotation.y = -Math.PI / 2;
  powerLabel.position.set(-w / 2 - 0.0005, 0.06, 0.11);
  group.add(powerLabel);

  // ---- The panel, front right on the top deck -------------------------------
  const deckY = 0.0851;
  const panelZ = d / 2 - 0.046;
  box(0.15, 0.0012, 0.062, '#4d3f35', 0.12, deckY, panelZ);
  const lampSpec: { key: keyof PrinterLamps; label: string; color: string }[] =
    [
      { key: 'power', label: 'POWER', color: '#7dff6a' },
      { key: 'ready', label: 'READY', color: '#7dff6a' },
      { key: 'paperOut', label: 'PAPER\nOUT', color: '#ff4a32' },
      { key: 'online', label: 'ON LINE', color: '#7dff6a' },
    ];
  const lamps = lampSpec.map((spec, i) => {
    const x = 0.065 + i * 0.033;
    const glow = kitGlow(kit, '#26301f');
    const lamp = new Mesh(new SphereGeometry(0.0032, 10, 6), glow);
    lamp.scale.y = 0.6;
    lamp.position.set(x, deckY + 0.0008, panelZ - 0.024);
    group.add(lamp);
    lamp.userData.live = true;
    flat(
      createMicroLabel(kit, spec.label, { height: 0.0028, ink: '#e8e0c6' }),
      x,
      deckY + 0.0007,
      panelZ - 0.013 + (spec.label.includes('\n') ? 0.002 : 0),
    );
    return { ...spec, mesh: lamp, glow, lit: false };
  });
  const buttonSpec = [
    { key: 'online', label: 'ON LINE' },
    { key: 'formFeed', label: 'FORM FEED' },
    { key: 'lineFeed', label: 'LINE FEED' },
  ] as const;
  const keys = {} as Record<
    (typeof buttonSpec)[number]['key'],
    { cap: Mesh; pressed: number }
  >;
  buttonSpec.forEach((spec, i) => {
    const x = 0.075 + i * 0.045;
    box(0.022, 0.002, 0.016, '#2b2420', x, deckY + 0.001, panelZ + 0.01);
    const cap = box(
      0.018,
      0.006,
      0.012,
      BEIGE_DARK,
      x,
      deckY + 0.004,
      panelZ + 0.01,
    );
    cap.userData.live = true;
    cap.name = `${spec.label} button`;
    keys[spec.key] = { cap, pressed: 0 };
    flat(
      createMicroLabel(kit, spec.label, { height: 0.0028, ink: '#e8e0c6' }),
      x,
      deckY + 0.0007,
      panelZ + 0.0255,
    );
  });

  // ---- Its maker's marks ------------------------------------------------------
  const badge = createBrandBadge(kit, 'gateway', { height: 0.016 });
  badge.position.set(-0.13, 0.05, d / 2 + 0.0008);
  group.add(badge);
  flat(
    createMicroLabel(kit, 'MightyPrint 80', {
      height: 0.008,
      ink: TRIM,
      font: 'Futura, "Trebuchet MS", Arial, sans-serif',
    }),
    -0.12,
    deckY + 0.0007,
    panelZ + 0.004,
  );
  flat(
    createMicroLabel(kit, 'DOT MATRIX PRINTER', { height: 0.0035, ink: TRIM }),
    -0.12,
    deckY + 0.0007,
    panelZ + 0.018,
  );

  // ---- The stand, the stock and the stock's way in -----------------------------
  const floorY = -drop;
  if (stand) {
    const steel = '#3d4a45';
    const sz = -0.03;
    // The top, with a slot at the back for the stock to come up through.
    box(0.5, 0.024, 0.395, steel, 0, -0.012, sz + 0.0275);
    box(0.5, 0.024, 0.02, steel, 0, -0.012, sz - 0.215);
    for (const x of [-0.235, 0.235])
      box(0.03, 0.024, 0.035, steel, x, -0.012, sz - 0.1875);
    for (const x of [-0.235, 0.235])
      for (const z of [sz - 0.21, sz + 0.21]) {
        box(
          0.025,
          drop - 0.06,
          0.025,
          steel,
          x,
          floorY + 0.03 + (drop - 0.06) / 2,
          z,
        );
        const castor = new Mesh(
          new CylinderGeometry(0.022, 0.022, 0.018, 12),
          paint('#1d1d1c'),
        );
        castor.rotation.z = Math.PI / 2;
        castor.position.set(x, floorY + 0.022, z);
        group.add(castor);
        box(0.03, 0.016, 0.03, '#8d9194', x, floorY + 0.048, z);
      }
    // The lower shelf the stock's box stands on, and a rail round it.
    box(0.47, 0.012, 0.42, steel, 0, floorY + shelf - 0.006, sz);
    box(0.47, 0.02, 0.012, steel, 0, floorY + shelf + 0.01, sz + 0.205);
  }
  const stockTexture = blankStock();
  kit.textures.push(stockTexture);
  const stockMaterial = createPs1Material({
    map: stockTexture,
    side: DoubleSide,
  });
  kit.materials.push(stockMaterial);
  /** A strip of blank stock through (y, z) points, as wide as the paper. */
  const strip = (points: [number, number][]) => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const index: number[] = [];
    let run = 0;
    points.forEach(([y, z], i) => {
      if (i) {
        const [py, pz] = points[i - 1];
        run += Math.hypot(y - py, z - pz);
      }
      positions.push(-PAPER_W / 2, y, z, PAPER_W / 2, y, z);
      const v = run / 0.0254;
      uvs.push(0, v, 1, v);
      if (i) {
        const a = (i - 1) * 2;
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, stockMaterial);
    group.add(mesh);
    return mesh;
  };
  const stockBox = new Group();
  group.add(stockBox);
  const boxH = 0.1;
  if (stock === 'below') stockBox.position.set(0, floorY + shelf, -0.075);
  else stockBox.position.set(0, 0, -d / 2 - 0.16);
  box(0.27, boxH, 0.3, '#b39a72', 0, boxH / 2, 0, stockBox);
  box(0.245, 0.004, 0.28, '#e6dfc4', 0, boxH + 0.001, 0, stockBox);
  designate(stockBox, {
    machine: machineName,
    name: 'Fanfold stock, 9½ × 11 in',
    role: 'indicator',
  });
  const top = stockBox.position.y + boxH + 0.003;
  const feed =
    stock === 'below'
      ? strip([
          [top, -0.215],
          [top + 0.02, -0.222],
          [-0.03, -0.222],
          [0.01, -0.205],
          [0.032, -d / 2 - 0.004],
          [0.045, -0.12],
        ])
      : strip([
          [top, stockBox.position.z + 0.14],
          [0.05, -d / 2 - 0.01],
          [0.045, -0.12],
        ]);
  designate(feed, {
    machine: machineName,
    name: 'Paper supply',
    role: 'indicator',
  });

  // ---- The printed paper -------------------------------------------------------
  const machine = createDotMatrixPrinter();
  const printed = paperFace();
  kit.textures.push(printed.texture);
  // Paper: lit as any surface is (Pool Plant: dark in the dark).
  const paperMaterial = createPs1Material({
    map: printed.texture,
    side: DoubleSide,
  });
  kit.materials.push(paperMaterial);
  const segments = 56;
  const columns = 4;
  const positions = new Float32Array((segments + 1) * (columns + 1) * 3);
  const uvs = new Float32Array((segments + 1) * (columns + 1) * 2);
  const indices: number[] = [];
  for (let row = 0; row <= segments; row++)
    for (let col = 0; col <= columns; col++) {
      const index = row * (columns + 1) + col;
      uvs[index * 2] = col / columns;
      if (row < segments && col < columns) {
        const below = index + columns + 1;
        indices.push(index, below, index + 1, index + 1, below, below + 1);
      }
    }
  const ribbonGeometry = new BufferGeometry();
  ribbonGeometry.setAttribute(
    'position',
    new Float32BufferAttribute(positions, 3),
  );
  const uvAttribute = new Float32BufferAttribute(uvs, 2);
  ribbonGeometry.setAttribute('uv', uvAttribute);
  ribbonGeometry.setIndex(indices);
  const ribbon = new Mesh(ribbonGeometry, paperMaterial);
  ribbon.userData.live = true;
  group.add(ribbon);
  designate(ribbon, {
    machine: machineName,
    name: 'Printed alarm log',
    role: 'indicator',
  });

  const pileZ = drape === 'rear' ? -0.43 : 0.42;
  const outputPile = new Group();
  outputPile.position.y = floorY;
  group.add(outputPile);
  const sheets = new Group();
  sheets.position.z = pileZ;
  outputPile.add(sheets);
  for (let sheet = 0; sheet < 14; sheet++) {
    const page = box(
      PAPER_W,
      0.004,
      FORM,
      sheet % 3 ? '#ded6b6' : '#c8c0a2',
      Math.sin(sheet * 1.7) * 0.012,
      0.002 + sheet * 0.0042,
      Math.cos(sheet * 1.2) * 0.01,
      sheets,
    );
    page.rotation.set(
      Math.sin(sheet) * 0.02,
      Math.sin(sheet * 2.7) * 0.06,
      Math.cos(sheet) * 0.02,
    );
  }
  const folds: Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const geometry = new PlaneGeometry(PAPER_W, FORM, 4, 4);
    const vertices = geometry.getAttribute('position');
    for (let vertex = 0; vertex < vertices.count; vertex++)
      vertices.setZ(
        vertex,
        0.012 *
          Math.sin(vertices.getX(vertex) * 14 + vertices.getY(vertex) * 30 + i),
      );
    geometry.computeVertexNormals();
    const fold = new Mesh(geometry, paperMaterial);
    fold.rotation.set(
      -Math.PI / 2 + i * 0.04,
      (i - 1.5) * 0.05,
      0.02 * Math.sin(i),
    );
    fold.position.set(Math.sin(i * 2) * 0.01, 0.065 + i * 0.008, i * 0.006);
    fold.userData.live = true;
    designate(fold, {
      machine: machineName,
      name: 'Settling paper',
      role: 'indicator',
    });
    sheets.add(fold);
    folds.push(fold);
  }

  // The paper's path, laid out again only when the pile moves; its ripple
  // reshaped only when the paper has moved (mission 094).
  let laid = NaN;
  const along: { y: number; z: number; s: number }[] = [];
  let length = 1;
  const layPath = (lower: number) => {
    if (lower === laid) return;
    laid = lower;
    const curve = new CatmullRomCurve3(
      PATHS[drape](lower).map(([y, z]) => new Vector3(0, y, z)),
      false,
      'centripetal',
    );
    length = curve.getLength();
    along.length = 0;
    curve
      .getSpacedPoints(segments)
      .forEach((p, row) =>
        along.push({ y: p.y, z: p.z, s: (row / segments) * length }),
      );
    for (let row = 0; row <= segments; row++)
      for (let col = 0; col <= columns; col++)
        uvAttribute.setY(row * (columns + 1) + col, along[row].s / FACE_METRES);
    uvAttribute.needsUpdate = true;
  };
  let shaped = '';
  const shapeRibbon = (phase: number) => {
    const lower = outputPile.position.y + 0.09;
    layPath(lower);
    const key = `${phase}|${lower}`;
    if (key === shaped) return;
    shaped = key;
    const vertices = ribbonGeometry.getAttribute('position');
    const settleFrom = 0.62;
    const dz = drape === 'rear' ? -1 : 1;
    for (let row = 0; row <= segments; row++) {
      const t = row / segments;
      const settling = Math.max(0, (t - settleFrom) / (1 - settleFrom)) ** 2;
      const ripple = Math.sin(t * 14 - phase * Math.PI * 8);
      const { y, z } = along[row];
      for (let col = 0; col <= columns; col++) {
        const x = (col / columns - 0.5) * PAPER_W;
        vertices.setXYZ(
          row * (columns + 1) + col,
          x + settling * Math.sin(phase * Math.PI * 2) * 0.012,
          y + settling * ripple * 0.02,
          z +
            dz * settling * ripple * 0.04 +
            Math.sin(x * 20 + t * 12) * 0.004 * settling,
        );
      }
    }
    vertices.needsUpdate = true;
    ribbonGeometry.computeVertexNormals();
    ribbonGeometry.computeBoundingSphere();
  };

  /** Lines of paper cleared ahead of the print line, so none shows old ink. */
  let clearedTo = 0;
  const clearAhead = (paper: number) => {
    const need = Math.floor(paper) + 8;
    if (need <= clearedTo) return false;
    // In batches, so a form feed redraws the face only now and then.
    const to = need + 40;
    for (let line = clearedTo + 1; line <= to; line++) printed.clear(line);
    clearedTo = to;
    return true;
  };
  const scroll = (paper: number) => {
    const at = PRINT_LINE_AT / FACE_METRES;
    const offset = 1 - at - ((paper + 0.5) * LINE_PX) / FACE_H;
    printed.texture.offset.y = offset - Math.floor(offset);
  };

  const showRows = (rows: readonly { line: number; text: string }[]) => {
    for (const row of rows) printed.print(row.line, row.text);
    return rows.length > 0;
  };

  // The title at the head of the paper, and a line after it.
  machine.send(title);
  machine.send('');
  showRows(machine.step(60));
  clearAhead(machine.paper);
  printed.texture.needsUpdate = true;
  scroll(machine.paper);
  shapeRibbon(0);

  const carriageX = (head: number) => -0.1016 + head * 0.2032;
  carriage.position.x = carriageX(machine.head);
  const lampsShown = () => {
    const now = machine.lamps;
    for (const lamp of lamps) {
      const lit = now[lamp.key];
      if (lit === lamp.lit) continue;
      lamp.lit = lit;
      (lamp.glow as MeshBasicMaterial).color.set(
        lit ? lamp.color : lamp.key === 'paperOut' ? '#3a1d18' : '#26301f',
      );
    }
  };
  lampsShown();
  let rocker = machine.power;
  powerRocker.rotation.x = rocker ? 0.18 : -0.18;

  return {
    group,
    /** The printed pile on the floor: set its y to the floor's, in the printer's frame. */
    outputPile,
    /** The machine's behaviour: its buffer, head, paper and lamps. */
    machine,
    /** What a use presses: the panel's three buttons and the power rocker. */
    controls: {
      online: keys.online.cap,
      formFeed: keys.formFeed.cap,
      lineFeed: keys.lineFeed.cap,
      power: powerRocker,
    },
    /** The four lamps, by name, for their descriptions. */
    lamps: Object.fromEntries(
      lamps.map((l) => [l.key, l.mesh as Object3D]),
    ) as Record<keyof PrinterLamps, Object3D>,
    /** Press a button down; it springs back. */
    press(key: 'online' | 'formFeed' | 'lineFeed') {
      keys[key].pressed = 0.12;
    },
    /** The host sends a line (or several): it prints when it can. */
    record(message: string) {
      machine.send(message);
      ribbon.userData.lastLogEntry = message;
    },
    update(delta: number, reducedMotion = false) {
      const rows = machine.step(delta);
      let drawn = showRows(rows);
      drawn = clearAhead(machine.paper) || drawn;
      if (drawn) printed.texture.needsUpdate = true;
      scroll(machine.paper);
      const phase = reducedMotion ? 0 : (machine.paper / 6) % 1;
      shapeRibbon(phase);
      carriage.position.x = carriageX(machine.head);
      platen.rotation.x = machine.paper * 0.21;
      knob.rotation.x = platen.rotation.x;
      folds.forEach((fold, i) => {
        fold.position.y =
          0.065 +
          i * 0.008 +
          (reducedMotion
            ? 0
            : Math.max(0, Math.sin(phase * Math.PI * 2 - i * 0.8)) * 0.02);
      });
      for (const key of Object.values(keys)) {
        if (key.pressed <= 0 && key.cap.position.y === deckY + 0.004) continue;
        key.pressed = Math.max(0, key.pressed - delta);
        key.cap.position.y = deckY + 0.004 - (key.pressed > 0 ? 0.0025 : 0);
      }
      if (rocker !== machine.power) {
        rocker = machine.power;
        powerRocker.rotation.x = rocker ? 0.18 : -0.18;
      }
      lampsShown();
      return rows.length > 0;
    },
    /** What it shows, in words. */
    status: () => machine.describe(),
    dispose() {
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      for (const item of kit.materials) item.dispose();
      for (const item of kit.textures) item.dispose();
    },
  };
}

export type TeleprinterView = ReturnType<typeof createTeleprinter>;

/**
 * The printer at true size in a room built in metres, its feet on a
 * surface `height` metres above the floor, its printed paper falling to a
 * pile on the floor.
 */
export function teleprinterInMetres(
  title: string,
  height = 0.68,
  options: Omit<TeleprinterOptions, 'drop'> = {},
) {
  const printer = createTeleprinter(title, { ...options, drop: height });
  printer.group.position.y = height;
  return printer;
}
