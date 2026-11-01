import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createSevenSegment } from '../../components/core/views/eighties-controls';
import { createEngravedPlate } from '../../components/core/views/plant-signs';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { tools } from '../../components/core/views/fitting-tools';
import { createDialGauge } from '../../components/industrial-control/views/dial-gauge';
import { createGasBallValve } from '../../components/plant/views/gas-fittings';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import type { PartSet } from '../../components/core/parts/parts';
import { co2DetectorAlarms } from '../../../game/plant/co2-detection';
import type { Co2DetectorState } from '../../../game/plant/co2-detection';
import {
  CO2_DETECTOR_PARTS,
  CO2_DETECTOR_PORTS,
  CO2_DETECTOR_SIZE,
  CO2_WALL_PORT_PORTS,
  CO2_WALL_PORT_SIZE,
} from '../logic/co2-fittings';

/**
 * The CO₂ system's fittings in a room (mission 118; `co2-system.md`, "How
 * it will be drawn"), each a working component bound to its node and to
 * the world's state through `read` and its controls, holding nothing:
 *
 * - **the wall port**: the low-pressure line's copper stub out of the
 *   wall with its grey CO₂ band, its lever ball valve (the room's
 *   isolation, a local control) and its gauge reading the line behind it;
 * - **the CO₂ detector**: an NDIR head 0.3 m off the floor (CO₂ is
 *   heavier than air) on its conduit up to its controller at eye height,
 *   its reading in ppm, its A1 and A2 lamps, its beacon, ACCEPT and RESET;
 * - **the master valve panel** in the loading bay: ON and OFF, the
 *   valve's OPEN lamp, its TRIPPED lamp and RESET, and its line gauge.
 *
 * Their readouts redraw only when what they show changes; the beacon
 * flashes at 1 Hz.
 */

export interface FittingView {
  object: Group;
  parts: PartSet;
  update(delta: number): void;
  status(): string;
}

/** Only when it changes: a setter that skips a repeat. */
const fresh = <T>(show: (v: T) => void) => {
  let last: T | undefined;
  let first = true;
  return (v: T) => {
    if (!first && v === last) return;
    first = false;
    last = v;
    show(v);
  };
};

// ---- The wall port ----------------------------------------------------------------

export interface WallPortReading {
  open: boolean;
  /** The line's pressure behind it, bar gauge. */
  lineBar: number;
}

export function createCo2WallPort(
  kit: PanelKit,
  read: () => WallPortReading,
  setOpen: (open: boolean) => void,
  name = 'CO₂ wall port',
): FittingView {
  const t = tools(kit);
  const object = new Group();
  object.name = name;
  const parts = createPartSet();
  const { w, h, d } = CO2_WALL_PORT_SIZE;
  const back = -d / 2;
  const copper = t.paint('#b8734a', 0.35, 0.8);
  const steel = t.paint('#a9afb2', 0.4, 0.6);
  // Its backplate and the sleeve's sealed collar where the line comes through.
  t.box(object, steel, w, h, 0.01, 0, 0, back + 0.005);
  const [ix, iy] = CO2_WALL_PORT_PORTS.in;
  const [, oy, oz] = CO2_WALL_PORT_PORTS.out;
  t.cyl(
    object,
    t.paint('#4a4f52', 0.6),
    0.02,
    0.012,
    ix,
    iy,
    back + 0.016,
    'z',
    16,
  );
  // The stub out of the wall, an elbow, and the drop to the port's foot.
  t.cyl(object, copper, 0.0075, oz - back, ix, iy, (back + oz) / 2, 'z', 12);
  t.cyl(object, copper, 0.0075, iy - oy, ix, (iy + oy) / 2, oz, 'y', 12);
  // BS 1710's light grey band and its legend.
  t.cyl(
    object,
    t.paint('#b9bcbc', 0.6),
    0.009,
    0.04,
    ix,
    iy - 0.05,
    oz,
    'y',
    12,
  );
  t.label(
    object,
    'CO₂',
    ix - 0.045,
    iy - 0.05,
    oz,
    0.016,
    '#1b1b1b',
    '#e9e9e4',
  );
  // Its lever ball valve on the drop: the room's isolation.
  const valve = parts.add(
    createGasBallValve(kit, {
      pipeRadius: 0.0075,
      name: `${name}: isolating valve`,
      binding: { open: () => read().open, set: setOpen },
    }),
  );
  const holder = new Group();
  holder.position.set(ix, -0.06, oz);
  valve.object.rotation.z = Math.PI / 2;
  holder.add(valve.object);
  object.add(holder);
  // Its gauge, off a tee above the valve, reading the line behind it.
  const gauge = createDialGauge(kit, {
    dia: 0.07,
    max: 6,
    unit: 'bar',
    legend: 'CO₂ LINE',
    entry: 'back',
  });
  gauge.group.position.set(0.075, 0.06, oz + 0.01);
  object.add(gauge.group);
  t.cyl(object, copper, 0.004, 0.06, 0.04, 0.06, oz, 'x', 8);
  const plate = createEngravedPlate(kit, ['CO₂ WALL PORT'], {
    width: 0.16,
    height: 0.03,
  });
  plate.position.set(0, h / 2 - 0.02, back + 0.012);
  object.add(plate);
  return {
    object,
    parts,
    update(delta) {
      gauge.set(read().lineBar);
      gauge.update(delta);
    },
    status() {
      const r = read();
      return `${r.open ? 'OPEN' : 'SHUT'} · ${r.lineBar.toFixed(1)} bar`;
    },
  };
}

// ---- The CO₂ detector -------------------------------------------------------------

export function createCo2Detector(
  kit: PanelKit,
  read: () => Co2DetectorState,
  act: (a: 'accept' | 'reset') => void,
  name = 'CO₂ detector',
): FittingView {
  const t = tools(kit);
  const object = new Group();
  object.name = `Warden ${name}`;
  const parts = createPartSet();
  const { w, h, d } = CO2_DETECTOR_SIZE;
  const back = -d / 2;
  const grey = t.paint('#c9cdca', 0.5);
  const dark = t.paint('#2a2f33', 0.55);
  // The head: its housing and its sensor's cup, down to the floor's air.
  const head = CO2_DETECTOR_PARTS.head;
  t.box(object, grey, 0.1, 0.12, 0.08, 0, head, back + 0.04);
  t.cyl(object, dark, 0.025, 0.04, 0, head - 0.08, back + 0.04, 'y', 16);
  t.label(object, 'CO₂ NDIR', 0, head + 0.02, back + 0.081, 0.012, '#30383e');
  t.label(object, '0.3 m', 0, head - 0.025, back + 0.081, 0.01, '#30383e');
  // Its conduit up to its controller.
  const ctl = CO2_DETECTOR_PARTS.controller;
  t.cyl(
    object,
    t.paint('#8d9396', 0.5, 0.4),
    0.01,
    ctl - head - 0.2,
    0,
    (ctl + head) / 2,
    back + 0.02,
    'y',
    10,
  );
  // The controller: its box, its reading, its lamps and buttons.
  const cw = w;
  const ch = 0.28;
  const cd = 0.1;
  t.box(object, t.paint('#e3e4df', 0.5), cw, ch, cd, 0, ctl, back + cd / 2);
  const front = back + cd + 0.001;
  const badge = createBrandBadge(kit, 'warden', {
    height: 0.016,
    maxWidth: 0.1,
  });
  badge.position.set(-0.04, ctl + ch / 2 - 0.02, front);
  object.add(badge);
  const mark = panelMakerMark(kit, object, {
    width: cw,
    height: ch,
    z: front,
    corner: 'bottom-right',
    size: 0.012,
    inset: 0.012,
  });
  // Penfold's mark is placed relative to the box's middle: lift it there.
  mark.position.y += ctl;
  const ppm = createSevenSegment(kit, 5, { digitHeight: 0.014 });
  ppm.group.position.set(0, ctl + 0.06, front);
  object.add(ppm.group);
  t.label(object, 'CO₂ ppm', 0.07, ctl + 0.03, front, 0.01, '#30383e');
  const a1 = t.led(object, '#ffb000', 0.008, -0.07, ctl, front + 0.003);
  const a2 = t.led(object, '#ff3b2f', 0.008, -0.035, ctl, front + 0.003);
  t.label(object, 'A1', -0.07, ctl - 0.018, front, 0.009, '#30383e');
  t.label(object, 'A2', -0.035, ctl - 0.018, front, 0.009, '#30383e');
  // The beacon on its top, flashing in either alarm.
  const beacon = t.led(
    object,
    '#ff3b2f',
    0.02,
    0,
    ctl + ch / 2 + 0.02,
    back + cd / 2,
    'y',
  );
  const accept = parts.add(
    pushButton(kit, {
      colour: 'yellow',
      legend: 'ACCEPT',
      name: `${name}: ACCEPT`,
      action: () => act('accept'),
    }),
  );
  accept.object.scale.setScalar(0.7);
  accept.object.position.set(0.02, ctl - 0.075, front);
  object.add(accept.object);
  const reset = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'RESET',
      name: `${name}: RESET`,
      action: () => act('reset'),
    }),
  );
  reset.object.scale.setScalar(0.7);
  reset.object.position.set(0.07, ctl - 0.075, front);
  object.add(reset.object);
  // Its interlock cable's gland on its top.
  const [, py, pz] = CO2_DETECTOR_PORTS.alarm;
  t.cyl(
    object,
    dark,
    0.012,
    h / 2 - (ctl + ch / 2),
    0.07,
    (py + ctl + ch / 2) / 2,
    pz,
    'y',
    10,
  );
  const showPpm = fresh<string>((s) => ppm.show(s));
  const showA1 = fresh<boolean>((on) => a1.set(on));
  const showA2 = fresh<boolean>((on) => a2.set(on));
  const showBeacon = fresh<boolean>((on) => beacon.set(on));
  let clock = 0;
  return {
    object,
    parts,
    update(delta) {
      clock += delta;
      const s = read();
      showPpm(String(Math.round(s.reading / 10) * 10).padStart(5, ' '));
      showA1(s.a1);
      showA2(s.a2);
      // The beacon flashes at 1 Hz while either alarm stands.
      showBeacon(co2DetectorAlarms(s).beacon && clock % 1 < 0.5);
    },
    status() {
      const s = read();
      return `${Math.round(s.reading)} ppm${s.a2 ? ' · A2' : s.a1 ? ' · A1' : ''}`;
    },
  };
}

// ---- The master valve panel ---------------------------------------------------------

export interface MasterPanelReading {
  on: boolean;
  open: boolean;
  tripped: boolean;
  lineBar: number;
}

/**
 * The loading bay's CO₂ master valve panel (Penfold Controls): the
 * normally closed solenoid valve's ON and OFF, its OPEN and TRIPPED lamps,
 * RESET (refused while a detector still holds the trip), and the building
 * line's gauge. 0.36 × 0.42 m, facing +z, centred on its origin.
 */
export const CO2_MASTER_PANEL_SIZE = { w: 0.36, h: 0.42, d: 0.14 } as const;

export function createCo2MasterPanel(
  kit: PanelKit,
  read: () => MasterPanelReading,
  act: (a: 'on' | 'off' | 'reset') => void,
  name = 'CO₂ master valve panel',
): FittingView {
  const t = tools(kit);
  const object = new Group();
  object.name = name;
  const parts = createPartSet();
  const { w, h, d } = CO2_MASTER_PANEL_SIZE;
  t.box(object, t.paint('#d7dad6', 0.5), w, h, d, 0, 0, 0);
  const front = d / 2 + 0.001;
  const title = createEngravedPlate(kit, ['CO₂ MASTER VALVE'], {
    width: 0.26,
    height: 0.035,
  });
  title.position.set(-0.03, h / 2 - 0.03, front);
  object.add(title);
  panelMakerMark(kit, object, { width: w, height: h, z: front });
  const gauge = createDialGauge(kit, {
    dia: 0.09,
    max: 6,
    unit: 'bar',
    legend: 'CO₂ LINE',
    entry: 'back',
  });
  gauge.group.position.set(-0.09, 0.07, front + 0.015);
  object.add(gauge.group);
  const open = t.led(object, '#3ddc5a', 0.01, 0.06, 0.1, front + 0.003);
  const tripped = t.led(object, '#ff3b2f', 0.01, 0.12, 0.1, front + 0.003);
  t.label(object, 'OPEN', 0.06, 0.075, front, 0.01, '#30383e');
  t.label(object, 'TRIPPED', 0.12, 0.075, front, 0.01, '#30383e');
  const button = (
    colour: 'green' | 'red' | 'black',
    legend: string,
    a: 'on' | 'off' | 'reset',
    x: number,
  ) => {
    const b = parts.add(
      pushButton(kit, {
        colour,
        legend,
        name: `${name}: ${legend}`,
        action: () => act(a),
      }),
    );
    b.object.position.set(x, -0.1, front);
    object.add(b.object);
  };
  button('green', 'ON', 'on', -0.11);
  button('red', 'OFF', 'off', -0.02);
  button('black', 'RESET', 'reset', 0.1);
  const showOpen = fresh<boolean>((on) => open.set(on));
  const showTripped = fresh<boolean>((on) => tripped.set(on));
  return {
    object,
    parts,
    update(delta) {
      const r = read();
      showOpen(r.open);
      showTripped(r.tripped);
      gauge.set(r.lineBar);
      gauge.update(delta);
    },
    status() {
      const r = read();
      return `${r.on ? 'ON' : 'OFF'} · ${r.tripped ? 'TRIPPED' : r.open ? 'OPEN' : 'SHUT'} · ${r.lineBar.toFixed(1)} bar`;
    },
  };
}
