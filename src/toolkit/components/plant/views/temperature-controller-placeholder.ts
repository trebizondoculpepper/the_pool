import { Box3, BoxGeometry, Group, Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPartSet, potentiometer, selector } from '../../core/parts/parts';
import type { Binding } from '../../core/logic/world/components';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createLedBar } from '../../core/views/led-bar';
import { faceGrid } from '../../core/logic/face-grid';
import type { FaceCell } from '../../core/logic/face-grid';
import { bandFromDial } from '../logic/modulating-control';
import type { ControllerModel } from '../logic/modulating-control';

/** The SET POINT range: 25.0 to 35.0 °C in 0.5 °C steps (21 positions). */
export const SETPOINT_MIN = 25;
export const SETPOINT_MAX = 35;
export const SETPOINT_STEP = 0.5;
export const SETPOINT_POSITIONS =
  Math.round((SETPOINT_MAX - SETPOINT_MIN) / SETPOINT_STEP) + 1;

/**
 * A *placeholder* temperature controller (the owner, 2026-11-03): same
 * 430 × 290 × 150 mm body as the Water Margin controller, a very simple
 * fascia — near the top two red 7-segment readouts labeled SET and ACTUAL;
 * beneath them a row of three rotary selectors, each labeled, SET POINT
 * (25.0–35.0 °C in 0.5 steps), BAND (1–10 kelvin, 1 aggressive) and
 * HAND/OFF/AUTO; beneath them a titled valve-open indicator as a row of 10
 * LEDs (the Soft Starter's bar pattern). The Water Margin logo and its
 * wordmark sit top left, its model number top right, and its Chinese
 * lettering with an English translation bottom right.
 * It reads the ideal model (`ControllerModel`) and drives the modulating
 * valve; the finished controller will be the Water Margin TC-1's screen.
 *
 * A real working component: SET POINT, BAND and the mode are worked;
 * ACTUAL and the bar read the model.
 */
export function createTemperatureControllerPlaceholder(
  kit: PanelKit,
  options: {
    /** The model it shows and works. */
    model?: () => ControllerModel;
    /** A confirmed edit, for its owner to dispatch (set point, band, mode). */
    change?: (edit: {
      setpoint?: number;
      band?: number;
      mode?: 'auto' | 'off' | 'hand';
    }) => void;
    /** Its tag, printed top right of its face as the model number. */
    tag?: string;
    /** Draw the layout-grid overlay (region outlines and cell labels). Default false — on only while laying the face out. */
    gridOverlay?: boolean;
  } = {},
) {
  const t = tools(kit);
  const group = new Group();
  const parts = createPartSet();
  const tag = options.tag ?? 'TC-PL1';
  // The body: same moulded shape as the Water Margin controller.
  const B = { w: 0.43, h: 0.29, d: 0.15 };
  const body = new Group();
  body.position.z = 0;
  group.add(body);
  const caseGrey = t.paint('#b9bdbd', 0.75);
  const shell = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, B.d - 0.02, 4, 0.012),
    caseGrey,
  );
  shell.position.set(0, 0, (B.d - 0.02) / 2);
  body.add(shell);
  const front = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, 0.03, 4, 0.01),
    t.paint('#2c3a44', 0.6),
  );
  front.position.set(0, 0, B.d - 0.015);
  body.add(front);
  const z = B.d + 0.0002;
  // A fascia panel behind the instruments: big enough to fill the case
  // with about a 15 mm margin all round (the owner, 2026-11-03).
  const FACE = { w: 0.4, h: 0.26 };
  const fascia = t.box(
    body,
    t.paint('#1c2329', 0.3),
    FACE.w,
    FACE.h,
    0.002,
    0,
    0.005,
    z + 0.0005,
  );
  fascia.name = `${tag} fascia`;
  const onFascia = z + 0.0012;
  // Printed graphics (the logo and the brand text) sit on a plane proud of
  // the fascia face — raised above it, not painted co-planar on it — but
  // still within the fascia's bounds (the owner, 2026-11-03).
  const proud = onFascia + 0.0012;
  const ink = '#d8dcdc';

  // A local model to work if none is given: measured 27, set 28, band 2.
  let local: ControllerModel = {
    measured: 27,
    setpoint: 28,
    band: 2,
    output: 0.5,
    mode: 'auto',
  };
  const model = options.model ?? (() => local);
  const change =
    options.change ??
    ((e) => {
      if (e.setpoint !== undefined) local = { ...local, setpoint: e.setpoint };
      if (e.band !== undefined) local = { ...local, band: e.band };
      if (e.mode !== undefined) local = { ...local, mode: e.mode };
    });

  // Fascia laid out as a CSS-style grid (`face-grid`): a top text band
  // (logo + name), a readout band, a dial row, and a bottom band (the valve
  // bar + the brand lettering). Every component lives in a named region, so
  // its bounds come from the grid and can never fall off the face.
  const grid = faceGrid(FACE.w, FACE.h, {
    pad: 0.01,
    gap: 0.008,
    rows: [1, 1, 1, 1],
    cols: [1, 1, 1, 1, 1, 1],
    areas: [
      ['logo', 'logo', 'name', 'name', 'name', 'name'],
      ['rset', 'rset', 'rset', 'ract', 'ract', 'ract'],
      ['d1', 'd1', 'd2', 'd2', 'd3', 'd3'],
      ['valve', 'valve', 'valve', 'brand', 'brand', 'brand'],
    ],
  });
  const at = (region: string) => grid.cell(region)!;
  // A right-aligned micro label spanning a region: `createMicroLabel` blends
  // its text with `align` into a canvas `width` metres across, and centers
  // that canvas on the given point — so to hug a region's right edge give it
  // the region's width and its centre, never an offset from the edge.
  const rightLabel = (
    c: FaceCell,
    text: string,
    options: Parameters<typeof createMicroLabel>[2],
    cy = c.cy,
  ) => {
    const label = createMicroLabel(kit, text, {
      ...options,
      width: c.w * 0.96,
      align: 'right',
    });
    label.position.set(c.cx, cy, proud);
    body.add(label);
    return label;
  };

  // The layout grid, made visible for debugging (the owner, 2026-11-03):
  // each region's borders as thin engraved lines and a reference label in
  // each cell's top-right, grouped so the whole overlay can be toggled on
  // and off (`setOverlay`, or the `gridOverlay` option).
  const debugGrid = new Group();
  const gridLine = t.paint('#40636c', 0.65);
  const T = 0.0009;
  const gridZ = onFascia + 0.0004;
  for (const cell of grid.cells) {
    const top = cell.cy + cell.h / 2;
    const bottom = cell.cy - cell.h / 2;
    const left = cell.cx - cell.w / 2;
    const right = cell.cx + cell.w / 2;
    for (const y of [top, bottom]) {
      const line = new Mesh(new BoxGeometry(cell.w, T, 0.0005), gridLine);
      line.position.set(cell.cx, y, gridZ);
      debugGrid.add(line);
    }
    for (const x of [left, right]) {
      const line = new Mesh(new BoxGeometry(T, cell.h, 0.0005), gridLine);
      line.position.set(x, cell.cy, gridZ);
      debugGrid.add(line);
    }
    // And a reference label in each region, naming it so its cell can be
    // spoken of. 3× the callout size at the cell's top-right, away from the
    // controls centred in it.
    const cellLabel = createMicroLabel(kit, cell.name, {
      height: 0.006,
      ink: '#8fd3d3',
      align: 'right',
      width: cell.w * 0.9,
    });
    cellLabel.position.set(
      cell.cx,
      cell.cy + cell.h / 2 - 0.004,
      onFascia + 0.0006,
    );
    debugGrid.add(cellLabel);
  }
  debugGrid.visible = options.gridOverlay ?? false;
  body.add(debugGrid);
  const setOverlay = (on: boolean) => {
    debugGrid.visible = on;
  };

  // The Water Margin logo, top left of its cell; its name and the model
  // number, top right of the name cell.
  const logo = at('logo');
  const badge = createBrandBadge(kit, 'water-margin', {
    height: Math.min(0.018, logo.h * 0.75),
    ink: '#f1eee4',
  });
  // Top-left align the badge in its cell: measure it, then set its top-left
  // corner at the cell's top-left (a small inset), so it can never sit
  // outside the cell regardless of the mark's aspect.
  badge.updateMatrixWorld(true);
  const logoBox = new Box3().setFromObject(badge);
  const logoInset = 0.006;
  badge.position.set(
    logo.cx - logo.w / 2 + logoInset + (logoBox.max.x - logoBox.min.x) / 2,
    logo.cy + logo.h / 2 - logoInset - (logoBox.max.y - logoBox.min.y) / 2,
    proud,
  );
  body.add(badge);
  const nameCell = at('name');
  rightLabel(nameCell, `WATER MARGIN  ${tag}`, { height: 0.003, ink });

  // SET and ACTUAL red 7-segment readouts: each aligned on the x of the knob
  // below it (SET over SET POINT, ACTUAL over BAND), the mode switch below
  // right of them.
  const placeReadout = (region: string, labelText: string, over: string) => {
    const c = at(region);
    const x = at(over).cx;
    const seg = createSevenSegment(kit, 3, {
      digitHeight: 0.012,
      colour: '#ff3b24',
    });
    seg.group.position.set(x, c.cy - c.h * 0.1, onFascia);
    body.add(seg.group);
    t.label(body, labelText, x, c.cy + c.h * 0.28, onFascia, 0.0035, ink);
    return seg;
  };
  const set = placeReadout('rset', 'SET °C', 'd1');
  const actual = placeReadout('ract', 'ACTUAL °C', 'd2');

  // A row of three rotary selectors, each in a third of the dial row.
  const setpoint = parts.add(
    potentiometer(kit, {
      steps: SETPOINT_POSITIONS - 1,
      legend: 'SET POINT °C',
      name: `${tag} set point dial`,
      bound: {
        get value() {
          const clamped = Math.min(
            SETPOINT_MAX,
            Math.max(SETPOINT_MIN, model().setpoint),
          );
          return Math.round((clamped - SETPOINT_MIN) / SETPOINT_STEP);
        },
        set(v: number) {
          change({ setpoint: SETPOINT_MIN + v * SETPOINT_STEP });
        },
      } as Binding<number>,
    }),
  );
  setpoint.object.position.set(at('d1').cx, at('d1').cy, onFascia);
  setpoint.object.scale.setScalar(0.7);
  body.add(setpoint.object);
  t.label(
    body,
    '25.0 ··· 35.0',
    at('d1').cx,
    at('d1').cy - at('d1').h * 0.28,
    onFascia,
    0.0035,
    ink,
  );

  const band = parts.add(
    potentiometer(kit, {
      steps: 9,
      legend: 'BAND K',
      name: `${tag} band dial`,
      bound: {
        get value() {
          return (model().band ?? 2) - 1;
        },
        set(v: number) {
          change({ band: v + 1 });
        },
      } as Binding<number>,
    }),
  );
  band.object.position.set(at('d2').cx, at('d2').cy, onFascia);
  band.object.scale.setScalar(0.7);
  body.add(band.object);
  t.label(
    body,
    '1 ··· 10',
    at('d2').cx,
    at('d2').cy - at('d2').h * 0.28,
    onFascia,
    0.0035,
    ink,
  );

  const mode = parts.add(
    selector(kit, {
      positions: 3,
      legend: 'HAND · OFF · AUTO',
      name: `${tag} mode selector`,
      bound: {
        get value() {
          return model().mode === 'hand' ? 0 : model().mode === 'off' ? 1 : 2;
        },
        set(v: number) {
          change({ mode: v === 0 ? 'hand' : v === 1 ? 'off' : 'auto' });
        },
      } as Binding<number>,
    }),
  );
  mode.object.position.set(at('d3').cx, at('d3').cy, onFascia);
  mode.object.scale.setScalar(0.7);
  body.add(mode.object);
  t.label(
    body,
    'HAND · OFF · AUTO',
    at('d3').cx,
    at('d3').cy - at('d3').h * 0.28,
    onFascia,
    0.0035,
    ink,
  );

  // The three controls (two pots and a lever switch) have different origins,
  // so centre each one's visible centre on the dial row's line, however it
  // is built.
  body.updateMatrixWorld(true);
  const dialY = at('d1').cy;
  for (const o of [setpoint.object, band.object, mode.object]) {
    const box = new Box3().setFromObject(o);
    const centreY = box.isEmpty() ? dialY : (box.min.y + box.max.y) / 2;
    o.position.y += dialY - centreY;
  }

  // The valve-open bar: ten amber LEDs lit by their count (the reusable
  // `createLedBar`), spread across the left of the bottom band, titled.
  const valve = at('valve');
  const bar = createLedBar(kit, {
    width: valve.w * 0.8,
    segW: 0.005,
    segH: 0.011,
  });
  bar.group.position.set(
    valve.cx,
    valve.cy - valve.h * 0.08,
    onFascia + 0.0005,
  );
  bar.segments.forEach((seg, i) => {
    seg.name = `${tag} valve-open LED ${i + 1}`;
    seg.userData.live = true;
  });
  body.add(bar.group);
  t.label(
    body,
    'VALVE',
    valve.cx,
    valve.cy + valve.h * 0.22,
    onFascia,
    0.004,
    ink,
  );

  // Its Chinese lettering and English translation, bottom right of the cell.
  const brand = at('brand');
  const cjkFont =
    '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  rightLabel(
    brand,
    '超级先进型水管理方案',
    {
      height: 0.006,
      ink: '#9fb2bd',
      font: cjkFont,
    },
    brand.cy - brand.h * 0.08,
  );
  rightLabel(
    brand,
    'SUPER ADVANCED TYPE\nWATER MANAGEMENT SOLUTIONS',
    {
      height: 0.0028,
      ink: '#8a9298',
    },
    brand.cy - brand.h * 0.28,
  );

  let shownSet = '';
  let shownActual = '';
  let shownBar = -1;
  const update = (delta: number) => {
    const m = model();
    const setText = m.setpoint.toFixed(1);
    if (setText !== shownSet) {
      shownSet = setText;
      set.show(setText);
    }
    const actualText = m.measured.toFixed(1);
    if (actualText !== shownActual) {
      shownActual = actualText;
      actual.show(actualText);
    }
    const lit = Math.round(Math.max(0, Math.min(1, m.output ?? 0)) * 10);
    if (lit !== shownBar) {
      shownBar = lit;
      bar.setLit(lit);
    }
    parts.update(delta);
  };
  update(0);

  return {
    group,
    parts,
    update,
    /** Show or hide the layout-grid overlay (region outlines + cell labels). */
    setOverlay,
    status: () =>
      `${tag}: SET ${model().setpoint.toFixed(1)} °C, ACTUAL ${model().measured.toFixed(1)} °C, BAND ${bandFromDial(model().band ?? 2)} K, ${(model().mode ?? 'auto').toUpperCase()}, valve ${Math.round((model().output ?? 0) * 100)}%`,
    dispose: () => parts.dispose(),
  };
}
