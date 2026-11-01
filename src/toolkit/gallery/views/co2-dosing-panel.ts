import { CO2_PANEL_PORTS, CO2_PANEL_SIZE } from '../logic/co2-fittings';

import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createSevenSegment } from '../../components/core/views/eighties-controls';
import type { SevenSegment } from '../../components/core/views/eighties-controls';
import { createEngravedPlate } from '../../components/core/views/plant-signs';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createDialGauge } from '../../components/industrial-control/views/dial-gauge';
import { tools } from '../../components/core/views/fitting-tools';
import {
  createPartSet,
  potentiometer,
  pushButton,
  selector,
} from '../../components/core/parts/parts';
import type { PartSet } from '../../components/core/parts/parts';
import { createSolenoidValve } from '../../components/plant/views/solenoid-valve';
import {
  CO2_DOSERS,
  CO2_FAULT_TEXT,
  CO2_PANEL,
} from '../../../game/plant/co2-dosing';
import type {
  Co2Doser,
  Co2DoserKind,
  Co2DoserMode,
  Co2Fault,
} from '../../../game/plant/co2-dosing';

/**
 * The CO₂ dosing valve controller (mission 118; `doc/plans/co2-system.md`,
 * "How it will be drawn"): a Chlorella Chemicals panel on the wall beside
 * its room's CO₂ wall port, one drawing for both kinds, so a change to it
 * shows in the plant rooms and in dev58 at once. On a white backboard, its
 * gas train runs down the left, top to bottom as the gas goes: the inlet
 * and its pressure switch with the INLET gauge, the second-stage regulator
 * with its WORKING gauge, the dosing valve (the Lounge's solenoid valve,
 * its coil's lamp lit while open; the Olympic's thermal mass flow
 * controller with its own LED readout of g/h), the flow meter (the
 * Lounge's glass-tube rotameter with its float and needle valve; the
 * Olympic's flow is on its controller's readout), and the non-return valve
 * before the line goes down to the injection point. On the right, its
 * control box: the POWER, DOSING and REMOTE lamps, a lamp for each fault,
 * the REMOTE · MANUAL · OFF selector (a local control), the manual rate
 * (a potentiometer on the Lounge's, ▲ and ▼ on the Olympic's, with its set
 * point shown), RESET for its latched faults, and the cable gland to the
 * Trio's CO₂ port.
 *
 * It holds nothing: `read` gives it its panel (`Co2Doser`) and its inlet
 * pressure each frame, and its controls call `controls`, which the world
 * (or dev58's rig) acts on. Its readouts redraw only when what they show
 * changes. Built in metres, facing +z, centred on its origin, its
 * backboard at the back of its 0.28 m depth (the wall's face at z = −0.14).
 */

export { CO2_PANEL_PORTS, CO2_PANEL_SIZE };

/** The modes, left to right as engraved. */
export const CO2_PANEL_MODES: readonly Co2DoserMode[] = [
  'remote',
  'manual',
  'off',
];
export const CO2_PANEL_LEGEND = 'REMOTE · MANUAL · OFF';

/** The fault lamps, in the order engraved down the control box. */
export const CO2_PANEL_FAULTS: readonly Co2Fault[] = [
  'gas-alarm',
  'no-supply-pressure',
  'no-water-flow',
  'signal-lost',
  'flow-not-proved',
  'valve-stuck',
];

/** The Olympic's ▲ and ▼ step its manual set point by this, g/h. */
export const CO2_PANEL_RATE_STEP = 100;

export interface Co2PanelControls {
  setMode(mode: Co2DoserMode): void;
  setManualRate(gh: number): void;
  reset(): void;
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

/** Its lamps: which are lit for a panel as it stands. */
export function co2PanelLamps(d: Co2Doser) {
  return {
    power: d.powered,
    dosing: d.powered && d.delivering > 0,
    remote: d.powered && d.mode === 'remote',
    faults: Object.fromEntries(
      CO2_PANEL_FAULTS.map((f) => [f, d.powered && d.fault === f]),
    ) as Record<Co2Fault, boolean>,
  };
}

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
  const title = createEngravedPlate(kit, ['CO₂ DOSING', 'VALVE CONTROLLER'], {
    width: 0.25,
    height: 0.06,
  });
  title.position.set(0.145, h / 2 - 0.05, face + 0.002);
  object.add(title);
  // Its maker's badge under the control box; Penfold's mark, which wires
  // its control box, bottom right (the top right holds the title).
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
  for (const [y0, y1] of kind === 'solenoid'
    ? [
        [h / 2, rotaTop],
        [rotaFoot, -h / 2],
      ]
    : [[h / 2, -h / 2]])
    t.cyl(object, copper, r, y0 - y1, x, (y0 + y1) / 2, z, 'y', 12);
  // Its clips to the backboard, and the grey CO₂ band at the inlet (BS 1710).
  for (const y of [0.36, 0.0, -0.36])
    t.box(object, steel, 0.03, 0.012, 0.06, x, y, (back + z) / 2 + 0.01);
  t.cyl(object, t.paint('#b9bcbc', 0.6), r + 0.0012, 0.05, x, 0.4, z, 'y', 12);
  t.label(object, 'CO₂', x + 0.035, 0.4, z, 0.016, '#1b1b1b', '#e9e9e4');

  const fresh = <T>(show: (v: T) => void) => {
    let last: T | undefined;
    return (v: T) => {
      if (v === last) return;
      last = v;
      show(v);
    };
  };

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
  let readout: SevenSegment | null = null;
  if (kind === 'solenoid') {
    solenoid = createSolenoidValve(kit, 0.03);
    solenoid.group.position.set(x, 0.05, z);
    object.add(solenoid.group);
    t.label(object, 'SOLENOID NC', x + 0.085, 0.05, z + 0.02, 0.011);
  } else {
    const body = t.paint('#3e5566', 0.45, 0.2);
    t.box(object, body, 0.1, 0.16, 0.08, x, 0.04, z + 0.015);
    t.box(object, dark, 0.07, 0.03, 0.002, x, 0.085, z + 0.056);
    readout = createSevenSegment(kit, 4, { digitHeight: 0.012 });
    readout.group.position.set(x, 0.085, z + 0.058);
    object.add(readout.group);
    t.label(object, 'g/h', x + 0.04, 0.06, z + 0.056, 0.01, '#e9e9e4');
    t.label(object, 'MASS FLOW', x, 0.02, z + 0.056, 0.012, '#e9e9e4');
    t.label(object, '0–2 kg/h CO₂', x, 0.0, z + 0.056, 0.011, '#c9d4da');
  }
  const showReadout = fresh<string>((s) => readout?.show(s));

  // The flow meter: the Lounge's glass-tube rotameter, its float and needle valve.
  let float: Mesh | null = null;
  const tube = 0.15;
  /** The rotameter's range: its needle valve's setting as built, g/h. */
  const range = Math.max(
    1,
    (kind === 'solenoid' ? CO2_DOSERS.plant_pool_01 : CO2_DOSERS.plant_pool_02)
      .most,
  );
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

  // ---- The control box, on the right ------------------------------------------------
  const box = new Group();
  box.position.set(0.17, 0.04, face);
  object.add(box);
  const bw = 0.3;
  const bh = 0.6;
  const bd = 0.09;
  t.box(box, t.paint('#c8ccc9', 0.5), bw, bh, bd, 0, 0, bd / 2);
  const front = bd + 0.001;
  t.label(box, 'CONTROL', 0, bh / 2 - 0.03, front, 0.016);
  // Its status lamps.
  const lamp = (colour: string, legend: string, lx: number, ly: number) => {
    const l = t.led(box, colour, 0.009, lx, ly, front + 0.003);
    t.label(box, legend, lx, ly - 0.022, front, 0.009, '#30383e');
    return l;
  };
  const powerLamp = lamp('#f4f1e8', 'POWER', -0.09, 0.22);
  const dosingLamp = lamp('#3ddc5a', 'DOSING', 0, 0.22);
  const remoteLamp = lamp('#ffb000', 'REMOTE', 0.09, 0.22);
  const faultLamps = CO2_PANEL_FAULTS.map((f, i) => {
    const ly = 0.15 - i * 0.032;
    const l = t.led(box, '#ff3b2f', 0.007, -0.11, ly, front + 0.003);
    t.label(box, CO2_FAULT_TEXT[f], 0.015, ly, front, 0.0095, '#30383e');
    return { f, l };
  });
  const mode = parts.add(
    selector(kit, {
      positions: 3,
      bound: {
        get value() {
          return CO2_PANEL_MODES.indexOf(read().doser.mode);
        },
        set: (k: number) => controls.setMode(CO2_PANEL_MODES[k]),
      },
      legend: CO2_PANEL_LEGEND,
      name: `${name}: ${CO2_PANEL_LEGEND} selector`,
    }),
  );
  mode.object.position.set(-0.07, -0.1, front);
  box.add(mode.object);
  const most = () => read().doser.spec.most;
  let showSetPoint: ((s: string) => void) | null = null;
  if (kind === 'solenoid') {
    // A ten-turn potentiometer: the share of the needle valve's flow in MANUAL.
    const pot = parts.add(
      potentiometer(kit, {
        steps: 10,
        bound: {
          get value() {
            return Math.round((read().doser.manualRate / most()) * 10);
          },
          set: (k: number) => controls.setManualRate((k / 10) * most()),
        },
        legend: 'MANUAL RATE',
        name: `${name}: manual rate potentiometer`,
      }),
    );
    pot.object.position.set(0.08, -0.1, front);
    box.add(pot.object);
  } else {
    // The manual set point, its readout and ▲ ▼.
    const sp = createSevenSegment(kit, 4, { digitHeight: 0.01 });
    sp.group.position.set(0.08, -0.068, front + 0.001);
    box.add(sp.group);
    t.label(box, 'MANUAL SP g/h', 0.08, -0.045, front, 0.009, '#30383e');
    const showSp = fresh<string>((s) => sp.show(s));
    const step = (sign: 1 | -1) =>
      parts.add(
        pushButton(kit, {
          colour: 'grey',
          symbol: sign > 0 ? '▲' : '▼',
          name: `${name}: manual set point ${sign > 0 ? 'up' : 'down'}`,
          action: () =>
            controls.setManualRate(
              Math.max(
                0,
                Math.min(
                  most(),
                  read().doser.manualRate + sign * CO2_PANEL_RATE_STEP,
                ),
              ),
            ),
        }),
      );
    const down = step(-1);
    const up = step(1);
    down.object.position.set(0.05, -0.12, front);
    up.object.position.set(0.11, -0.12, front);
    box.add(down.object, up.object);
    showSetPoint = showSp;
  }
  const reset = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'RESET',
      name: `${name}: RESET`,
      action: () => controls.reset(),
    }),
  );
  reset.object.position.set(0.08, -0.215, front);
  box.add(reset.object);
  // Its cable gland, under the box, to the Trio's CO₂ port.
  t.cyl(box, dark, 0.011, 0.03, 0.09, -bh / 2 - 0.015, bd / 2, 'y', 12);
  t.label(
    box,
    'CABLE TO TRIO · CO₂',
    -0.03,
    -bh / 2 + 0.02,
    front,
    0.009,
    '#30383e',
  );

  // ---- Each frame ----------------------------------------------------------------------
  const lit = new Map<object, boolean>();
  const set = (l: { set(on: boolean): void }, on: boolean) => {
    if (lit.get(l) === on) return;
    lit.set(l, on);
    l.set(on);
  };
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
      const lamps = co2PanelLamps(doser);
      set(powerLamp, lamps.power);
      set(dosingLamp, lamps.dosing);
      set(remoteLamp, lamps.remote);
      for (const { f, l } of faultLamps) set(l, lamps.faults[f]);
      if (solenoid) {
        const open = doser.powered && doser.open;
        if (lit.get(solenoid) !== open) {
          lit.set(solenoid, open);
          solenoid.setOpen(open);
        }
      }
      showSetPoint?.(gh(doser.manualRate));
      if (readout) showReadout(doser.powered ? gh(doser.delivering) : '    ');
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
      return `${doser.mode.toUpperCase()} · ${Math.round(doser.delivering)} g/h${doser.fault ? ` · ${CO2_FAULT_TEXT[doser.fault]}` : ''}`;
    },
    dispose() {
      parts.dispose();
    },
  };
}
