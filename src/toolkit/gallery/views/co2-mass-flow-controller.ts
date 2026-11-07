import {
  CatmullRomCurve3,
  Group,
  ExtrudeGeometry,
  Mesh,
  MeshBasicMaterial,
  Path,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { createCanvasTexture } from '../../components/core/views/screens';
import { setLcdBacklight } from '../../components/core/views/display-reach';
import { brandById } from '../../components/core/logic/brands';
import {
  drawBrandMark,
  wordmarkFont,
} from '../../components/core/views/brand-logo';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { beginPart } from '../../components/core/parts/parts';
import type { Part, PartSet } from '../../components/core/parts/parts';
import {
  KEY_TURN,
  LOCKED,
  PRESS,
  asset,
  emitter,
} from '../../components/core/parts/building-part-tools';
import { recording } from '../../components/core/audio/part-audio';
import type { SoundRecipe } from '../../components/core/audio/part-audio';
import { signal } from '@preact/signals-core';
import { createSelector } from '../../components/core/logic/world/components';
import { createKnob } from '../../components/industrial-control/views/panel-switchgear';
import { createLeverSelector } from '../../components/industrial-control/views/industrial-controls';
import { dot } from '../../components/industrial-control/logic/font-5x7';
import { markTurnable } from '../../controls/input/knob-turning';
import { CO2_OVERRIDES } from '../../../game/plant/co2-dosing';
import type { Co2Doser, Co2Override } from '../../../game/plant/co2-dosing';
import {
  MFC_PAGES,
  mfcFaultWords,
  mfcKey,
  mfcLines,
  nextMfcPage,
} from '../logic/co2-mfc-display';
import type { MfcPage } from '../logic/co2-mfc-display';

/**
 * The Olympic's CO₂ thermal mass flow controller (the owner, 2026-11-01;
 * `doc/plans/co2-system.md`, "The mass flow controller"): a Veldkamp
 * MF-245C, after Brooks's SLA5850, Bronkhorst's IN-FLOW and Alicat's MC,
 * at their size. A machined stainless flow body along its base, the gas
 * through it left to right (its engraved arrow), entering and leaving
 * through compression fittings on short stand-offs from its ends; on it, a
 * two-part clamshell housing with rounded corners and edges, its halves
 * held by counterbored cap screws and sealed by a gasket along its seam,
 * vent louvres in its ends, its rating plate on its left end. On its face:
 * a backlit 2 × 16 LCD behind a recessed window in its bezel, a sealed
 * membrane keypad (MODE, ▼, ▲), RUN and ALARM lamps, the LOCAL · REMOTE
 * rotary selector (a pointer knob) and the valve OVERRIDE key selector
 * (CLOSE · NORM · OPEN). An M12 connector on its top for its signal cable, an earth
 * stud on its flow body, two screws down through its base into its bracket.
 *
 * It holds nothing but the page its MODE key shows: `read` gives it its
 * panel each frame and its controls call `controls`. Built in metres, its
 * origin on its flow's axis at the flow body's middle, +x the flow's way,
 * facing +z; its bracket's foot at `MFC_SIZE.bracketBack` behind it.
 */

/** Its sizes, metres (`doc/plans/co2-system.md`, "The mass flow controller"). */
export const MFC_SIZE = {
  /** The flow body: length along the flow, height, depth. */
  body: { l: 0.08, h: 0.03, d: 0.036 },
  /** The clamshell housing on it. */
  housing: { l: 0.1, h: 0.1, d: 0.04 },
  /** Each end: the stand-off, the fitting's body hex and its nut. */
  standOff: 0.009,
  hexBody: 0.011,
  hexNut: 0.009,
  /** The tube its fittings take: 10 mm. */
  tube: 0.005,
} as const;

/** Its ends: where its fittings take the tube, ±x on the flow's axis. */
export const MFC_END =
  MFC_SIZE.body.l / 2 + MFC_SIZE.standOff + MFC_SIZE.hexBody + MFC_SIZE.hexNut;

/** Its housing's middle, over the flow's axis. */
const HOUSING_Y = MFC_SIZE.body.h / 2 + MFC_SIZE.housing.h / 2;

/** Its M12 connector's top, where its signal cable leaves. */
export const MFC_CONNECTOR: readonly [number, number, number] = [
  0.03,
  MFC_SIZE.body.h / 2 + MFC_SIZE.housing.h + 0.017,
  0,
];

export interface MfcReading {
  doser: Co2Doser;
  /** Its inlet's pressure, bar gauge. */
  inletBar: number;
}

export interface MfcControls {
  setHand(hand: boolean): void;
  /** LOCAL's set point, g/h (clamped by the model). */
  setManualRate(gh: number): void;
  setOverride(override: Co2Override): void;
}

/** ▲ and ▼ step LOCAL's set point by this, g/h: 50 on the 2 kg/h range, 10 on the 500 g/h. */
export const mfcRateStep = (range: number) => (range >= 1000 ? 50 : 10);

/**
 * Its range as printed (its full scale, g/h): "0–2 kg/h" or "0–500 g/h",
 * and its order code's range letters (RD2, 2 kg/h; RG5, 500 g/h).
 */
export const mfcRangeText = (range: number) =>
  range >= 1000 ? `0–${range / 1000} kg/h` : `0–${range} g/h`;
export const mfcRangeCode = (range: number) =>
  range >= 1000 ? `RD${range / 1000}` : `RG${range / 100}`;

export interface MfcView {
  object: Group;
  update(delta: number): void;
  status(): string;
  /** The page its MODE key shows (for a test, or a room's look). */
  page(): MfcPage;
}

/** A selector clicking over a detent, as the parts library's selectors sound. */
const DETENT = recording(asset('switch-click.wav'), 0.06);

/** Its rotary selectors' row on its face, and each one's place along it. */
const ROTARY_Y = -0.03;
const LOCAL_X = -0.026;
const OVERRIDE_X = 0.006;

export function createMassFlowController(
  kit: PanelKit,
  read: () => MfcReading,
  controls: MfcControls,
  parts: PartSet,
  name = 'CO₂ mass flow controller',
): MfcView {
  const t = tools(kit);
  const object = new Group();
  object.name = `Veldkamp MF-245C ${name}`;
  const { body, housing } = MFC_SIZE;

  // ---- Materials ------------------------------------------------------------
  const greyHousing = t.paint('#8d949a', 0.55, 0.15);
  const stainless = t.paint('#c3c8cb', 0.3, 0.75);
  const black = t.paint('#16181a', 0.6);
  const gasket = t.paint('#0c0d0e', 0.9);
  const zinc = t.paint('#a9adb0', 0.45, 0.6);
  const brass = t.paint('#b6944c', 0.35, 0.75);
  const cableGrey = t.paint('#7a7f83', 0.7);
  const keyBlue = t.paint('#2d5f9a', 0.45);
  // Light grey keys on a mid-grey keypad, MODE blue: nothing black, which
  // the game's lighting loses against the grey housing (the owner).
  const keyGrey = t.paint('#c3c7ca', 0.5);
  const geometry = (g: RoundedBoxGeometry, m: Material) => new Mesh(g, m);

  // ---- The flow body: machined stainless, the gas along its axis ---------------
  const flowBody = geometry(
    new RoundedBoxGeometry(body.l, body.h, body.d, 2, 0.0015),
    stainless,
  );
  object.add(flowBody);
  // Its front engraved, small, into the steel itself (the canvas clear
  // but for the cut lines): IN, the flow's arrow, OUT.
  const engraveW = body.l - 0.006;
  const engraveH = body.h - 0.008;
  const engraved = createCanvasTexture(
    512,
    Math.round((512 * engraveH) / engraveW),
  );
  {
    const c = engraved.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    const mm = cw / (engraveW * 1000);
    c.clearRect(0, 0, cw, ch);
    c.strokeStyle = c.fillStyle = 'rgba(52, 57, 61, 0.85)';
    c.lineWidth = 0.5 * mm;
    const y = ch / 2;
    c.beginPath();
    c.moveTo(cw / 2 - 12 * mm, y);
    c.lineTo(cw / 2 + 10 * mm, y);
    c.stroke();
    c.beginPath();
    c.moveTo(cw / 2 + 13 * mm, y);
    c.lineTo(cw / 2 + 9 * mm, y - 1.6 * mm);
    c.lineTo(cw / 2 + 9 * mm, y + 1.6 * mm);
    c.closePath();
    c.fill();
    c.font = `bold ${2 * mm}px Arial`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText('IN', 2 * mm, y);
    c.textAlign = 'right';
    c.fillText('OUT', cw - 2 * mm, y);
    engraved.texture.needsUpdate = true;
  }
  kit.textures.push(engraved.texture);
  const engravedPaint = createPs1Material({
    map: engraved.texture,
    transparent: true,
    roughness: 0.5,
  });
  kit.materials.push(engravedPaint);
  const engraving = new Mesh(
    new PlaneGeometry(engraveW, engraveH),
    engravedPaint,
  );
  engraving.position.set(0, 0, body.d / 2 + 0.0002);
  object.add(engraving);

  // Its ends: a stand-off from each, the fitting's body hex and its nut.
  for (const side of [-1, 1]) {
    let x = side * (body.l / 2);
    const piece = (m: Material, r: number, l: number, segments: number) => {
      t.cyl(object, m, r, l, x + (side * l) / 2, 0, 0, 'x', segments);
      x += side * l;
    };
    piece(stainless, 0.0055, MFC_SIZE.standOff, 16);
    piece(stainless, 0.0078, MFC_SIZE.hexBody, 6);
    piece(stainless, 0.0072, MFC_SIZE.hexNut, 6);
  }

  // Its bracket: a zinc-plated angle under the body, back to the panel,
  // two screws up through it into the body's base.
  const back = -0.04;
  const footY = -body.h / 2 - 0.0015;
  t.box(
    object,
    zinc,
    0.07,
    0.003,
    body.d / 2 - back,
    0,
    footY,
    (back + body.d / 2) / 2,
  );
  t.box(object, zinc, 0.07, 0.03, 0.003, 0, footY - 0.0135, back + 0.0015);
  for (const sx of [-0.026, 0.026])
    t.cyl(object, black, 0.0028, 0.002, sx, footY - 0.0025, 0, 'y', 10);
  // The earth lead's ring tag, under a nut on the bracket's leg.
  t.cyl(object, brass, 0.0026, 0.002, 0.03, -0.03, back + 0.004, 'z', 6);

  // Its earth stud, on the flow body's front corner, and its lead.
  t.cyl(
    object,
    brass,
    0.0026,
    0.004,
    0.034,
    -0.009,
    body.d / 2 + 0.002,
    'z',
    6,
  );
  t.cyl(
    object,
    brass,
    0.0012,
    0.007,
    0.034,
    -0.009,
    body.d / 2 + 0.004,
    'z',
    8,
  );
  const stripes = createCanvasTexture(4, 16);
  stripes.context.fillStyle = '#2f8f3a';
  stripes.context.fillRect(0, 0, 4, 16);
  stripes.context.fillStyle = '#e8c822';
  stripes.context.fillRect(0, 0, 4, 6);
  stripes.texture.wrapS = stripes.texture.wrapT = RepeatWrapping;
  stripes.texture.repeat.set(12, 1);
  stripes.texture.needsUpdate = true;
  kit.textures.push(stripes.texture);
  const earthPaint = createPs1Material({
    map: stripes.texture,
    roughness: 0.6,
  });
  kit.materials.push(earthPaint);
  const lead = new CatmullRomCurve3([
    new Vector3(0.034, -0.009, body.d / 2 + 0.005),
    new Vector3(0.04, -0.016, body.d / 2 + 0.006),
    new Vector3(0.036, -0.028, 0.0),
    new Vector3(0.03, -0.03, back + 0.006),
  ]);
  object.add(new Mesh(new TubeGeometry(lead, 16, 0.0016, 6), earthPaint));

  // ---- The clamshell housing: two halves, a gasket between --------------------
  const shell = new Group();
  shell.position.y = HOUSING_Y;
  object.add(shell);
  const half = housing.d / 2;
  const round = 0.006;
  for (const zs of [-1, 1]) {
    const m = geometry(
      new RoundedBoxGeometry(housing.l, housing.h, half + 0.002, 3, round),
      greyHousing,
    );
    m.position.z = zs * (half / 2 + 0.0005);
    shell.add(m);
  }
  // The gasket, black in the groove where the halves' edges round off: a
  // rounded-rectangle ring following the shell's outline, its corners on
  // the shell's radius and just inside it, so nothing stands proud.
  {
    const inset = 0.0008;
    const ring = <P extends Path>(
      hw: number,
      hh: number,
      r: number,
      path: P,
    ): P => {
      path.moveTo(-hw + r, -hh);
      path.lineTo(hw - r, -hh);
      path.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
      path.lineTo(hw, hh - r);
      path.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
      path.lineTo(-hw + r, hh);
      path.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
      path.lineTo(-hw, -hh + r);
      path.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
      return path;
    };
    const hw = housing.l / 2 - inset;
    const hh = housing.h / 2 - inset;
    const outline = ring(hw, hh, round - inset, new Shape());
    outline.holes.push(ring(hw - 0.004, hh - 0.004, round - 0.004, new Path()));
    const seal = new Mesh(
      new ExtrudeGeometry(outline, { depth: 0.003, bevelEnabled: false }),
      gasket,
    );
    seal.position.z = -0.0015;
    shell.add(seal);
  }
  const faceZ = housing.d / 2 + 0.0015;

  // Counterbored cap screws at its corners, through the front half.
  const screwAt = [
    [-0.04, 0.04],
    [0.04, 0.04],
    [-0.04, -0.04],
    [0.04, -0.04],
  ] as const;
  for (const [sx, sy] of screwAt) {
    t.cyl(shell, gasket, 0.0032, 0.0004, sx, sy, faceZ + 0.0001, 'z', 14);
    t.cyl(shell, black, 0.0021, 0.0006, sx, sy, faceZ - 0.0008, 'z', 12);
  }
  // A tamper-evident seal of red lacquer over the bottom right one.
  t.cyl(
    shell,
    t.paint('#c8321e', 0.3),
    0.0026,
    0.0008,
    0.04,
    -0.04,
    faceZ + 0.0002,
    'z',
    10,
  );

  // Vent louvres in both ends, upper half, on the front half only: each
  // slot on the flat of its end wall between the face's rounding and the
  // seam's, clear of the gasket by 6 mm. And its rating plate on its left.
  for (const ex of [-1, 1])
    for (let k = 0; k < 6; k++)
      t.box(
        shell,
        gasket,
        0.0012,
        0.0016,
        0.009,
        ex * (housing.l / 2 + 0.0003),
        0.04 - k * 0.0045,
        0.0105,
      );
  // Its range, as its rating plate and face print it: the doser's, read at
  // its first frame (nothing is read while it is built); the 2 kg/h
  // range until then.
  let range = 2000;
  const drawPlate = (c: CanvasRenderingContext2D, cw: number, ch: number) => {
    c.fillStyle = '#d9dcd8';
    c.fillRect(0, 0, cw, ch);
    c.strokeStyle = '#2a2d30';
    c.lineWidth = 2;
    c.strokeRect(1, 1, cw - 2, ch - 2);
    c.fillStyle = '#16181a';
    const rows = [
      ['VELDKAMP MASSFLOW B.V.', 0.1, true],
      [`MF-245C-${mfcRangeCode(range)}`, 0.1, true],
      ['S/N 24C-07193', 0.08, false],
      ['GAS  CO₂', 0.08, false],
      [`RANGE  ${mfcRangeText(range)}`, 0.08, false],
      ['SUPPLY  24 Vdc  6 W', 0.08, false],
      ['P max 10 bar   IP65', 0.08, false],
      ['NETHERLANDS', 0.07, false],
    ] as const;
    let y = ch * 0.13;
    for (const [text, size, bold] of rows) {
      c.font = `${bold ? 'bold ' : ''}${ch * size}px Arial`;
      c.textAlign = 'left';
      c.fillText(text, cw * 0.06, y);
      y += ch * (size + 0.025);
    }
    c.font = `bold ${ch * 0.1}px Arial`;
    c.fillText('CE', cw * 0.06, ch * 0.95);
    c.strokeRect(cw * 0.32, ch * 0.86, cw * 0.22, ch * 0.1);
    c.font = `bold ${ch * 0.06}px Arial`;
    c.fillText('UKCA', cw * 0.34, ch * 0.935);
  };
  const plate = t.printed(0.032, 0.036, drawPlate, 256);
  plate.mesh.rotation.y = -Math.PI / 2;
  plate.mesh.position.set(-housing.l / 2 - 0.0006, -0.022, 0);
  shell.add(plate.mesh);

  // Its M12 connector on the top, its coupling nut and the cable's boot.
  const topY = housing.h / 2;
  t.cyl(shell, stainless, 0.0065, 0.004, 0.03, topY + 0.002, 0, 'y', 16);
  t.cyl(shell, black, 0.0075, 0.009, 0.03, topY + 0.0085, 0, 'y', 6);
  t.cyl(shell, cableGrey, 0.005, 0.006, 0.03, topY + 0.016, 0, 'y', 12);

  // ---- Its face, printed on one canvas ---------------------------------------
  const brand = brandById('veldkamp');
  // Its flat, inside the rounding of its edges.
  const faceW = housing.l - 2 * round;
  const faceH = housing.h - 2 * round;
  const drawFace = (c: CanvasRenderingContext2D, cw: number, ch: number) => {
    const mm = cw / (faceW * 1000);
    // Metres on the face to pixels, its middle the housing's.
    const px = (x: number) => cw / 2 + x * 1000 * mm;
    const py = (y: number) => ch / 2 - y * 1000 * mm;
    c.fillStyle = '#8d949a';
    c.fillRect(0, 0, cw, ch);
    const text = (
      s: string,
      x: number,
      y: number,
      size: number,
      align: CanvasTextAlign = 'center',
      ink = '#111315',
      weight = 'bold',
    ) => {
      c.font = `${weight} ${size * mm}px Arial`;
      c.textAlign = align;
      c.textBaseline = 'middle';
      c.fillStyle = ink;
      c.fillText(s, px(x), py(y));
    };
    // Its maker's mark and wordmark, top left; its model, top right.
    drawBrandMark(c, brand, px(-0.032), py(0.039), 2.6 * mm, '#8d949a');
    c.font = wordmarkFont(brand, 3 * mm);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#111315';
    c.fillText('VELDKAMP', px(-0.028), py(0.039));
    text(
      `MF-245C  ${mfcRangeText(range)} CO₂`,
      0.035,
      0.039,
      2,
      'right',
      '#1b1d20',
      'normal',
    );
    // A thin blue accent rule under them.
    c.fillStyle = '#1f5fa8';
    c.fillRect(px(-0.036), py(0.0345), 72 * mm, 0.6 * mm);
    // The membrane keypad's panel: dark, its keys' legends.
    c.fillStyle = '#7b8288';
    c.beginPath();
    c.roundRect(px(-0.039), py(-0.0015), 48 * mm, 16 * mm, 1.5 * mm);
    c.fill();
    text('MODE', -0.032, -0.0155, 1.6, 'center', '#e8e8e2');
    text('▼', -0.016, -0.0155, 1.8, 'center', '#e8e8e2');
    text('▲', 0.0, -0.0155, 1.8, 'center', '#e8e8e2');
    // Its lamps' legends.
    text('RUN', 0.022, -0.0155, 1.5);
    text('ALARM', 0.036, -0.0155, 1.5);
    // Its rotary selectors' positions round them, 45° either side of
    // upright, a tick at each, and each one's name under it.
    const ticks = (x: number, angles: readonly number[], ink: string) => {
      c.strokeStyle = ink;
      c.lineWidth = 0.35 * mm;
      for (const deg of angles) {
        const r = (deg * Math.PI) / 180;
        c.beginPath();
        c.moveTo(
          px(x + 0.0052 * Math.sin(r)),
          py(ROTARY_Y + 0.0052 * Math.cos(r)),
        );
        c.lineTo(
          px(x + 0.0066 * Math.sin(r)),
          py(ROTARY_Y + 0.0066 * Math.cos(r)),
        );
        c.stroke();
      }
    };
    ticks(LOCAL_X, [-45, 45], '#111315');
    text('LOCAL', LOCAL_X - 0.0068, ROTARY_Y + 0.0078, 1.4);
    text('REMOTE', LOCAL_X + 0.0068, ROTARY_Y + 0.0078, 1.4);
    text('SET POINT', LOCAL_X, ROTARY_Y - 0.0095, 1.3);
    ticks(OVERRIDE_X, [-45, 0, 45], '#7a1410');
    text('CLOSE', OVERRIDE_X - 0.0072, ROTARY_Y + 0.0078, 1.5);
    text('NORM', OVERRIDE_X, ROTARY_Y + 0.0088, 1.5);
    text('OPEN', OVERRIDE_X + 0.0072, ROTARY_Y + 0.0078, 1.5);
    text(
      'VALVE OVERRIDE',
      OVERRIDE_X,
      ROTARY_Y - 0.0095,
      1.3,
      'center',
      '#7a1410',
    );
    // Its calibration sticker, beside the sealed screw.
    c.fillStyle = '#f4f1e4';
    c.fillRect(px(0.0235), py(-0.0365), 12.5 * mm, 7 * mm);
    c.strokeStyle = '#1f5fa8';
    c.lineWidth = 0.4 * mm;
    c.strokeRect(px(0.0235), py(-0.0365), 12.5 * mm, 7 * mm);
    text('CAL', 0.03, -0.039, 1.6);
    text('2026-03-12', 0.03, -0.0415, 1.1, 'center', '#1b1d20', 'normal');
  };
  const face = t.printed(faceW, faceH, drawFace, 512, false, 1.5);
  face.mesh.position.set(0, 0, faceZ + 0.0002);
  shell.add(face.mesh);

  // ---- The LCD, behind a recessed window in its bezel ------------------------
  const lcdY = 0.018;
  t.box(shell, black, 0.08, 0.031, 0.0016, 0, lcdY, faceZ + 0.0008);
  // The bezel's recess, and the window's glass in it.
  t.box(shell, gasket, 0.071, 0.023, 0.0006, 0, lcdY, faceZ + 0.0013);
  const COLS = 16;
  const lcdPx = { w: 400, h: 100 };
  const lcd = createCanvasTexture(lcdPx.w, lcdPx.h, 'lcd');
  kit.textures.push(lcd.texture);
  const lcdMaterial = new MeshBasicMaterial({
    map: lcd.texture,
    toneMapped: false,
  });
  kit.materials.push(lcdMaterial);
  const lcdMesh = new Mesh(new PlaneGeometry(0.066, 0.0165), lcdMaterial);
  lcdMesh.position.set(0, lcdY, faceZ + 0.0017);
  lcdMesh.name = `${name}: LCD`;
  lcdMesh.userData.live = true;
  shell.add(lcdMesh);
  // Its character dots: an HD44780 module's, each character 5 × 8 dots
  // (its ROM's 5 × 7 font, `font-5x7.ts`, over the cursor's row) in its own
  // cell, a dot's width between cells and between its two rows; 4 px a dot.
  const DOT = 4;
  const cellW = 6 * DOT;
  const rowH = 9 * DOT;
  const left = (lcdPx.w - (COLS * cellW - DOT)) / 2;
  const top = (lcdPx.h - (2 * rowH - DOT)) / 2;
  const drawLcd = (lines: readonly [string, string]) => {
    const c = lcd.context;
    const { w, h } = lcdPx;
    // A yellow-green STN panel, its LED backlight behind: dark dots, the
    // unlit ones just showing.
    c.fillStyle = '#b5cf3a';
    c.fillRect(0, 0, w, h);
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < COLS; k++) {
        const ch = lines[r][k] ?? ' ';
        const x0 = left + k * cellW;
        const y0 = top + r * rowH;
        for (let dy = 0; dy < 8; dy++)
          for (let dx = 0; dx < 5; dx++) {
            const lit = dy < 7 && ch !== ' ' && dot(ch, dx, dy);
            c.fillStyle = lit ? '#1b2410' : 'rgba(70, 92, 10, 0.16)';
            c.fillRect(x0 + dx * DOT, y0 + dy * DOT, DOT - 0.6, DOT - 0.6);
          }
      }
    lcd.texture.needsUpdate = true;
  };

  // ---- Its lamps -----------------------------------------------------------
  const runLamp = t.led(
    shell,
    '#3ddc5a',
    0.0016,
    0.022,
    -0.009,
    faceZ + 0.0006,
  );
  const alarmLamp = t.led(
    shell,
    '#ff3b2f',
    0.0016,
    0.036,
    -0.009,
    faceZ + 0.0006,
  );

  // ---- Its controls --------------------------------------------------------
  let page: MfcPage = MFC_PAGES[0];
  const key = (
    label: string,
    x: number,
    material: Material,
    action: () => void,
  ): Part => {
    const a = beginPart(kit, `${name}: ${label} key`);
    a.object.position.set(x, -0.009, faceZ);
    // A sealed membrane key: its tactile dome just raised.
    const dome = t.cyl(
      a.object,
      material,
      0.0036,
      0.0012,
      0,
      0,
      0.0004,
      'z',
      16,
    );
    dome.userData.live = true;
    const e = emitter();
    a.voice(e, { press: PRESS });
    let pressed = 0;
    a.uses.set(dome, () => {
      pressed = 0.12;
      dome.position.z = -0.0002;
      e.emit('press');
      action();
    });
    a.cue(dome, () => ({ gesture: 'push', possible: read().doser.powered }));
    a.updates.push((delta) => {
      if (pressed <= 0) return;
      pressed -= delta;
      if (pressed <= 0) dome.position.z = 0.0004;
    });
    shell.add(a.object);
    return parts.add(a.part());
  };
  key('MODE', -0.032, keyBlue, () => {
    if (read().doser.powered) page = nextMfcPage(page);
  });
  const nudge = (sign: 1 | -1) => {
    const { doser } = read();
    if (!doser.powered) return;
    controls.setManualRate(
      doser.manualRate + sign * mfcRateStep(doser.spec.most),
    );
  };
  key('▼', -0.016, keyGrey, () => nudge(-1));
  key('▲', 0, keyGrey, () => nudge(1));

  // Its two rotary selectors, each a selector of the parts library
  // (`createSelector`) bound to the doser through `read` and `controls`: a
  // use on its left half turns it anticlockwise a detent, on its right half
  // clockwise (`knobDirection`; LB and RB on a pad), with the turn cue, and
  // it clicks over each detent. Its binding reads a plain value, so a tick
  // the binding reads makes it look afresh (as the parts library's
  // selectors do, mission 114).
  const rotary = (
    label: string,
    x: number,
    view: {
      object: Object3D;
      shaft: Object3D;
      set(i: number): void;
      update(delta: number): void;
    },
    positions: number,
    at: () => number,
    to: (i: number) => void,
    sound: SoundRecipe,
    names: readonly string[],
  ) => {
    const a = beginPart(kit, `${name}: ${label}`);
    a.object.position.set(x, ROTARY_Y, faceZ);
    a.object.add(view.object);
    const fresh = signal(0);
    const last = positions - 1;
    const selector = createSelector({
      positions,
      bound: {
        get value() {
          void fresh.value;
          return at() / last;
        },
        set(share: number) {
          to(Math.round(share * last));
          fresh.value++;
        },
      },
    });
    a.voice(selector, { detent: sound, 'end-stop': LOCKED });
    a.uses.set(view.shaft, (direction = 1) => selector.turn(direction));
    a.disposers.push(markTurnable(view.shaft, selector), selector.dispose);
    // Its first frame puts it straight at its detent; after that it eases.
    let first = true;
    a.updates.push((delta) => {
      fresh.value++;
      view.set(selector.position.value);
      view.update(first ? 1 : delta);
      first = false;
    });
    a.shows(() => `set to ${names[selector.position.value]}`);
    shell.add(a.object);
    parts.add(a.part());
  };

  // LOCAL · REMOTE: the parts library's pointer knob (`createKnob`, its
  // `pointer` style) in light grey, 9 mm across, on a stainless bush; two
  // detents, 45° either side of upright, LOCAL to the left and REMOTE to the right:
  // where it takes its set point, its own ▲ ▼ or the 4-20 mA input. The
  // model calls LOCAL `hand` (its field, kept to keep the save).
  {
    const object = new Group();
    t.cyl(object, stainless, 0.0042, 0.0012, 0, 0, 0.0006, 'z', 6);
    const knob = createKnob(kit, {
      radius: 0.0045,
      style: 'pointer',
      body: '#a9aeb2',
      pointer: '#141414',
    });
    knob.group.position.z = 0.0012;
    knob.spindle.userData.live = true;
    object.add(knob.group);
    const view = {
      object,
      shaft: knob.spindle,
      set: (i: number) => knob.set(i ? 2 / 3 : 1 / 3),
      update: knob.update,
    };
    rotary(
      'LOCAL · REMOTE selector',
      LOCAL_X,
      view,
      2,
      () => (read().doser.hand ? 0 : 1),
      (i) => controls.setHand(i === 0),
      DETENT,
      ['LOCAL', 'REMOTE'],
    );
  }

  // The valve OVERRIDE: a key-operated selector (the parts library's
  // `createLeverSelector` with its key, at a third of its size), as forcing
  // switches are, in place of a guard: CLOSE 45° anticlockwise, NORM
  // upright, OPEN 45° clockwise, its key's bow the pointer. The operator's
  // key stays in its barrel (the game has no keys to carry yet).
  {
    const lever = createLeverSelector(kit, 3, {
      key: true,
      bow: '#a9aeb2',
      ring: ['#8a8f93', '#a9aeb2'],
    });
    lever.group.scale.setScalar(0.3);
    lever.knob.userData.live = true;
    const object = new Group();
    object.add(lever.group);
    rotary(
      'valve OVERRIDE key selector',
      OVERRIDE_X,
      {
        object,
        shaft: lever.knob,
        set: (i) => lever.set(i),
        update: (delta) => lever.update(delta),
      },
      CO2_OVERRIDES.length,
      () => CO2_OVERRIDES.indexOf(read().doser.override),
      (i) => controls.setOverride(CO2_OVERRIDES[i]),
      KEY_TURN,
      CO2_OVERRIDES.map((o) => (o === 'normal' ? 'NORM' : o.toUpperCase())),
    );
  }

  // ---- Each frame ------------------------------------------------------------
  let shownKey = '';
  let lit: boolean | null = null;
  let run: boolean | null = null;
  let alarm: boolean | null = null;
  return {
    object,
    page: () => page,
    update() {
      const { doser, inletBar } = read();
      if (doser.spec.most !== range) {
        range = doser.spec.most;
        for (const [p, draw] of [
          [plate, drawPlate],
          [face, drawFace],
        ] as const) {
          draw(p.context, p.context.canvas.width, p.context.canvas.height);
          p.texture.needsUpdate = true;
        }
      }
      if (doser.powered !== lit) {
        lit = doser.powered;
        setLcdBacklight(lcdMaterial, lit);
      }
      const lines = mfcLines(doser, inletBar, page);
      const k = mfcKey(lines);
      if (k !== shownKey) {
        shownKey = k;
        drawLcd(lines);
      }
      const running = doser.powered && doser.delivering > 0;
      if (running !== run) runLamp.set((run = running));
      const alarmed = doser.powered && doser.fault !== null;
      if (alarmed !== alarm) alarmLamp.set((alarm = alarmed));
    },
    status() {
      const { doser, inletBar } = read();
      const [l1, l2] = mfcLines(doser, inletBar, page);
      return `display “${l1.trim()} / ${l2.trim()}” · ${doser.hand ? 'LOCAL' : 'REMOTE'} · override ${doser.override.toUpperCase()} · ${mfcFaultWords(doser)}`;
    },
  };
}
