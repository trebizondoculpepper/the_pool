import {
  CO2_CABINET,
  CO2_PANEL_PORTS,
  CO2_PANEL_SIZE,
  CO2_PANEL_TRUNKING,
} from '../logic/co2-fittings';

import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createEngravedPlate } from '../../components/core/views/plant-signs';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createDialGauge } from '../../components/industrial-control/views/dial-gauge';
import { tools } from '../../components/core/views/fitting-tools';
import { createPartSet } from '../../components/core/parts/parts';
import type { PartSet } from '../../components/core/parts/parts';
import { createSolenoidValve } from '../../components/plant/views/solenoid-valve';
import {
  MFC_CONNECTOR,
  MFC_END,
  MFC_SIZE,
  createMassFlowController,
} from './co2-mass-flow-controller';
import {
  CO2_CABINET_FAULTS,
  CO2_CABINET_LEGEND,
  CO2_CABINET_MODES,
  CO2_CABINET_ON_LEGEND,
  CO2_CABINET_GLANDS,
  co2CabinetLamps,
  createCo2ValveController,
  panelCable,
} from './co2-valve-controller';
import {
  CO2_SOLENOID_PANEL,
  CO2_FAULT_TEXT,
  CO2_PANEL,
} from '../../../game/plant/co2-dosing';
import type {
  Co2Doser,
  Co2DoserKind,
  Co2DoserMode,
  Co2Override,
} from '../../../game/plant/co2-dosing';

/**
 * The CO₂ dosing valve controller (mission 118; `doc/plans/co2-system.md`,
 * "How it will be drawn"): a Chlorella Chemicals panel on the wall beside
 * its room's CO₂ wall port, one drawing for both kinds, so a change to it
 * shows in the plant rooms and in dev58 at once. On a white backboard, its
 * gas train runs down the left, top to bottom as the gas goes: the inlet
 * and its pressure switch with the INLET gauge, the second-stage regulator
 * with its WORKING gauge, the dosing valve (a thermal mass flow
 * controller, `co2-mass-flow-controller.ts`, an instrument of its own on
 * its bracket, the copper jogging out to its inlet fitting and back from
 * its outlet, both rooms' since 2026-11-01, the Lounge's on its 500 g/h
 * range; or the period's solenoid valve, its coil's lamp lit while open),
 * the flow meter (the solenoid panel's glass-tube rotameter with its
 * float and needle valve; a mass flow controller's flow is on its LCD),
 * and the non-return valve before the line goes down to the injection
 * point. On the right, its control cabinet, a Veldkamp CV-310
 * (`co2-valve-controller.ts`): the POWER, FLOW and REMOTE lamps, the ALARM
 * window, OFF · ON (its mass flow controller choosing LOCAL or REMOTE
 * itself; the solenoid panel's REMOTE · LOCAL · OFF selector and LOCAL
 * RATE potentiometer in its place), and RESET; its cables
 * (the valve's, the 4–20 mA and release cable in, the detector's
 * interlock, the supply, and its earth) out of its glands into the
 * panel's trunking, which runs up to where the conduits land.
 *
 * It holds nothing: `read` gives it its panel (`Co2Doser`) and its inlet
 * pressure each frame, and its controls call `controls`, which the world
 * (or dev58's rig) acts on. Its readouts redraw only when what they show
 * changes. Built in metres, facing +z, centred on its origin, its
 * backboard at the back of its 0.28 m depth (the wall's face at z = −0.14).
 */

export { CO2_PANEL_PORTS, CO2_PANEL_SIZE };

/** The modes, left to right as printed round the cabinet's selector. */
export const CO2_PANEL_MODES = CO2_CABINET_MODES;
export const CO2_PANEL_LEGEND = CO2_CABINET_LEGEND;
/** The mass flow controller panel's switch, left to right as printed. */
export const CO2_PANEL_ON_LEGEND = CO2_CABINET_ON_LEGEND;

/** The faults, in the order of the cabinet's ALARM window. */
export const CO2_PANEL_FAULTS = CO2_CABINET_FAULTS;

export interface Co2PanelControls {
  setMode(mode: Co2DoserMode): void;
  setManualRate(gh: number): void;
  reset(): void;
  /** The mass flow controller panel's OFF · ON switch. */
  setOn(on: boolean): void;
  /** The mass flow controller's LOCAL · REMOTE selector (the model's `hand` is LOCAL). */
  setHand(hand: boolean): void;
  /** The mass flow controller's valve OVERRIDE. */
  setOverride(override: Co2Override): void;
}

export interface Co2PanelReading {
  doser: Co2Doser;
  /** Its wall port's pressure, bar gauge. */
  inletBar: number;
}

export interface Co2PanelView {
  object: Group;
  /** Its controls: the owner steps them (`parts.update`) and frees them. */
  parts: PartSet;
  /** Its gauges, lamps and readouts from `read`: each frame. */
  update(delta: number): void;
  /** What it shows, in words, for the information overlay. */
  status(): string;
  dispose(): void;
}

/** What its WORKING gauge reads: the regulator's outlet, while its inlet holds it. */
export const workingBar = (inletBar: number) =>
  inletBar > 0
    ? Math.min(CO2_PANEL.working, Math.max(0, inletBar - CO2_PANEL.margin))
    : 0;

/** Its lamps: which are lit for a panel as it stands (its cabinet's). */
export const co2PanelLamps = co2CabinetLamps;

/** Its readout's text: the flow (mass flow controller) or the manual set point, g/h. */
export const gh = (value: number) =>
  String(Math.max(0, Math.round(value))).padStart(4, ' ');

export function createCo2DosingPanel(
  kit: PanelKit,
  kind: Co2DoserKind,
  read: () => Co2PanelReading,
  controls: Co2PanelControls,
  name = 'CO₂ dosing valve controller',
): Co2PanelView {
  const t = tools(kit);
  const { w, h, d } = CO2_PANEL_SIZE;
  const object = new Group();
  object.name = `Chlorella Chemicals ${name}`;
  const parts = createPartSet();

  // ---- The backboard, its title and badges ----------------------------------------
  const back = -d / 2;
  const face = back + 0.02;
  t.box(object, t.paint('#eceeea', 0.6), w, h, 0.02, 0, 0, back + 0.01);
  const title = createEngravedPlate(kit, ['CO₂ VALVE', 'CONTROLLER'], {
    width: 0.25,
    height: 0.06,
  });
  title.position.set(0.145, h / 2 - 0.05, face + 0.002);
  object.add(title);
  // Its maker's badge under the cabinet; Penfold's mark, which wires the
  // panel, bottom right (the top right holds the title).
  panelMakerMark(kit, object, {
    width: w,
    height: h,
    z: face + 0.002,
    corner: 'bottom-right',
  });
  const maker = createBrandBadge(kit, 'chlorella', {
    height: 0.03,
    maxWidth: 0.2,
  });
  maker.position.set(0.12, -h / 2 + 0.05, face + 0.002);
  object.add(maker);

  // ---- The gas train, down the left -------------------------------------------------
  const copper = t.paint('#b8734a', 0.35, 0.8);
  const brass = t.paint('#b08d45', 0.35, 0.8);
  const steel = t.paint('#9aa1a5', 0.35, 0.7);
  const dark = t.paint('#2a2f33', 0.55);
  const x = CO2_PANEL_PORTS.inlet[0];
  const z = CO2_PANEL_PORTS.inlet[2];
  const r = 0.0075;
  // Its copper, in lengths between the fittings (none through the
  // rotameter's glass, which carries the gas itself).
  const rotaTop = -0.13 + 0.15 / 2 + 0.017;
  const rotaFoot = -0.13 - 0.15 / 2 - 0.017;
  /** A run of copper through `points` (each leg along an axis), its bends rounded. */
  const run = (points: readonly [number, number][], radius: number) => {
    for (let k = 1; k < points.length; k++) {
      const [x0, y0] = points[k - 1];
      const [x1, y1] = points[k];
      const along = x0 === x1 ? 'y' : 'x';
      const l = Math.abs(along === 'y' ? y1 - y0 : x1 - x0);
      t.cyl(
        object,
        copper,
        radius,
        l,
        (x0 + x1) / 2,
        (y0 + y1) / 2,
        z,
        along,
        12,
      );
      if (k < points.length - 1) {
        const bend = new Mesh(new SphereGeometry(radius, 12, 8), copper);
        bend.position.set(x1, y1, z);
        object.add(bend);
      }
    }
  };
  // The mass flow controller, on its bracket in the line's place: the
  // copper jogs out to its inlet's fitting and back from its outlet's,
  // reduced to its 10 mm tube and back.
  const mfcAt = { x, y: 0 };
  const jog = { top: 0.135, left: x - 0.105, foot: -0.065, right: x + 0.11 };
  if (kind === 'solenoid')
    for (const [y0, y1] of [
      [h / 2, rotaTop],
      [rotaFoot, -h / 2],
    ])
      t.cyl(object, copper, r, y0 - y1, x, (y0 + y1) / 2, z, 'y', 12);
  else {
    const tube = MFC_SIZE.tube;
    const reducer = 0.012;
    run(
      [
        [x, h / 2],
        [x, jog.top + reducer],
      ],
      r,
    );
    run(
      [
        [x, jog.top + reducer],
        [x, jog.top],
        [jog.left, jog.top],
        [jog.left, mfcAt.y],
        [mfcAt.x - MFC_END + 0.004, mfcAt.y],
      ],
      tube,
    );
    run(
      [
        [mfcAt.x + MFC_END - 0.004, mfcAt.y],
        [jog.right, mfcAt.y],
        [jog.right, jog.foot],
        [x, jog.foot],
        [x, jog.foot - reducer],
      ],
      tube,
    );
    run(
      [
        [x, jog.foot - reducer],
        [x, -h / 2],
      ],
      r,
    );
    // Its reducers, 15 mm to 10 mm and back.
    for (const y of [jog.top + reducer, jog.foot - reducer])
      t.cyl(object, brass, r + 0.0012, 0.016, x, y, z, 'y', 12);
  }
  // Its clips to the backboard, and the grey CO₂ band at the inlet (BS 1710).
  for (const y of kind === 'solenoid'
    ? [0.36, 0.0, -0.36]
    : [0.36, -0.2, -0.36])
    t.box(object, steel, 0.03, 0.012, 0.06, x, y, (back + z) / 2 + 0.01);
  t.cyl(object, t.paint('#b9bcbc', 0.6), r + 0.0012, 0.05, x, 0.4, z, 'y', 12);
  t.label(object, 'CO₂', x + 0.035, 0.4, z, 0.016, '#1b1b1b', '#e9e9e4');

  // The inlet pressure switch and the INLET gauge.
  t.box(object, dark, 0.045, 0.05, 0.04, x + 0.045, 0.3, z);
  t.label(object, 'PS 2 bar', x + 0.045, 0.262, z + 0.021, 0.011, '#30383e');
  const inlet = createDialGauge(kit, {
    dia: 0.08,
    max: 6,
    unit: 'bar',
    legend: 'INLET',
    entry: 'back',
  });
  inlet.group.position.set(x - 0.09, 0.3, z + 0.02);
  object.add(inlet.group);

  // The second-stage regulator, its bonnet and knob, and the WORKING gauge.
  t.cyl(object, brass, 0.022, 0.05, x, 0.18, z, 'z', 16);
  t.cyl(object, brass, 0.03, 0.03, x, 0.18, z + 0.04, 'z', 20);
  t.cyl(object, dark, 0.018, 0.03, x, 0.18, z + 0.07, 'z', 16);
  const working = createDialGauge(kit, {
    dia: 0.08,
    max: 4,
    unit: 'bar',
    legend: 'WORKING',
    entry: 'back',
  });
  working.group.position.set(x - 0.09, 0.18, z + 0.02);
  object.add(working.group);
  t.label(object, 'REG 2 bar', x + 0.06, 0.18, z + 0.01, 0.012, '#30383e');

  // The dosing valve: the solenoid valve, or the mass flow controller.
  let solenoid: ReturnType<typeof createSolenoidValve> | null = null;
  let mfc: ReturnType<typeof createMassFlowController> | null = null;
  if (kind === 'solenoid') {
    solenoid = createSolenoidValve(kit, 0.03);
    solenoid.group.position.set(x, 0.05, z);
    object.add(solenoid.group);
    t.label(object, 'SOLENOID NC', x + 0.085, 0.05, z + 0.02, 0.011);
  } else {
    mfc = createMassFlowController(
      kit,
      read,
      {
        setHand: (hand) => controls.setHand(hand),
        setManualRate: (rate) => controls.setManualRate(rate),
        setOverride: (o) => controls.setOverride(o),
      },
      parts,
      `${name}: mass flow controller`,
    );
    mfc.object.position.set(mfcAt.x, mfcAt.y, z);
    object.add(mfc.object);
  }

  // The flow meter: the Lounge's glass-tube rotameter, its float and needle valve.
  let float: Mesh | null = null;
  const tube = 0.15;
  /** The rotameter's range: its needle valve's setting as built, g/h. */
  const range = CO2_SOLENOID_PANEL.most;
  const floatLow = -0.13 - tube * 0.42;
  if (kind === 'solenoid') {
    const glass = new MeshStandardMaterial({
      color: '#d8ecf2',
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
    });
    kit.materials.push(glass);
    t.box(object, steel, 0.05, 0.015, 0.04, x, -0.13 + tube / 2 + 0.01, z);
    t.box(object, steel, 0.05, 0.015, 0.04, x, -0.13 - tube / 2 - 0.01, z);
    t.cyl(object, glass, 0.012, tube, x, -0.13, z + 0.008, 'y', 16);
    const scale = t.printed(
      0.03,
      tube,
      (c, cw, ch) => {
        c.fillStyle = '#f4f3ee';
        c.fillRect(0, 0, cw, ch);
        c.fillStyle = '#16191b';
        c.font = `bold ${cw * 0.3}px Arial`;
        for (let k = 0; k <= 6; k++) {
          const y = ch * (0.92 - (k / 6) * 0.84);
          c.fillRect(0, y - 1, cw * (k % 3 === 0 ? 0.4 : 0.25), 2);
          if (k % 2 === 0)
            c.fillText(
              String(Math.round((k * range) / 6)),
              cw * 0.45,
              y + cw * 0.1,
            );
        }
      },
      128,
    );
    scale.mesh.position.set(x + 0.03, -0.13, z + 0.002);
    object.add(scale.mesh);
    t.label(object, 'g/h CO₂', x + 0.03, -0.215, z + 0.003, 0.009);
    float = new Mesh(new SphereGeometry(0.008, 12, 8), t.paint('#c62c22', 0.4));
    float.position.set(x, floatLow, z + 0.008);
    float.userData.live = true;
    object.add(float);
    // Its needle valve, under the tube, and its float's limit contact.
    t.cyl(
      object,
      brass,
      0.008,
      0.04,
      x - 0.035,
      -0.13 - tube / 2 - 0.01,
      z,
      'x',
      10,
    );
    t.cyl(
      object,
      dark,
      0.012,
      0.012,
      x - 0.06,
      -0.13 - tube / 2 - 0.01,
      z,
      'x',
      14,
    );
    t.label(object, 'NEEDLE', x - 0.06, -0.235, z + 0.012, 0.009);
    t.box(object, dark, 0.016, 0.03, 0.016, x - 0.025, -0.11, z + 0.01);
  } else {
    // Its filter, before the controller's seat.
    t.cyl(object, steel, 0.016, 0.06, x, -0.13, z, 'y', 14);
    t.label(object, 'FILTER', x + 0.05, -0.13, z, 0.011);
  }

  // The non-return valve, and the line on down to the injection point.
  t.cyl(object, brass, 0.014, 0.05, x, -0.3, z, 'y', 6);
  t.label(object, 'NRV ▼', x + 0.05, -0.3, z, 0.012);
  t.label(
    object,
    'TO INJECTION',
    x,
    -0.4,
    z + 0.012,
    0.012,
    '#1b1b1b',
    '#e9e9e4',
  );

  // ---- The control cabinet, on the right ------------------------------------------
  // A Veldkamp CV-310 (`co2-valve-controller.ts`), and the panel's own
  // trunking (Penfold's wiring) carrying its cables: up the backboard's
  // right edge to where the incoming conduits land, and along under the
  // cabinet's glands.
  const cabinet = createCo2ValveController(
    kit,
    kind,
    read,
    controls,
    parts,
    `${name}: CV-310 valve controller`,
  );
  cabinet.object.position.set(CO2_CABINET.x, CO2_CABINET.y, face);
  object.add(cabinet.object);
  const trunking = t.paint('#e4e5e0', 0.55);
  const lid = t.paint('#cfd1cc', 0.6);
  const tr = CO2_PANEL_TRUNKING;
  const trZ = face + tr.d / 2;
  const trFoot = tr.y - tr.w / 2;
  t.box(
    object,
    trunking,
    tr.w,
    h / 2 - trFoot,
    tr.d,
    tr.x,
    (h / 2 + trFoot) / 2,
    trZ,
  );
  t.box(
    object,
    lid,
    0.0015,
    h / 2 - trFoot,
    0.001,
    tr.x,
    (h / 2 + trFoot) / 2,
    face + tr.d + 0.0005,
  );
  const runL = tr.x - tr.w / 2 - tr.left;
  t.box(object, trunking, runL, tr.w, tr.d, tr.left + runL / 2, tr.y, trZ);
  t.box(
    object,
    lid,
    runL,
    0.0015,
    0.001,
    tr.left + runL / 2,
    tr.y,
    face + tr.d + 0.0005,
  );
  // The detector's interlock conduit ends over the cabinet's corner in a
  // brass bush; its red fire-resisting cable goes on into the trunking's
  // side and down to the cabinet's EXT. INTERLOCK gland.
  {
    const [ix, iy, iz] = CO2_PANEL_PORTS.interlock;
    t.cyl(
      object,
      t.paint('#b6944c', 0.35, 0.75),
      0.0115,
      0.008,
      ix,
      iy - 0.004,
      iz,
      'y',
      6,
    );
    panelCable(
      kit,
      object,
      [
        [ix, iy - 0.006, iz],
        [ix, iy - 0.018, iz - 0.012],
        [ix + 0.012, iy - 0.024, (iz + trZ) / 2],
        [tr.x - tr.w / 2 - 0.001, iy - 0.026, trZ],
      ],
      0.0032,
      '#b8281e',
    );
  }
  // Each gland's cable down into the run under it, a ferrule marker on it;
  // the earth stud's lead beside them.
  const glandFoot = CO2_CABINET.y - (CO2_CABINET.h - 0.01) / 2 - 0.019;
  const glandZ = face + 0.075 / 2 - 0.004;
  const runTop = tr.y + tr.w / 2;
  for (const g of CO2_CABINET_GLANDS) {
    const gx = CO2_CABINET.x + g.x;
    panelCable(
      kit,
      object,
      [
        [gx, glandFoot + 0.003, glandZ],
        [gx, (glandFoot + runTop) / 2, glandZ],
        [gx, runTop - 0.004, glandZ],
      ],
      g.r,
      g.colour,
    );
    t.cyl(
      object,
      t.paint('#f2f1ea', 0.6),
      g.r + 0.0008,
      0.006,
      gx,
      glandFoot - 0.007,
      glandZ,
      'y',
      10,
    );
  }
  const studX = CO2_CABINET.x + 0.1;
  panelCable(
    kit,
    object,
    [
      [studX, glandFoot + 0.008, glandZ],
      [studX + 0.003, glandFoot - 0.004, glandZ],
      [studX, runTop - 0.004, glandZ],
    ],
    0.0018,
    'earth',
  );
  // The valve's cable (the mass flow controller's from its M12 connector,
  // the solenoid's from its DIN plug), up and over, down the gap between
  // the gas train and the cabinet, and into the run's open end.
  {
    const from: [number, number, number] = mfc
      ? [
          mfcAt.x + MFC_CONNECTOR[0],
          mfcAt.y + MFC_CONNECTOR[1],
          z + MFC_CONNECTOR[2],
        ]
      : [x, 0.05 + 0.015, z + 0.078];
    const down = -0.02;
    const cz = face + tr.d / 2;
    panelCable(
      kit,
      object,
      [
        from,
        [from[0] + 0.003, from[1] + 0.022, from[2]],
        [(from[0] + down) / 2, from[1] + 0.035, (from[2] + cz) / 2],
        [down, from[1] - 0.005, cz],
        [down, from[1] - 0.06, cz],
        [down, tr.y + 0.03, cz],
        [down + 0.004, tr.y + 0.004, cz],
        [tr.left + 0.004, tr.y, cz],
      ],
      0.0028,
      '#7a7f83',
    );
  }

  // ---- Each frame ----------------------------------------------------------------------
  const lit = new Map<object, boolean>();
  let floatAt = floatLow;
  return {
    object,
    parts,
    update(delta) {
      const { doser, inletBar } = read();
      inlet.set(inletBar);
      working.set(workingBar(inletBar));
      inlet.update(delta);
      working.update(delta);
      cabinet.update();
      if (solenoid) {
        const open = doser.powered && doser.open;
        if (lit.get(solenoid) !== open) {
          lit.set(solenoid, open);
          solenoid.setOpen(open);
        }
      }
      mfc?.update(delta);
      if (float) {
        // The float rides on the flow while the valve is open, damped.
        const flow = doser.open ? doser.delivering : 0;
        const share = Math.max(0, Math.min(1.05, flow / range));
        const target = floatLow + share * tube * 0.84;
        if (Math.abs(target - floatAt) > 1e-5) {
          floatAt += (target - floatAt) * Math.min(1, delta * 3);
          float.position.y = floatAt;
        }
      }
    },
    status() {
      const { doser } = read();
      const own = `${doser.mode.toUpperCase()} · ${Math.round(doser.delivering)} g/h${doser.fault ? ` · ${CO2_FAULT_TEXT[doser.fault]}` : ''} · its cabinet: ${cabinet.status()}`;
      return mfc ? `${own} · its controller: ${mfc.status()}` : own;
    },
    dispose() {
      parts.dispose();
    },
  };
}
