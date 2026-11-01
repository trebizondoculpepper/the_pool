import {
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { createCanvasTexture } from '../../components/core/views/screens';
import { brandById } from '../../components/core/logic/brands';
import {
  drawBrandMark,
  wordmarkFont,
} from '../../components/core/views/brand-logo';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import {
  beginPart,
  potentiometer,
  pushButton,
} from '../../components/core/parts/parts';
import type { PartSet } from '../../components/core/parts/parts';
import { LOCKED, asset } from '../../components/core/parts/building-part-tools';
import { recording } from '../../components/core/audio/part-audio';
import { createSelector } from '../../components/core/logic/world/components';
import { createXB4Selector } from '../../components/industrial-control/views/industrial-controls';
import { markTurnable } from '../../controls/input/knob-turning';
import { CO2_CABINET } from '../logic/co2-fittings';
import type {
  Co2Doser,
  Co2DoserKind,
  Co2DoserMode,
  Co2Fault,
} from '../../../game/plant/co2-dosing';

/**
 * The Veldkamp CV-310 CO₂ valve controller (the owner, 2026-11-01;
 * `doc/plans/co2-system.md`, "The control cabinet"): a slimline wall
 * cabinet from the maker of the MF-245C mass flow controller, in its
 * family's grey with its blue rule, after the compact steel enclosures
 * gas-handling makers build their controllers into (Rittal's KX and AE,
 * Fibox, Spelsberg) and the readout and control units of gas panels
 * (Brooks's 0254, Bronkhorst's E-8000, Alicat's control boxes).
 *
 * A slim back box fixed to the panel, and over it a lift-off service
 * cover, a shallow shell a little bigger all round, its edges well
 * rounded, hooked over the back box's top edge and held by one captive
 * tamper-resistant screw under its bottom lip, a sealing-wire hole beside
 * it; no hinge, no latch. Every control and lamp is on the cover's face,
 * so it never comes off in use: the POWER, FLOW and REMOTE lamps (8 mm
 * LEDs in chrome bezels), the ALARM window (six backlit legends, one lit
 * for the fault it holds), the REMOTE · LOCAL · OFF selector (OFF · ON on
 * the mass-flow model, whose instrument has its own LOCAL · REMOTE), the
 * LOCAL RATE potentiometer (a blanking plug in its hole on the mass-flow
 * model, whose set point is on its instrument), and RESET, an illuminated
 * pushbutton lit while a fault stands. Its rating plate on its face; its
 * cable glands on the back box's bottom face, behind and below the
 * cover's lip, and its earth stud beside them.
 *
 * It is a third party's product and knows nothing of what drives it: its
 * legends are a generic valve controller's (ANALOG IN 4–20 mA, REMOTE
 * ENABLE, EXT. INTERLOCK, FAULT RELAY). It holds nothing: `read` gives it
 * its doser each frame, and its controls call `controls`. Built in
 * metres, its origin on the backboard's face behind its middle, facing +z.
 */

/** The selector's positions, left to right as printed. */
export const CO2_CABINET_MODES: readonly Co2DoserMode[] = [
  'remote',
  'manual',
  'off',
];
export const CO2_CABINET_LEGEND = 'REMOTE · LOCAL · OFF';
/** The mass-flow model's switch, left to right as printed. */
export const CO2_CABINET_ON_LEGEND = 'OFF · ON';
/** The third status lamp's legend (the owner may make it AUTO). */
export const CO2_REMOTE_LAMP = 'REMOTE';

/** The ALARM window's legends, in its order: left column, then right. */
export const CO2_CABINET_FAULTS: readonly Co2Fault[] = [
  'gas-alarm',
  'no-supply-pressure',
  'no-water-flow',
  'signal-lost',
  'flow-not-proved',
  'valve-stuck',
];

/**
 * Each window's legend, the owner's words (2026-11-01), generic and short,
 * as a third party's gas valve controller would print them; the model's
 * fault ids stay. Retune them here.
 */
export const CO2_CABINET_FAULT_TEXT: Record<Co2Fault, string> = {
  /** The gas detector's interlock opening. */
  'gas-alarm': 'CO₂ GAS ALARM',
  /** Its inlet pressure low. */
  'no-supply-pressure': 'NO SUPPLY PRESS.',
  /** Its external permit (the process's flow switch) opening. */
  'no-water-flow': 'PROCESS INTERLOCK',
  /** Its 4–20 mA set point broken. */
  'signal-lost': 'LOOP FAIL',
  /** The gas's flow not proved by its meter. */
  'flow-not-proved': 'FLOW NOT PROVED',
  'valve-stuck': 'VALVE STUCK',
};

/** Its glands, left to right under the back box, and what each takes. */
export const CO2_CABINET_GLANDS = [
  { name: 'VALVE', x: -0.1, r: 0.0028, colour: '#7a7f83' },
  { name: 'ANALOG IN', x: -0.05, r: 0.003, colour: '#2f5d9a' },
  { name: 'EXT. INTERLOCK', x: 0, r: 0.0032, colour: '#b8281e' },
  { name: 'SUPPLY', x: 0.05, r: 0.0042, colour: '#2b2e31' },
] as const;

/** Its lamps: which are lit for a doser as it stands. */
export function co2CabinetLamps(d: Co2Doser) {
  return {
    power: d.powered,
    /** Flow proved: the meter reads it. */
    flow: d.powered && d.delivering > 0,
    remote: d.powered && d.mode === 'remote',
    fault: d.powered ? d.fault : null,
  };
}

export interface Co2CabinetControls {
  setMode(mode: Co2DoserMode): void;
  setManualRate(gh: number): void;
  reset(): void;
  setOn(on: boolean): void;
}

export interface Co2CabinetView {
  object: Group;
  update(): void;
  status(): string;
}

const DETENT = recording(asset('switch-click.wav'), 0.06);

/** The face's layout, metres from the cover's middle. */
const LAMP_Y = 0.205;
const WINDOW = { y: 0.103, w: 0.24, h: 0.082 } as const;
const ROW_Y = -0.005;
const SELECTOR_X = -0.075;
const POT_X = 0.075;
const RESET = { x: 0.075, y: -0.1 } as const;

export function createCo2ValveController(
  kit: PanelKit,
  kind: Co2DoserKind,
  read: () => { doser: Co2Doser },
  controls: Co2CabinetControls,
  parts: PartSet,
  name = 'CO₂ valve controller',
): Co2CabinetView {
  const t = tools(kit);
  const { w, h, d } = CO2_CABINET;
  const object = new Group();
  object.name = `Veldkamp CV-310 ${name}`;
  const brand = brandById('veldkamp');

  // ---- Materials ----------------------------------------------------------
  const grey = t.paint('#8d949a', 0.55, 0.15);
  const backGrey = t.paint('#7d8489', 0.6, 0.15);
  const black = t.paint('#16181a', 0.6);
  const hole = t.paint('#0c0d0e', 0.9);
  const stainless = t.paint('#c3c8cb', 0.3, 0.75);
  const brass = t.paint('#b6944c', 0.35, 0.75);
  const nylon = t.paint('#2a2c2f', 0.7);

  // ---- The back box, fixed to the panel ---------------------------------------
  const back = { w: w - 0.01, h: h - 0.01, d: 0.075 };
  const backBox = new Mesh(
    new RoundedBoxGeometry(back.w, back.h, back.d, 2, 0.003),
    backGrey,
  );
  backBox.position.z = back.d / 2;
  object.add(backBox);

  // ---- The lift-off cover: a shallow shell over it, 5 mm bigger all round ---------
  const cover = { d: 0.035, round: 0.009 };
  const coverZ = d - cover.d / 2;
  const shell = new Mesh(
    new RoundedBoxGeometry(w, h, cover.d, 4, cover.round),
    grey,
  );
  shell.position.z = coverZ;
  object.add(shell);
  // The shadow line where its rim stands off the back box.
  const rimZ = d - cover.d + 0.0015;
  t.box(object, hole, w - 0.004, 0.0015, 0.003, 0, h / 2 - 0.004, rimZ);
  for (const sx of [-1, 1])
    t.box(
      object,
      hole,
      0.0015,
      h - 0.008,
      0.003,
      sx * (w / 2 - 0.004),
      0,
      rimZ,
    );
  const faceZ = d;

  // Its captive screw, up through the middle of its bottom lip, a pin-hex
  // head (tamper-resistant), and the sealing-wire tab beside it.
  const lipY = -h / 2;
  const lipZ = d - cover.d / 2;
  t.cyl(object, stainless, 0.0038, 0.0022, 0, lipY - 0.0011, lipZ, 'y', 16);
  t.cyl(object, hole, 0.0013, 0.0006, 0, lipY - 0.0024, lipZ, 'y', 6);
  t.cyl(object, black, 0.0006, 0.0008, 0, lipY - 0.0028, lipZ, 'y', 6);
  t.box(object, stainless, 0.007, 0.0016, 0.007, 0.009, lipY - 0.0008, lipZ);
  t.cyl(object, hole, 0.0011, 0.0018, 0.0105, lipY - 0.0008, lipZ, 'y', 8);
  // Its sealing wire, through the tab and the screw head, and its lead seal.
  t.cyl(object, stainless, 0.0003, 0.012, 0.005, lipY - 0.0032, lipZ, 'x', 4);
  t.cyl(
    object,
    t.paint('#6d7074', 0.5, 0.4),
    0.0022,
    0.0018,
    0.012,
    lipY - 0.006,
    lipZ,
    'z',
    10,
  );

  // ---- Its face, printed: its marks, legends and the rating of its lamps ---------
  const faceW = w - 2 * cover.round;
  const faceH = h - 2 * cover.round;
  const twoWay = kind === 'mass-flow';
  const face = t.printed(
    faceW,
    faceH,
    (c, cw, ch) => {
      const mm = cw / (faceW * 1000);
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
      // Its maker's mark and wordmark, top left; its model and what it is, right.
      drawBrandMark(c, brand, px(-0.12), py(0.259), 7 * mm, '#8d949a');
      c.font = wordmarkFont(brand, 8 * mm);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = '#111315';
      c.fillText('VELDKAMP', px(-0.11), py(0.259));
      text('CV-310', 0.126, 0.265, 5.5, 'right');
      text(
        'CO₂ VALVE CONTROLLER',
        0.126,
        0.25,
        3.2,
        'right',
        '#1b1d20',
        'normal',
      );
      c.fillStyle = '#1f5fa8';
      c.fillRect(px(-0.126), py(0.242), 252 * mm, 0.8 * mm);
      // The lamps' legends, under them.
      const lamps = ['POWER', 'FLOW', CO2_REMOTE_LAMP];
      lamps.forEach((l, i) => text(l, (i - 1) * 0.06, LAMP_Y - 0.014, 3.2));
      // The ALARM window's caption.
      text(
        'ALARM',
        -WINDOW.w / 2,
        WINDOW.y + WINDOW.h / 2 + 0.009,
        3.2,
        'left',
      );
      // The selector's positions round it, and its name under it.
      const ticks = (
        x: number,
        y: number,
        angles: readonly number[],
        names: readonly string[],
      ) => {
        c.strokeStyle = '#111315';
        c.lineWidth = 0.5 * mm;
        angles.forEach((deg, k) => {
          const r = (deg * Math.PI) / 180;
          c.beginPath();
          c.moveTo(px(x + 0.0165 * Math.sin(r)), py(y + 0.0165 * Math.cos(r)));
          c.lineTo(px(x + 0.0195 * Math.sin(r)), py(y + 0.0195 * Math.cos(r)));
          c.stroke();
          text(
            names[k],
            x + 0.025 * Math.sin(r),
            y + 0.025 * Math.cos(r) + 0.001,
            2.8,
          );
        });
      };
      if (twoWay) ticks(SELECTOR_X, ROW_Y, [0, 45], ['OFF', 'ON']);
      else ticks(SELECTOR_X, ROW_Y, [-45, 0, 45], ['REMOTE', 'LOCAL', 'OFF']);
      text('MODE', SELECTOR_X, ROW_Y - 0.031, 3.2);
      if (!twoWay) text('LOCAL RATE', POT_X, ROW_Y + 0.031, 3.2);
      text('RESET', RESET.x, RESET.y - 0.025, 3.2);
      // Its terminals, as the installer's leaflet names them, by the reset.
      const terms = [
        'X1  ANALOG IN 4–20 mA SET POINT',
        'X2  REMOTE ENABLE (VOLT-FREE)',
        'X3  EXT. INTERLOCK (N/C)',
        'X4  PROCESS INTERLOCK (N/C)',
        'X5  FAULT RELAY OUT 2 A',
        'X6  VALVE OUT 24 Vdc',
      ];
      terms.forEach((s, k) =>
        text(s, -0.126, -0.082 - k * 0.0062, 2.3, 'left', '#24282b', 'normal'),
      );
      // Each gland's name, on the cover's foot, over the gland.
      for (const g of CO2_CABINET_GLANDS)
        text(g.name, g.x, -faceH / 2 + 0.006, 2.2, 'center', '#24282b');
      text('PE', 0.1, -faceH / 2 + 0.006, 2.2, 'center', '#24282b');
    },
    1024,
    false,
    1.5,
  );
  face.mesh.position.set(0, 0, faceZ + 0.0002);
  object.add(face.mesh);

  // Counterbored screws at its face's corners, holding the fascia carrier inside.
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const x = sx * (w / 2 - 0.016);
      const y = sy * (h / 2 - 0.016);
      t.cyl(object, hole, 0.0034, 0.0004, x, y, faceZ + 0.0003, 'z', 14);
      t.cyl(object, black, 0.0022, 0.0006, x, y, faceZ - 0.0006, 'z', 12);
    }

  // Its rating plate, riveted on below the terminal list.
  const plate = t.printed(
    0.1,
    0.05,
    (c, cw, ch) => {
      c.fillStyle = '#d9dcd8';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#2a2d30';
      c.lineWidth = 2;
      c.strokeRect(2, 2, cw - 4, ch - 4);
      c.fillStyle = '#16181a';
      const rows = [
        [brand.name.toUpperCase(), 0.11, true],
        [
          `TYPE CV-310-${twoWay ? '2' : '3'}   CO₂ VALVE CONTROLLER`,
          0.085,
          true,
        ],
        [`S/N ${twoWay ? '25B-04418' : '25B-04417'}   2025`, 0.08, false],
        ['SUPPLY 230 V~ 50 Hz  15 VA', 0.08, false],
        ['IN 4–20 mA · REMOTE ENABLE · EXT. INTERLOCK', 0.075, false],
        ['OUT VALVE 24 Vdc 8 W · FAULT RELAY 250 V~ 2 A', 0.075, false],
        ['IP65   Ta 0–45 °C   MADE IN THE NETHERLANDS', 0.075, false],
      ] as const;
      let y = ch * 0.15;
      for (const [s, size, bold] of rows) {
        c.font = `${bold ? 'bold ' : ''}${ch * size}px Arial`;
        c.textAlign = 'left';
        c.fillText(s, cw * 0.04, y);
        y += ch * (size + 0.035);
      }
      c.font = `bold ${ch * 0.1}px Arial`;
      c.fillText('CE', cw * 0.04, ch * 0.94);
      c.strokeRect(cw * 0.14, ch * 0.85, cw * 0.11, ch * 0.11);
      c.font = `bold ${ch * 0.065}px Arial`;
      c.fillText('UKCA', cw * 0.152, ch * 0.93);
      // Its rivets.
      c.fillStyle = '#9fa3a3';
      for (const [rx, ry] of [
        [0.94, 0.12],
        [0.94, 0.88],
      ]) {
        c.beginPath();
        c.arc(cw * rx, ch * ry, ch * 0.035, 0, Math.PI * 2);
        c.fill();
      }
    },
    512,
    false,
    1.5,
  );
  plate.mesh.position.set(-0.07, -0.2, faceZ + 0.0007);
  object.add(plate.mesh);

  // ---- Its status lamps: 8 mm LEDs in chrome bezels -------------------------------
  const lamp = (colour: string, x: number) => {
    t.cyl(
      object,
      stainless,
      0.0058,
      0.0016,
      x,
      LAMP_Y,
      faceZ + 0.0008,
      'z',
      16,
    );
    return t.led(object, colour, 0.004, x, LAMP_Y, faceZ + 0.0018);
  };
  const powerLamp = lamp('#f4f1e8', -0.06);
  const flowLamp = lamp('#3ddc5a', 0);
  const remoteLamp = lamp('#ffb000', 0.06);

  // ---- The ALARM window: six backlit legends behind one glass ----------------------
  t.box(
    object,
    black,
    WINDOW.w + 0.008,
    WINDOW.h + 0.008,
    0.002,
    0,
    WINDOW.y,
    faceZ + 0.001,
  );
  const winPx = { w: 600, h: Math.round((600 * WINDOW.h) / WINDOW.w) };
  const win = createCanvasTexture(winPx.w, winPx.h);
  kit.textures.push(win.texture);
  const winMaterial = new MeshBasicMaterial({
    map: win.texture,
    toneMapped: false,
  });
  kit.materials.push(winMaterial);
  const winMesh = new Mesh(new PlaneGeometry(WINDOW.w, WINDOW.h), winMaterial);
  winMesh.position.set(0, WINDOW.y, faceZ + 0.0022);
  winMesh.name = `${name}: ALARM window`;
  winMesh.userData.live = true;
  object.add(winMesh);
  const drawWindow = (lit: Co2Fault | null, powered: boolean) => {
    const c = win.context;
    const { w: cw, h: ch } = winPx;
    c.fillStyle = '#0d0e10';
    c.fillRect(0, 0, cw, ch);
    const gap = 6;
    const tw = (cw - gap * 3) / 2;
    const th = (ch - gap * 4) / 3;
    CO2_CABINET_FAULTS.forEach((f, k) => {
      const col = Math.floor(k / 3);
      const row = k % 3;
      const x = gap + col * (tw + gap);
      const y = gap + row * (th + gap);
      const on = lit === f;
      c.fillStyle = on ? '#ff4a35' : powered ? '#3e2826' : '#2a2b2c';
      c.fillRect(x, y, tw, th);
      c.fillStyle = on ? '#1a0806' : '#8d7f7c';
      const legend = CO2_CABINET_FAULT_TEXT[f];
      let size = th * 0.46;
      c.font = `bold ${size}px Arial`;
      const fits = c.measureText(legend).width;
      if (fits > tw * 0.9) {
        size *= (tw * 0.9) / fits;
        c.font = `bold ${size}px Arial`;
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(legend, x + tw / 2, y + th / 2 + 1);
    });
    win.texture.needsUpdate = true;
  };

  // ---- Its controls -----------------------------------------------------------------
  // The selector: a 22 mm XB4 short-handle selector, its own part (the
  // parts library's `createSelector`) bound through `read` and `controls`,
  // a use on its left turning it anticlockwise a detent, on its right
  // clockwise; its legends printed round it, none of the big plates.
  {
    const positions = twoWay ? 2 : 3;
    const names = (twoWay ? CO2_CABINET_ON_LEGEND : CO2_CABINET_LEGEND).split(
      ' · ',
    );
    const at = () =>
      twoWay
        ? read().doser.mode === 'off'
          ? 0
          : 1
        : CO2_CABINET_MODES.indexOf(read().doser.mode);
    const to = (i: number) =>
      twoWay ? controls.setOn(i === 1) : controls.setMode(CO2_CABINET_MODES[i]);
    const label = `${twoWay ? CO2_CABINET_ON_LEGEND : CO2_CABINET_LEGEND} selector`;
    const a = beginPart(kit, `${name}: ${label}`);
    a.object.position.set(SELECTOR_X, ROW_Y, faceZ);
    const view = createXB4Selector(kit, positions);
    a.object.add(view.group);
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
    a.voice(selector, { detent: DETENT, 'end-stop': LOCKED });
    a.uses.set(view.knob, (direction = 1) => selector.turn(direction));
    a.disposers.push(markTurnable(view.knob, selector), selector.dispose);
    let first = true;
    a.updates.push((delta) => {
      fresh.value++;
      view.set(selector.position.value);
      view.update(first ? 1 : delta);
      first = false;
    });
    a.shows(() => `at ${names[selector.position.value]}`);
    object.add(a.object);
    parts.add(a.part());
  }
  // The LOCAL RATE potentiometer (the share of the valve's most in LOCAL),
  // or, on the mass-flow model, a 22 mm blanking plug in its hole.
  if (!twoWay) {
    const most = () => read().doser.spec.most;
    const pot = parts.add(
      potentiometer(kit, {
        steps: 10,
        bound: {
          get value() {
            return Math.round((read().doser.manualRate / most()) * 10);
          },
          set: (k: number) => controls.setManualRate((k / 10) * most()),
        },
        name: `${name}: LOCAL RATE potentiometer`,
      }),
    );
    pot.object.position.set(POT_X, ROW_Y, faceZ);
    object.add(pot.object);
  } else {
    t.cyl(object, black, 0.0118, 0.004, POT_X, ROW_Y, faceZ + 0.002, 'z', 28);
    t.cyl(object, hole, 0.0102, 0.0006, POT_X, ROW_Y, faceZ + 0.0042, 'z', 28);
  }
  // RESET: a 22 mm illuminated pushbutton, blue (IEC 60073's reset), lit
  // while a fault stands.
  const faulted = signal(false);
  const reset = parts.add(
    pushButton(kit, {
      colour: 'blue',
      head: 'illuminated',
      lamp: faulted,
      name: `${name}: RESET`,
      action: () => controls.reset(),
    }),
  );
  reset.object.position.set(RESET.x, RESET.y, faceZ);
  object.add(reset.object);

  // ---- Its glands and earth stud, under the back box ------------------------------
  const glandY = -back.h / 2;
  const glandZ = back.d / 2 - 0.004;
  for (const g of CO2_CABINET_GLANDS) {
    t.cyl(object, nylon, 0.0085, 0.006, g.x, glandY - 0.003, glandZ, 'y', 6);
    t.cyl(object, nylon, 0.0072, 0.009, g.x, glandY - 0.0105, glandZ, 'y', 16);
    t.cyl(
      object,
      nylon,
      g.r + 0.0012,
      0.004,
      g.x,
      glandY - 0.017,
      glandZ,
      'y',
      12,
    );
  }
  t.cyl(object, brass, 0.0026, 0.012, 0.1, glandY - 0.006, glandZ, 'y', 6);
  t.cyl(object, brass, 0.0045, 0.0025, 0.1, glandY - 0.004, glandZ, 'y', 6);
  t.cyl(object, brass, 0.0045, 0.0025, 0.1, glandY - 0.0095, glandZ, 'y', 6);

  // ---- Each frame -----------------------------------------------------------------
  const lit = new Map<object, boolean>();
  const set = (l: { set(on: boolean): void }, on: boolean) => {
    if (lit.get(l) === on) return;
    lit.set(l, on);
    l.set(on);
  };
  let shown = '';
  return {
    object,
    update() {
      const { doser } = read();
      const lamps = co2CabinetLamps(doser);
      set(powerLamp, lamps.power);
      set(flowLamp, lamps.flow);
      set(remoteLamp, lamps.remote);
      const key = `${doser.powered}|${lamps.fault}`;
      if (key !== shown) {
        shown = key;
        drawWindow(lamps.fault, doser.powered);
        faulted.value = lamps.fault !== null;
      }
    },
    status() {
      const { doser } = read();
      const lamps = co2CabinetLamps(doser);
      const on = [
        lamps.power && 'POWER',
        lamps.flow && 'FLOW',
        lamps.remote && CO2_REMOTE_LAMP,
      ].filter(Boolean);
      return `lamps ${on.join(' ') || 'dark'}${lamps.fault ? ` · ALARM ${CO2_CABINET_FAULT_TEXT[lamps.fault]}` : ''}`;
    },
  };
}

/**
 * A cable on the panel: a tube along `points` (panel metres), in its
 * sheath's colour, or an earth lead's green and yellow.
 */
export function panelCable(
  kit: PanelKit,
  parent: Group,
  points: readonly (readonly [number, number, number])[],
  radius: number,
  /** Its sheath's colour, or 'earth' for green and yellow. */
  colour: string,
) {
  const t = tools(kit);
  let material: Material;
  if (colour === 'earth') {
    const stripes = createCanvasTexture(4, 16);
    stripes.context.fillStyle = '#2f8f3a';
    stripes.context.fillRect(0, 0, 4, 16);
    stripes.context.fillStyle = '#e8c822';
    stripes.context.fillRect(0, 0, 4, 6);
    stripes.texture.wrapS = stripes.texture.wrapT = RepeatWrapping;
    stripes.texture.repeat.set(24, 1);
    stripes.texture.needsUpdate = true;
    kit.textures.push(stripes.texture);
    material = createPs1Material({ map: stripes.texture, roughness: 0.6 });
    kit.materials.push(material);
  } else material = t.paint(colour, 0.7);
  const curve = new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
  );
  const mesh = new Mesh(
    new TubeGeometry(curve, Math.max(8, points.length * 8), radius, 8),
    material,
  );
  parent.add(mesh);
  return mesh;
}
