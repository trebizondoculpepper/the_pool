import { Group, LinearFilter, Mesh, NearestFilter, PlaneGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitGlow } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createCanvasTexture } from '../../core/views/screens';
import { createBrandBadge } from '../../core/views/brand-badge';
import { beginPart, createPartSet, selector } from '../../core/parts/parts';
import type { PartSet } from '../../core/parts/parts';
import { membraneKey } from '../../core/parts/small-parts';
import { jogDial } from '../../core/parts/jog-dial';
import { partAudio, recording } from '../../core/audio/part-audio';
import { describe } from './describe';
import {
  FLAME_HZ,
  SCREEN_H,
  SCREEN_W,
  boilerLed,
  canPush,
  canTurn,
  cascadeInput,
  cascadeScreen,
  cascadeTick,
  drawCascadeScreen,
  newCascadeUi,
  screenKey,
  statusLed,
} from '../logic/cascade-manager';
import type {
  CascadeEdit,
  CascadeInput,
  CascadeManagerView,
  CascadeScreen,
  LedColour,
  PlantEnable,
} from '../logic/cascade-manager';

/**
 * The Hamwarmy CM6 boiler cascade manager (mission 122,
 * `doc/plans/122-cascade-manager.md`): a 2010s wall-mounted sequence
 * controller for up to six boilers, 300 × 240 × 85 mm, in a rounded
 * light-grey ABS case. On its dark fascia a 240 × 128 dot FSTN graphic
 * display (95 × 51 mm, white LED backlight), a 38 mm turn-and-push knob
 * with HOME, BACK and INFO keys beneath it, a tri-colour LED for each
 * boiler and one for the unit; below, a hinged flap over its terminals,
 * its Modbus RTU and BACnet MS/TP ports, a USB service socket and its
 * SERVICE key. Beside it, in its own small box, the key-operated PLANT
 * ENABLE switch (OFF · AUTO · HAND), a local safety control.
 *
 * It holds none of the plant: `control` gives it a `CascadeManagerView`
 * each frame (its owner caches it per world step) and takes its edits.
 * Its display draws only when what it shows changes, at most six times a
 * second, its flames flickering at five frames a second.
 */

export interface CascadeManagerControl {
  view(): CascadeManagerView;
  /** A confirmed edit from the menus. */
  edit(edit: CascadeEdit): void;
  /** The PLANT ENABLE key switch turned. */
  setEnable(enable: PlantEnable): void;
}

/** The case and the key-switch box, metres. */
export const CM6_SIZE = { w: 0.3, h: 0.24, d: 0.085 };
export const ENABLE_BOX = { w: 0.09, h: 0.13, d: 0.065, gap: 0.03 };
/** The whole installation's width, case and key-switch box. */
export const CM6_INSTALLED_WIDTH = CM6_SIZE.w + ENABLE_BOX.gap + ENABLE_BOX.w;

const ENABLES: readonly PlantEnable[] = ['off', 'auto', 'hand'];

const LED_COLOURS: Record<LedColour, string> = {
  off: '#2a2d2a',
  green: '#3bff5c',
  amber: '#ffb21c',
  red: '#ff3524',
};

/** The display's colours: FSTN, dark dots on a white-lit field. */
const FIELD = [222, 232, 230];
const DOTS = [28, 38, 52];
const UNLIT = [74, 80, 78];

/** The flap's hinge: it drops forward and down to open. */
const FLAP_OPEN = Math.PI * 0.55;

const FLAP_SOUND = recording(
  new URL('../../core/audio/assets/switch-click.wav', import.meta.url),
  0.05,
);

export function createCascadeManager(
  kit: PanelKit,
  control: CascadeManagerControl,
) {
  const t = tools(kit);
  const group = new Group();
  const parts: PartSet = createPartSet();
  const { w, h, d } = CM6_SIZE;
  const unit = describe(
    new Group(),
    'Hamwarmy CM6 boiler cascade manager',
    () => status(),
  );
  group.add(unit);

  // The case: light grey, rounded, standing off the wall on its back.
  const caseGrey = t.paint('#d9dcd8', 0.55);
  const shell = new Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.014), caseGrey);
  shell.position.z = d / 2;
  unit.add(shell);
  const front = d;
  // The fascia: a dark polycarbonate window over the upper two thirds.
  const fasciaH = 0.165;
  const fasciaY = h / 2 - 0.012 - fasciaH / 2;
  t.box(
    unit,
    t.paint('#33383c', 0.35),
    w - 0.024,
    fasciaH,
    0.002,
    0,
    fasciaY,
    front + 0.001,
  );
  const onFascia = front + 0.002;
  const ink = '#d8dcdc';
  // The maker's name across its top.
  const badge = createBrandBadge(kit, 'hamwarmy', {
    height: 0.012,
    ink: '#f3efe6',
  });
  badge.position.set(
    -w / 2 + 0.06,
    fasciaY + fasciaH / 2 - 0.013,
    onFascia + 0.0005,
  );
  unit.add(badge);
  t.label(
    unit,
    'CM6 CASCADE MANAGER',
    w / 2 - 0.065,
    fasciaY + fasciaH / 2 - 0.013,
    onFascia + 0.0005,
    0.0055,
    ink,
  );

  // The display: 95 × 51 mm behind a black mask.
  const dispW = 0.095;
  const dispH = (dispW * SCREEN_H) / SCREEN_W;
  const dispX = -0.045;
  const dispY = fasciaY + 0.018;
  t.box(
    unit,
    t.paint('#121416', 0.3),
    dispW + 0.012,
    dispH + 0.012,
    0.001,
    dispX,
    dispY,
    onFascia + 0.0005,
  );
  const art = createCanvasTexture(SCREEN_W, SCREEN_H, 'lcd', { maxHz: 6 });
  art.texture.magFilter = NearestFilter;
  art.texture.minFilter = LinearFilter;
  art.texture.generateMipmaps = false;
  kit.textures.push(art.texture);
  const glass = kitGlow(kit, '#ffffff');
  glass.map = art.texture;
  const screen = new Mesh(new PlaneGeometry(dispW, dispH), glass);
  screen.position.set(dispX, dispY, onFascia + 0.0012);
  screen.userData.live = true;
  unit.add(screen);
  const image = art.context.createImageData(SCREEN_W, SCREEN_H);
  const paint = (s: CascadeScreen) => {
    const f = drawCascadeScreen(s);
    const off = s.kind === 'off';
    const px = image.data;
    for (let i = 0; i < f.dots.length; i++) {
      const c = off ? UNLIT : f.dots[i] ? DOTS : FIELD;
      px[i * 4] = c[0];
      px[i * 4 + 1] = c[1];
      px[i * 4 + 2] = c[2];
      px[i * 4 + 3] = 255;
    }
    art.context.putImageData(image, 0, 0);
    art.texture.needsUpdate = true;
  };

  // The boiler LEDs in a row under the display, and the unit's own.
  const ledY = dispY - dispH / 2 - 0.018;
  t.label(
    unit,
    'BOILERS',
    dispX - dispW / 2 + 0.012,
    ledY + 0.009,
    onFascia + 0.0005,
    0.004,
    ink,
  );
  const led = (x: number, y: number) => {
    t.cyl(
      unit,
      t.paint('#16181a', 0.4),
      0.0032,
      0.001,
      x,
      y,
      onFascia + 0.0005,
      'z',
      14,
    );
    const lens = kitGlow(kit, LED_COLOURS.off);
    const dome = new Mesh(
      new RoundedBoxGeometry(0.004, 0.004, 0.002, 2, 0.0009),
      lens,
    );
    dome.position.set(x, y, onFascia + 0.0015);
    unit.add(dome);
    let shown: LedColour = 'off';
    return (c: LedColour) => {
      if (c === shown) return;
      shown = c;
      lens.color.set(LED_COLOURS[c]);
    };
  };
  const boilerLeds = Array.from({ length: 6 }, (_, i) => {
    const x = dispX - dispW / 2 + 0.008 + i * 0.013;
    t.label(unit, `B${i + 1}`, x, ledY - 0.007, onFascia + 0.0005, 0.0035, ink);
    return led(x, ledY);
  });
  const statusX = dispX + dispW / 2 + 0.004;
  t.label(
    unit,
    'STATUS',
    statusX,
    ledY - 0.007,
    onFascia + 0.0005,
    0.0035,
    ink,
  );
  const unitLed = led(statusX, ledY);

  // The knob and its three keys, right of the display.
  let ui = newCascadeUi();
  let edited: CascadeEdit | null = null;
  const input = (i: CascadeInput) => {
    const out = cascadeInput(ui, control.view(), i);
    ui = out.ui;
    if (out.edit) {
      edited = out.edit;
      control.edit(out.edit);
    }
  };
  const knobX = 0.088;
  const knob = parts.add(
    jogDial(kit, {
      name: 'CM6 turn-and-push knob',
      onTurn: (direction) => input({ kind: 'turn', direction }),
      onPush: () => input({ kind: 'push' }),
      canTurn: (direction) => canTurn(ui, control.view(), direction),
      canPush: () => canPush(ui, control.view()),
    }),
  );
  knob.object.position.set(knobX, dispY + 0.014, onFascia);
  unit.add(knob.object);
  t.label(
    unit,
    'TURN · PUSH',
    knobX,
    dispY - 0.016,
    onFascia + 0.0005,
    0.0035,
    ink,
  );
  // Light grey keys, INFO blue (the owner, 2026-11-02: no black or
  // near-black buttons, which render badly).
  const keys: [string, 'home' | 'back' | 'info', string][] = [
    ['HOME', 'home', '#c9cdd0'],
    ['BACK', 'back', '#c9cdd0'],
    ['INFO', 'info', '#3f74b8'],
  ];
  keys.forEach(([legend, k, colour], i) => {
    const key = parts.add(
      membraneKey(kit, {
        legend,
        colour,
        ink,
        name: `CM6 ${legend} key`,
        action: () => input({ kind: 'key', key: k }),
      }),
    );
    key.object.position.set(knobX - 0.034 + i * 0.034, ledY - 0.002, onFascia);
    unit.add(key.object);
  });

  // The flap over the terminals: hinged at its foot, it drops open.
  const flapH = h - fasciaH - 0.03;
  const flapY = -h / 2 + 0.008;
  const bay = t.paint('#262a2d', 0.6);
  t.box(
    unit,
    bay,
    w - 0.03,
    flapH - 0.006,
    0.002,
    0,
    flapY + flapH / 2,
    front - 0.004,
  );
  // Behind it: a row of green rising-clamp terminals, the bus ports, USB.
  const terminals = t.paint('#2f8a4a', 0.6);
  for (let k = 0; k < 22; k++)
    t.box(
      unit,
      terminals,
      0.0095,
      0.012,
      0.01,
      -w / 2 + 0.03 + k * 0.0102,
      flapY + flapH * 0.35,
      front - 0.002,
    );
  t.label(
    unit,
    'MAINS  BUS 1-6  HDR  RTN  OAT  ENABLE  ALARM',
    -0.03,
    flapY + flapH * 0.35 + 0.012,
    front,
    0.003,
    '#c8ccc8',
  );
  t.box(
    unit,
    t.paint('#b9bcbf', 0.3, 0.6),
    0.012,
    0.0045,
    0.006,
    w / 2 - 0.045,
    flapY + flapH * 0.68,
    front - 0.001,
  );
  t.label(
    unit,
    'USB',
    w / 2 - 0.045,
    flapY + flapH * 0.68 + 0.007,
    front,
    0.003,
    '#c8ccc8',
  );
  t.label(
    unit,
    'MODBUS RTU · BACnet MS/TP',
    -0.07,
    flapY + flapH * 0.72,
    front,
    0.0035,
    '#c8ccc8',
  );
  const service = parts.add(
    membraneKey(kit, {
      legend: 'SERVICE',
      colour: '#a8402c',
      ink: '#e4e0d8',
      name: 'CM6 SERVICE key',
      action: () => input({ kind: 'key', key: 'service' }),
    }),
  );
  service.object.position.set(
    w / 2 - 0.085,
    flapY + flapH * 0.6,
    front - 0.003,
  );
  service.object.scale.setScalar(0.8);
  unit.add(service.object);
  // The flap itself, a part of its own.
  const flapPart = beginPart(kit, 'CM6 terminal flap');
  const hinge = new Group();
  hinge.userData.live = true;
  hinge.position.set(0, flapY, front + 0.001);
  flapPart.object.add(hinge);
  t.box(hinge, caseGrey, w - 0.024, flapH, 0.004, 0, flapH / 2, 0.002);
  t.box(
    hinge,
    t.paint('#b9bdb9', 0.6),
    0.05,
    0.004,
    0.002,
    0,
    flapH - 0.008,
    0.0045,
  );
  t.label(
    hinge,
    'TERMINALS · COMMS · SERVICE',
    0,
    flapH / 2,
    0.0045,
    0.0045,
    '#5d625f',
  );
  let flapOpen = false;
  // The whole flap, its grip and label too, is the use's target.
  flapPart.uses.set(hinge, () => {
    flapOpen = !flapOpen;
    partAudio.play(FLAP_SOUND, flapPart.object);
  });
  flapPart.cue(hinge, () => ({
    gesture: flapOpen ? 'push' : 'pull',
    possible: true,
  }));
  flapPart.updates.push((delta) => {
    const target = flapOpen ? FLAP_OPEN : 0;
    hinge.rotation.x += (target - hinge.rotation.x) * Math.min(1, delta * 10);
  });
  flapPart.shows(() => (flapOpen ? 'open' : 'shut'));
  unit.add(flapPart.object);
  parts.add(flapPart.part());

  // The PLANT ENABLE key switch, in its own box beside it.
  const box = new Group();
  box.position.x = w / 2 + ENABLE_BOX.gap + ENABLE_BOX.w / 2;
  group.add(box);
  const boxShell = new Mesh(
    new RoundedBoxGeometry(ENABLE_BOX.w, ENABLE_BOX.h, ENABLE_BOX.d, 2, 0.006),
    caseGrey,
  );
  boxShell.position.z = ENABLE_BOX.d / 2;
  box.add(boxShell);
  t.label(
    box,
    'PLANT ENABLE',
    0,
    ENABLE_BOX.h / 2 - 0.016,
    ENABLE_BOX.d + 0.0005,
    0.007,
    '#2a2b2c',
    '#f2efe4',
  );
  const enable = parts.add(
    selector(kit, {
      positions: 3,
      key: true,
      legend: 'OFF · AUTO · HAND',
      name: 'PLANT ENABLE key switch',
      // A light grey ring nut and key bow, not the panel defaults' black.
      ring: ['#a9aeb2', '#c4c8cb'],
      bow: '#b23a22',
      bound: {
        get value() {
          return Math.max(0, ENABLES.indexOf(control.view().enable));
        },
        set: (i: number) => control.setEnable(ENABLES[i]),
      },
    }),
  );
  enable.object.position.set(0, -0.008, ENABLE_BOX.d);
  box.add(enable.object);

  // Each frame: the menus' clock, the LEDs, and the display when it changes.
  let seconds = 0;
  let shownKey = '';
  let lastView: CascadeManagerView | null = null;
  let lastUi = '';
  let lastFrame = -1;
  const status = () => {
    const v = control.view();
    if (!v.powered) return 'unpowered';
    const firing = v.boilers.filter((b) => b.state === 'firing').length;
    return `${v.enable.toUpperCase()}${v.enable === 'auto' ? (v.running ? ' running' : ' stopped') : ''}; header ${v.headerC.toFixed(1)} °C, set ${v.setpointC.toFixed(0)} °C; demand ${Math.round(v.demand * 100)} %; ${firing} of ${v.boilers.length} firing, lead B${v.lead + 1}`;
  };
  return {
    group,
    parts,
    /** The last edit the menus made, for a trial's log. */
    lastEdit: () => edited,
    update(delta: number) {
      seconds += delta;
      parts.update(delta);
      ui = cascadeTick(ui, delta);
      const v = control.view();
      const flash = seconds % 1 < 0.5;
      v.boilers.forEach((b, i) => boilerLeds[i]?.(boilerLed(b, flash)));
      unitLed(statusLed(v, flash));
      // Compared before any drawing: the same view, menus and flame
      // frame cannot show anything new.
      const frame = Math.floor(seconds * FLAME_HZ);
      const uiKey = `${ui.page}|${ui.cursor}|${ui.editing}|${ui.boiler}|${ui.info}`;
      if (v === lastView && uiKey === lastUi && frame === lastFrame) return;
      lastView = v;
      lastUi = uiKey;
      lastFrame = frame;
      const s = cascadeScreen(v, ui, seconds);
      const key = screenKey(s);
      if (key === shownKey) return;
      shownKey = key;
      paint(s);
    },
    status,
    dispose() {
      parts.dispose();
    },
  };
}
