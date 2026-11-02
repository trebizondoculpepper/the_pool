import { Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  createSevenSegment,
  kitGlow,
} from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { markComponent } from '../../core/views/component-identity';
import {
  RAVELLO,
  SAMPLE_DECK,
  deckFloor,
  deckReadouts,
  proverDialTurn,
} from '../logic/pizza-oven';
import type { DeckFace } from '../logic/pizza-oven';

/**
 * The Mozzetti Forni Ravello D (the owner, 2026-11-02), after the Moretti
 * Forni serieP Amalfi D with two 18 cm chambers on its 800 mm prover: a
 * reference model, true to the datasheet (`doc/research/pizza-oven.md`),
 * not yet worked (its panels show `faces` and the prover's `prover`
 * setting, drawn once).
 *
 * Origin on the floor at the middle of its footprint (hood and vapour
 * duct included), front +z. Up its front: four locking castors; the
 * prover, two hinged stainless doors with round knobs, its panel (lamp,
 * LIGHT switch, thermostat) on the right; the base; two decks, each a
 * stainless door hinged at the bottom with a tempered glass window, the
 * U-shaped tubular handle the Amalfi has, the vapour valve's ball knob on
 * the left, and on the right its two panels (main switch and safety
 * thermostat reset; the electronic panel of chamber and set temperatures,
 * ceiling and floor powers 0–9 and its keys); the black hood with the
 * maker's oval badge; the steam exhaust's collar and duct at the back.
 */
export interface PizzaOvenOptions {
  /** The lower deck's panel, then the upper's. */
  faces?: readonly [DeckFace, DeckFace];
  /** The prover's thermostat, °C (0 is OFF). */
  prover?: number;
}

export const PIZZA_OVEN_NAME = 'Pizza oven: Mozzetti Forni Ravello D';

/** Its footprint and height, metres, hood and duct included (`ExhibitSize`). */
export const PIZZA_OVEN_SIZE = {
  w: RAVELLO.width,
  d: RAVELLO.depth + RAVELLO.hoodOverhang + RAVELLO.ductDepth,
  h:
    RAVELLO.prover +
    RAVELLO.base +
    2 * RAVELLO.deck +
    RAVELLO.hood +
    RAVELLO.collar,
};

export function createPizzaOven(
  kit: PanelKit,
  { faces = [SAMPLE_DECK, SAMPLE_DECK], prover = 30 }: PizzaOvenOptions = {},
) {
  const t = tools(kit);
  const group = new Group();
  markComponent(group, { name: PIZZA_OVEN_NAME });
  // The body centred front to back; the whole shifted so the footprint,
  // hood's overhang and duct included, is centred on the origin.
  const oven = new Group();
  oven.position.z = (RAVELLO.ductDepth - RAVELLO.hoodOverhang) / 2;
  group.add(oven);

  const W = RAVELLO.width;
  const D = RAVELLO.depth;
  const front = D / 2;
  const half = W / 2;
  // The door's span: right of the stile, left of the control column.
  const doorLeft = -half + RAVELLO.stile;
  const doorRight = half - RAVELLO.column;
  const doorW = doorRight - doorLeft;
  const doorX = (doorLeft + doorRight) / 2;
  const columnX = half - RAVELLO.column / 2;

  const steel = t.paint('#c4c8ca', 0.34, 0.72);
  const brushed = t.paint('#b5babd', 0.42, 0.68);
  const sides = t.paint('#8d9295', 0.62, 0.35);
  const black = t.paint('#161718', 0.45, 0.2);
  const hoodBlack = t.paint('#121314', 0.32, 0.3);
  const chrome = t.paint('#dfe2e4', 0.18, 0.92);
  const rubber = t.paint('#1c1c1c', 0.85);

  // ---- The castors: four total-lock castors, Ø100 mm --------------------
  const castorX = half - 0.07;
  const castorZ = front - 0.07;
  for (const [x, z] of [
    [-castorX, castorZ],
    [castorX, castorZ],
    [-castorX, -castorZ],
    [castorX, -castorZ],
  ] as const) {
    const castor = createCastor(t, Math.sign(z), steel, chrome, rubber);
    castor.position.set(x, 0, z);
    oven.add(castor);
  }

  // ---- The prover: a heated cupboard of stainless steel ------------------
  const proverBottom = RAVELLO.castor;
  const proverH = RAVELLO.prover - RAVELLO.castor;
  t.box(oven, sides, W, proverH, D, 0, proverBottom + proverH / 2, 0);
  const plate = 0.012;
  // Its front: a plinth, the doors' frame, a top rail.
  t.box(
    oven,
    steel,
    W,
    0.075,
    plate,
    0,
    proverBottom + 0.0375,
    front + plate / 2,
  );
  t.box(
    oven,
    steel,
    W,
    0.03,
    plate,
    0,
    RAVELLO.prover - 0.015,
    front + plate / 2,
  );
  t.box(
    oven,
    steel,
    RAVELLO.stile,
    proverH - 0.105,
    plate,
    -half + RAVELLO.stile / 2,
    proverBottom + 0.075 + (proverH - 0.105) / 2,
    front + plate / 2,
  );
  t.box(
    oven,
    steel,
    RAVELLO.column,
    proverH - 0.105,
    plate,
    columnX,
    proverBottom + 0.075 + (proverH - 0.105) / 2,
    front + plate / 2,
  );
  // Its two doors, hinged at their outer edges, round black knobs inboard.
  const leafH = proverH - 0.125;
  const leafY = proverBottom + 0.085 + leafH / 2;
  for (const side of [-1, 1]) {
    const leafW = doorW / 2 - 0.004;
    const x = doorX + (side * doorW) / 4;
    t.box(oven, brushed, leafW, leafH, 0.02, x, leafY, front + 0.01);
    // The fold of its edge, a shade darker.
    t.box(
      oven,
      sides,
      0.006,
      leafH,
      0.021,
      x + (side * -leafW) / 2,
      leafY,
      front + 0.0105,
    );
    const knobX = doorX + side * 0.065;
    const knobY = leafY + leafH / 2 - 0.06;
    t.cyl(oven, black, 0.006, 0.02, knobX, knobY, front + 0.03, 'z');
    const knob = new Mesh(new SphereGeometry(0.018, 16, 12), black);
    knob.position.set(knobX, knobY, front + 0.045);
    oven.add(knob);
  }
  // Its panel: the lamp, the LIGHT switch and the thermostat.
  oven.add(
    placed(
      createProverPanel(kit, prover),
      columnX,
      RAVELLO.prover - 0.16,
      front + plate,
    ),
  );

  // ---- The oven's base ----------------------------------------------------
  const baseY = RAVELLO.prover;
  t.box(oven, sides, W, RAVELLO.base, D, 0, baseY + RAVELLO.base / 2, 0);
  t.box(
    oven,
    steel,
    W + 0.01,
    RAVELLO.base,
    plate * 2,
    0,
    baseY + RAVELLO.base / 2,
    front + plate,
  );

  // ---- The two decks --------------------------------------------------------
  for (const n of [0, 1] as const) buildDeck(oven, n, faces[n]);

  function buildDeck(parent: Object3D, n: 0 | 1, face: DeckFace) {
    const y0 = deckFloor(n);
    const H = RAVELLO.deck;
    t.box(parent, sides, W, H, D, 0, y0 + H / 2, 0);
    // The frame round the door: the stile, the column, a lintel, a sill.
    t.box(
      parent,
      steel,
      RAVELLO.stile,
      H,
      plate,
      -half + RAVELLO.stile / 2,
      y0 + H / 2,
      front + plate / 2,
    );
    t.box(
      parent,
      steel,
      RAVELLO.column,
      H,
      plate,
      columnX,
      y0 + H / 2,
      front + plate / 2,
    );
    t.box(
      parent,
      steel,
      doorW,
      0.045,
      plate,
      doorX,
      y0 + H - 0.0225,
      front + plate / 2,
    );
    // The sill: a ledge to rest a peel on, under the door.
    t.box(
      parent,
      brushed,
      doorW + 0.02,
      0.025,
      0.07,
      doorX,
      y0 + 0.0125,
      front + 0.035,
    );
    // The door, hinged at the bottom, with its balancing spring inside.
    const doorH = H - 0.075;
    const doorY = y0 + 0.028 + doorH / 2;
    const doorZ = front + 0.025;
    t.box(
      parent,
      brushed,
      doorW - 0.01,
      doorH,
      0.04,
      doorX,
      doorY,
      front + 0.005,
    );
    // Its window: a dark steel bezel, the tempered glass, the stone floor
    // glowing behind it while the lamps are lit.
    const winY = y0 + 0.215;
    t.box(parent, black, 0.95, 0.205, 0.006, doorX, winY, doorZ + 0.003);
    t.box(parent, steel, 0.93, 0.185, 0.004, doorX, winY, doorZ + 0.006);
    const glass = t.printed(
      0.88,
      0.15,
      (c, w, h) => drawWindow(c, w, h, face.light),
      256,
      face.light,
    );
    glass.mesh.position.set(doorX, winY, doorZ + 0.0085);
    parent.add(glass.mesh);
    // A row of screws along the door's top and bottom, as fixed.
    for (let i = 0; i < 4; i++)
      for (const dy of [doorH / 2 - 0.018, -doorH / 2 + 0.018]) {
        const sx = doorX - 0.45 + i * 0.3;
        t.cyl(
          parent,
          chrome,
          0.004,
          0.003,
          sx,
          doorY + dy,
          doorZ + 0.001,
          'z',
          8,
        );
      }
    // The handle: a stainless tube bent into a U over the window, its feet
    // in black pivot blocks low on the door.
    const pivotY = RAVELLO.handles[n];
    const reach = 0.16;
    const gripY = y0 + 0.33;
    const spread = doorW / 2 - 0.035;
    for (const side of [-1, 1]) {
      const x = doorX + side * spread;
      t.box(parent, black, 0.032, 0.075, 0.05, x, pivotY, doorZ + 0.025);
      tube(
        parent,
        chrome,
        new Vector3(x, pivotY + 0.02, doorZ + 0.045),
        new Vector3(x, gripY, doorZ + reach),
        0.013,
      );
      const bend = new Mesh(new SphereGeometry(0.013, 12, 8), chrome);
      bend.position.set(x, gripY, doorZ + reach);
      parent.add(bend);
    }
    tube(
      parent,
      chrome,
      new Vector3(doorX - spread, gripY, doorZ + reach),
      new Vector3(doorX + spread, gripY, doorZ + reach),
      0.013,
    );
    // The vapour valve's ball knob on the stile: pulled out, open.
    const knobX = -half + RAVELLO.stile / 2;
    t.cyl(parent, chrome, 0.005, 0.045, knobX, y0 + 0.29, front + 0.03, 'z');
    const ball = new Mesh(new SphereGeometry(0.022, 16, 12), black);
    ball.position.set(knobX, y0 + 0.29, front + 0.058);
    parent.add(ball);
    const ring = new Mesh(new TorusGeometry(0.03, 0.004, 8, 24), black);
    ring.position.set(knobX, y0 + 0.29, front + plate + 0.002);
    parent.add(ring);
    // The column: the main switch and reset above, the electronic panel.
    parent.add(
      placed(createSwitchPanel(kit, face), columnX, y0 + 0.31, front + plate),
    );
    parent.add(
      placed(createDeckPanel(kit, face), columnX, y0 + 0.155, front + plate),
    );
  }

  // ---- The hood: black, rounded, over the doors' handles ------------------
  const hoodY = deckFloor(1) + RAVELLO.deck;
  const hoodD = D + RAVELLO.hoodOverhang;
  const hood = new Mesh(
    new RoundedBoxGeometry(W, RAVELLO.hood, hoodD, 3, 0.035),
    hoodBlack,
  );
  hood.position.set(0, hoodY + RAVELLO.hood / 2, RAVELLO.hoodOverhang / 2);
  oven.add(hood);
  const hoodFront = front + RAVELLO.hoodOverhang;
  // The maker's oval badge: a chrome rim round a black plate, the logo on it.
  const oval = new Group();
  oval.position.set(0, hoodY + RAVELLO.hood / 2, hoodFront + 0.001);
  oven.add(oval);
  const rim = t.cyl(oval, chrome, 0.05, 0.006, 0, 0, 0.003, 'z', 32);
  rim.scale.set(4.6, 1, 1);
  const field = t.cyl(oval, black, 0.046, 0.007, 0, 0, 0.0035, 'z', 32);
  field.scale.set(4.75, 1, 0.95);
  const badge = createBrandBadge(kit, 'mozzetti', {
    height: 0.06,
    ink: '#f4f4f2',
    maxWidth: 0.36,
  });
  badge.position.z = 0.0075;
  oval.add(badge);

  // ---- The steam exhaust: its Ø150 collar on the hood, the duct behind ---
  const ductX = -half + 0.19;
  const backZ = -front;
  t.cyl(
    oven,
    steel,
    0.075,
    RAVELLO.collar,
    ductX,
    hoodY + RAVELLO.hood + RAVELLO.collar / 2,
    backZ + 0.09,
    'y',
    24,
  );
  t.box(
    oven,
    steel,
    0.1,
    hoodY + RAVELLO.hood - (RAVELLO.prover + 0.06),
    RAVELLO.ductDepth,
    ductX,
    (hoodY + RAVELLO.hood + RAVELLO.prover + 0.06) / 2,
    backZ - RAVELLO.ductDepth / 2,
  );

  return { group, dispose() {} };

  function placed(object: Object3D, x: number, y: number, z: number) {
    object.position.set(x, y, z);
    return object;
  }
}

/** A tube of `r` from `a` to `b`. */
function tube(
  parent: Object3D,
  material: Material,
  a: Vector3,
  b: Vector3,
  r: number,
) {
  const length = a.distanceTo(b);
  const mesh = new Mesh(
    new RoundedBoxGeometry(r * 2, length, r * 2, 2, r * 0.9),
    material,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  parent.add(mesh);
  return mesh;
}

type Tools = ReturnType<typeof tools>;

/**
 * A total-lock castor, Ø100 mm, 140 mm high: its top plate, swivel, fork,
 * grey wheel and the red brake pedal toward the oven's nearer face
 * (`facing` +1 front, -1 back).
 */
function createCastor(
  t: Tools,
  facing: number,
  steel: Material,
  chrome: Material,
  rubber: Material,
) {
  const castor = new Group();
  const wheelR = 0.05;
  t.box(castor, steel, 0.09, 0.006, 0.09, 0, RAVELLO.castor - 0.003, 0);
  t.cyl(castor, chrome, 0.026, 0.016, 0, RAVELLO.castor - 0.014, 0, 'y', 16);
  // The fork, trailing the swivel by 30 mm toward the middle.
  const trail = -facing * 0.03;
  for (const side of [-1, 1])
    t.box(
      castor,
      chrome,
      0.005,
      0.085,
      0.05,
      side * 0.022,
      wheelR + 0.02,
      trail * 0.5,
    );
  t.box(
    castor,
    chrome,
    0.05,
    0.006,
    0.05,
    0,
    RAVELLO.castor - 0.025,
    trail * 0.4,
  );
  t.cyl(
    castor,
    t.paint('#a2a7ab', 0.7),
    wheelR,
    0.032,
    0,
    wheelR,
    trail,
    'x',
    24,
  );
  t.cyl(castor, rubber, wheelR * 0.45, 0.034, 0, wheelR, trail, 'x', 16);
  t.cyl(castor, chrome, 0.006, 0.05, 0, wheelR, trail, 'x', 8);
  // The total-lock pedal over the wheel, on the outward side.
  const pedal = t.box(
    castor,
    t.paint('#b01e1e', 0.5),
    0.036,
    0.008,
    0.045,
    0,
    wheelR * 2 + 0.012,
    trail + facing * 0.05,
  );
  pedal.rotation.x = facing * -0.35;
  t.box(
    castor,
    chrome,
    0.01,
    0.01,
    0.04,
    0,
    wheelR * 2 + 0.006,
    trail + facing * 0.025,
  );
  return castor;
}

/** The chamber seen through the glass: the stone floor glowing under the lamps, or dark. */
function drawWindow(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  lit: boolean,
) {
  const g = c.createLinearGradient(0, 0, 0, h);
  if (lit) {
    g.addColorStop(0, '#5a3418');
    g.addColorStop(0.55, '#c9762c');
    g.addColorStop(1, '#f2b45a');
  } else {
    g.addColorStop(0, '#141210');
    g.addColorStop(1, '#2a2520');
  }
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // The back wall's line and the stone floor's front edge.
  c.fillStyle = lit ? 'rgba(80,40,14,0.6)' : 'rgba(0,0,0,0.5)';
  c.fillRect(0, h * 0.5, w, h * 0.04);
  // A sheen across the glass.
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.beginPath();
  c.moveTo(w * 0.1, 0);
  c.lineTo(w * 0.22, 0);
  c.lineTo(w * 0.12, h);
  c.lineTo(0, h);
  c.fill();
}

/** A black panel plate set into the column, `w` × `h`, facing +z, its back at z = 0. */
function panelPlate(t: Tools, parent: Object3D, w: number, h: number) {
  t.box(parent, t.paint('#0f1011', 0.5, 0.1), w, h, 0.004, 0, 0, 0.002);
}

/**
 * The deck's upper panel: the illuminated main switch (0 · I, green, lit
 * while on) and the safety thermostat's reset under its black cap.
 */
function createSwitchPanel(kit: PanelKit, face: DeckFace) {
  const t = tools(kit);
  const panel = new Group();
  const w = 0.15;
  const h = 0.075;
  panelPlate(t, panel, w, h);
  const print = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#0f1011';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#e8e8e4';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold ${Math.round(ch * 0.13)}px ${SANS}`;
      c.fillText('MAIN', cw * 0.3, ch * 0.13);
      c.fillText('RESET', cw * 0.72, ch * 0.13);
      c.font = `bold ${Math.round(ch * 0.12)}px ${SANS}`;
      c.fillText('I', cw * 0.16, ch * 0.38);
      c.fillText('0', cw * 0.16, ch * 0.64);
      c.font = `${Math.round(ch * 0.085)}px ${SANS}`;
      c.fillText('SAFETY THERMOSTAT', cw * 0.7, ch * 0.88);
    },
    256,
  );
  print.mesh.position.z = 0.0042;
  panel.add(print.mesh);
  // The rocker, its upper half pressed in while on, lit green.
  t.box(
    panel,
    t.paint('#202224', 0.5),
    0.026,
    0.036,
    0.006,
    -w * 0.2,
    0,
    0.007,
  );
  const rocker = t.box(
    panel,
    face.on ? kitGlow(kit, '#46d35a') : t.paint('#2c5f34', 0.4),
    0.02,
    0.03,
    0.008,
    -w * 0.2,
    0,
    0.012,
  );
  rocker.rotation.x = face.on ? -0.12 : 0.12;
  // The reset: a round black cap screwed over its button.
  t.cyl(
    panel,
    t.paint('#18191a', 0.4),
    0.011,
    0.012,
    w * 0.22,
    0,
    0.01,
    'z',
    6,
  );
  t.cyl(
    panel,
    t.paint('#2a2b2d', 0.4),
    0.008,
    0.004,
    w * 0.22,
    0,
    0.018,
    'z',
    16,
  );
  return panel;
}

/**
 * The deck's electronic panel (after the Amalfi's, fig. 17 of its
 * manual): the chamber's temperature (left) and the set point (right,
 * ▲▼ to set it), the ceiling's power above and the floor's below (0–9,
 * ▲▼ each, a point lit while its elements draw), and the keys START/STOP,
 * ECO, LIGHT, M, P and TIMER, each with its LED.
 */
function createDeckPanel(kit: PanelKit, face: DeckFace) {
  const t = tools(kit);
  const panel = new Group();
  const w = 0.15;
  const h = 0.17;
  panelPlate(t, panel, w, h);
  const keys = [
    ['START', 'STOP'],
    ['ECO', ''],
    ['LIGHT', ''],
    ['M', ''],
    ['P', ''],
    ['TIMER', ''],
  ] as const;
  // Panel coordinates, metres from its middle; the canvas's from its top left.
  const px = (x: number, cw: number) => (x / w + 0.5) * cw;
  const py = (y: number, ch: number) => (0.5 - y / h) * ch;
  const keyAt = (i: number) => ({
    x: -0.045 + (i % 2) * 0.034,
    y: -0.022 - Math.floor(i / 2) * 0.022,
  });
  const arrows = [
    { x: 0.058, y: 0.058 },
    { x: 0.058, y: 0.015 },
    { x: 0.058, y: -0.05 },
  ];
  const print = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#0f1011';
      c.fillRect(0, 0, cw, ch);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const s = cw / w;
      // The model's plate, top left.
      c.fillStyle = '#b9bdc0';
      c.fillRect(px(-0.068, cw), py(0.075, ch), 0.055 * s, 0.012 * s);
      c.fillStyle = '#16181a';
      c.font = `bold ${Math.round(0.0075 * s)}px ${SANS}`;
      c.fillText('RAVELLO D', px(-0.0405, cw), py(0.069, ch));
      c.fillStyle = '#e8e8e4';
      c.font = `bold ${Math.round(0.0062 * s)}px ${SANS}`;
      c.fillText('CEILING', px(0.026, cw), py(0.072, ch));
      c.fillText('OVEN °C', px(-0.034, cw), py(0.032, ch));
      c.fillText('SET °C', px(0.018, cw), py(0.032, ch));
      c.fillText('FLOOR', px(0.026, cw), py(-0.036, ch));
      // The ceiling's and floor's signs: a heater bar over or under a box.
      c.strokeStyle = '#e8e8e4';
      c.lineWidth = 0.0008 * s;
      for (const [y, top] of [
        [0.058, true],
        [-0.05, false],
      ] as const) {
        const bx = px(0.014, cw);
        const by = py(y, ch);
        c.strokeRect(bx - 0.006 * s, by - 0.004 * s, 0.012 * s, 0.008 * s);
        c.fillStyle = '#ff6a2a';
        c.fillRect(
          bx - 0.006 * s,
          by + (top ? -0.004 : 0.0028) * s,
          0.012 * s,
          0.0012 * s,
        );
      }
      // The ▲▼ keys.
      for (const a of arrows) {
        for (const [dy, up] of [
          [0.008, true],
          [-0.008, false],
        ] as const) {
          const cx = px(a.x, cw);
          const cy = py(a.y + dy, ch);
          c.strokeStyle = '#5d6064';
          c.lineWidth = 0.0006 * s;
          c.beginPath();
          c.roundRect(
            cx - 0.0065 * s,
            cy - 0.0055 * s,
            0.013 * s,
            0.011 * s,
            0.002 * s,
          );
          c.stroke();
          c.fillStyle = '#e8e8e4';
          c.beginPath();
          const d = 0.0032 * s;
          c.moveTo(cx - d, cy + (up ? d * 0.6 : -d * 0.6));
          c.lineTo(cx + d, cy + (up ? d * 0.6 : -d * 0.6));
          c.lineTo(cx, cy + (up ? -d * 0.8 : d * 0.8));
          c.closePath();
          c.fill();
        }
      }
      // The keys: a rounded square each, its legend, its LED's place.
      keys.forEach(([a, b], i) => {
        const k = keyAt(i);
        const cx = px(k.x, cw);
        const cy = py(k.y, ch);
        c.strokeStyle = '#5d6064';
        c.lineWidth = 0.0006 * s;
        c.beginPath();
        c.roundRect(
          cx - 0.014 * s,
          cy - 0.0085 * s,
          0.028 * s,
          0.017 * s,
          0.002 * s,
        );
        c.stroke();
        c.fillStyle = '#e8e8e4';
        c.font = `bold ${Math.round((a.length > 1 ? 0.0052 : 0.008) * s)}px ${SANS}`;
        if (b) {
          c.fillText(a, cx - 0.002 * s, cy - 0.0028 * s);
          c.fillText(b, cx - 0.002 * s, cy + 0.0034 * s);
        } else c.fillText(a, cx - 0.002 * s, cy);
      });
    },
    512,
  );
  print.mesh.position.z = 0.0042;
  panel.add(print.mesh);
  // The four LED displays.
  const shown = deckReadouts(face);
  const display = (digits: number, x: number, y: number, text: string) => {
    const seg = createSevenSegment(kit, digits, {
      digitHeight: 0.011,
      texelsPerMm: 6,
    });
    seg.group.position.set(x, y, 0.004);
    seg.show(text);
    panel.add(seg.group);
  };
  display(3, -0.034, 0.016, shown.chamber);
  display(3, 0.018, 0.016, shown.setPoint);
  display(1, 0.034, 0.058, shown.ceiling);
  display(1, 0.034, -0.05, shown.floor);
  // Each key's LED, top right of it: START/STOP red while heating, ECO
  // red when economy is on (powers adding to 9 or less), LIGHT and M
  // green while lit or in manual.
  const ledOn = [
    face.on && face.heating,
    face.on && face.ceiling + face.floor <= 9,
    face.on && face.light,
    face.on,
    false,
    false,
  ];
  const colours = [
    '#ff2a1a',
    '#ff2a1a',
    '#3ee05a',
    '#3ee05a',
    '#3ee05a',
    '#ffb020',
  ];
  ledOn.forEach((on, i) => {
    const k = keyAt(i);
    t.led(panel, colours[i], 0.0018, k.x + 0.011, k.y + 0.0055, 0.0055).set(on);
  });
  return panel;
}

/**
 * The prover's panel (fig. 18 of the Amalfi's manual): its ON indicator
 * lamp, the inside LIGHT switch and the on/off and regulating thermostat,
 * OFF to 65 °C.
 */
function createProverPanel(kit: PanelKit, setting: number) {
  const t = tools(kit);
  const panel = new Group();
  const w = 0.15;
  const h = 0.15;
  panelPlate(t, panel, w, h);
  const knobY = -0.025;
  const print = t.printed(
    w,
    h,
    (c, cw, ch) => {
      const s = cw / w;
      c.fillStyle = '#0f1011';
      c.fillRect(0, 0, cw, ch);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#e8e8e4';
      c.font = `bold ${Math.round(0.0075 * s)}px ${SANS}`;
      c.fillText('ON', cw * 0.27, ch * 0.08);
      c.fillText('LIGHT', cw * 0.73, ch * 0.08);
      c.fillText('PROVER °C', cw * 0.5, ch * 0.93);
      // The thermostat's scale: OFF, then 20 to 65 °C round three quarters.
      const cx = cw / 2;
      const cy = (0.5 - knobY / h) * ch;
      const r = 0.034 * s;
      c.font = `bold ${Math.round(0.0058 * s)}px ${SANS}`;
      for (const v of [0, 20, 30, 40, 50, 65]) {
        const a = -Math.PI * 1.25 + (v / 65) * 1.5 * Math.PI;
        c.strokeStyle = '#e8e8e4';
        c.lineWidth = 0.0007 * s;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
        c.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
        c.stroke();
        c.fillText(
          v === 0 ? 'OFF' : String(v),
          cx + Math.cos(a) * r * 1.15,
          cy + Math.sin(a) * r * 1.15,
        );
      }
    },
    384,
  );
  print.mesh.position.z = 0.0042;
  panel.add(print.mesh);
  // The lamp, amber, lit while the thermostat is on.
  t.cyl(
    panel,
    t.paint('#9aa0a4', 0.3, 0.8),
    0.0085,
    0.006,
    -w * 0.23,
    0.045,
    0.006,
    'z',
    16,
  );
  t.led(panel, '#ffa020', 0.0065, -w * 0.23, 0.045, 0.0105).set(setting > 0);
  // The LIGHT rocker, off.
  t.box(
    panel,
    t.paint('#202224', 0.5),
    0.02,
    0.028,
    0.006,
    w * 0.23,
    0.045,
    0.007,
  );
  const rocker = t.box(
    panel,
    t.paint('#3a3c3f', 0.5),
    0.015,
    0.022,
    0.008,
    w * 0.23,
    0.045,
    0.012,
  );
  rocker.rotation.x = 0.12;
  // The thermostat's knob: a black skirted knob, its pointer white.
  const knob = new Group();
  knob.position.set(0, knobY, 0.004);
  panel.add(knob);
  t.cyl(knob, t.paint('#141516', 0.45), 0.021, 0.006, 0, 0, 0.003, 'z', 24);
  t.cyl(knob, t.paint('#1a1b1c', 0.45), 0.015, 0.018, 0, 0, 0.013, 'z', 20);
  t.box(knob, t.paint('#f0f0ec', 0.5), 0.0028, 0.013, 0.002, 0, 0.0085, 0.0225);
  // 0 points down-left (OFF) and the turn is clockwise.
  knob.rotation.z = Math.PI * 0.75 - proverDialTurn(setting);
  return panel;
}
