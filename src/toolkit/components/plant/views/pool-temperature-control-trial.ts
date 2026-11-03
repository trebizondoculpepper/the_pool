import { CylinderGeometry, Group, Mesh, Vector3 } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { createPartSet, potentiometer, selector } from '../../core/parts/parts';
import { tools } from '../../core/views/fitting-tools';
import { createActuatedButterflyValve } from './actuated-butterfly-valve';
import { createWaterButterflyValve } from './water-butterfly-valve';
import { createPanelMeter } from '../../industrial-control/views/panel-instruments';
import { createPoolTemperatureProbe } from './pool-temperature-controller';
import { HEAT } from '../../../../game/plant/pools';
import { AMBIENT, stepThermal } from '../../../../game/plant/thermal';
import {
  newPoolTemperatureControl,
  stepPoolTemperatureControl,
} from '../../../../game/plant/pool-temperature-control';
import type { PoolTemperatureControlState } from '../../../../game/plant/pool-temperature-control';

/** Isolated dev65 demonstration of the two period controller choices; owns no saved world state. */
export function createPoolTemperatureControlTrial(kit: PanelKit) {
  const t = tools(kit);
  const object = new Group();
  object.name = 'Pool exchanger temperature control trial';
  object.position.y = 1;
  const parts = createPartSet();
  const cards: {
    readout?: ReturnType<typeof createSevenSegment>;
    meter?: ReturnType<typeof createPanelMeter>;
    controller: PoolTemperatureControlState;
    /** The step result's commanded position, for the valve's sound. */
    command: number;
    temp: number;
    pool: 'pool_01' | 'pool_02';
    modern: boolean;
  }[] = [];
  const lead = t.paint('#30363a', 0.2);
  const cable = (from: Vector3, to: Vector3) => {
    const direction = new Vector3().subVectors(to, from);
    const mesh = new Mesh(
      new CylinderGeometry(0.004, 0.004, direction.length(), 6),
      lead,
    );
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.normalize(),
    );
    mesh.userData.live = false;
    object.add(mesh);
  };
  const addCard = (
    tag: string,
    maker: string,
    reference: string,
    x: number,
    modern: boolean,
  ) => {
    const card = new Group();
    card.position.x = x;
    object.add(card);
    t.box(card, t.paint('#30373a', 0.5), 0.72, 0.58, 0.1, 0, 0, 0.05);
    const title = t.printed(
      0.68,
      0.11,
      (c, w, h) => {
        c.fillStyle = '#eeeade';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#16232b';
        c.font = `bold ${h * 0.23}px Arial`;
        c.fillText(`${tag}  ${maker}`, 8, h * 0.34);
        c.font = `${h * 0.17}px Arial`;
        c.fillText(reference, 8, h * 0.75, w - 16);
      },
      512,
    );
    title.mesh.position.set(0, 0.21, 0.102);
    card.add(title.mesh);
    const pool = modern ? 'pool_02' : 'pool_01';
    const state: (typeof cards)[number] = {
      controller: newPoolTemperatureControl(modern ? 28 : 30),
      command: 0,
      temp: modern ? 27.2 : 29.1,
      pool,
      modern,
    };
    if (modern) {
      // CAL 3300 fascia is only 51 × 28.5 mm; its 106.7 mm case sits behind
      // the exhibit panel, represented here by the panel card itself.
      const fascia = new Group();
      t.box(fascia, t.paint('#d9ddda', 0.45), 0.051, 0.0285, 0.004, 0, 0, 0);
      card.add(fascia);
      fascia.position.set(-0.12, 0.08, 0.105);
      const r = createSevenSegment(kit, 4, { digitHeight: 0.0055 });
      r.group.position.set(-0.12, 0.08, 0.1075);
      card.add(r.group);
      state.readout = r;
    } else {
      // West 6000 is a 1/16 DIN module; show only its small fascia.
      const fascia = new Group();
      t.box(fascia, t.paint('#22282c', 0.45), 0.048, 0.048, 0.004, 0, 0, 0);
      card.add(fascia);
      fascia.position.set(-0.14, 0.07, 0.105);
      const m = createPanelMeter(kit, '°C', { width: 0.046, scaleMax: 40 });
      m.group.position.set(-0.14, 0.07, 0.1075);
      card.add(m.group);
      state.meter = m;
    }
    const set = potentiometer(kit, {
      steps: 20,
      legend: 'SET °C',
      name: `${tag} local setpoint`,
      bound: {
        get value() {
          return Math.round((state.controller.setpoint - 20) * 2);
        },
        set(v: number) {
          state.controller = { ...state.controller, setpoint: 20 + v / 2 };
        },
      },
    });
    set.object.position.set(0.16, 0.09, 0.1);
    card.add(set.object);
    parts.add(set);
    const mode = selector(kit, {
      positions: 2,
      initial: 0,
      legend: 'AUTO · HAND',
      name: `${tag} mode`,
      bound: {
        get value() {
          return state.controller.mode === 'auto' ? 0 : 1;
        },
        set(v: number) {
          state.controller = { ...state.controller, mode: v ? 'hand' : 'auto' };
        },
      },
    });
    mode.object.position.set(0.16, -0.09, 0.1);
    card.add(mode.object);
    parts.add(mode);
    const dn = modern ? 100 : 50;
    const valve = createActuatedButterflyValve(
      kit,
      dn,
      'x',
      `${tag} modulating LTHW control valve`,
      {
        open: () => state.controller.valvePosition > 0.01,
        set: (open) => {
          state.controller = {
            ...state.controller,
            manualOutput: open ? 1 : 0,
          };
        },
        commandPosition: () => state.command,
        position: () => state.controller.valvePosition,
      },
      { plaque: { tag: `${tag}-CV1`, name: 'LTHW control valve' } },
    );
    valve.object.position.set(x, -0.45, 0.02);
    object.add(valve.object);
    parts.add(valve);
    const flowIso = createWaterButterflyValve(
      kit,
      dn,
      'x',
      `${tag} flow isolator`,
      {
        open: () => state.controller.flowIsolatorOpen,
        set: (open) => {
          state.controller = { ...state.controller, flowIsolatorOpen: open };
        },
      },
      'lever',
      { tag: `${tag}-IV1`, name: 'Heating flow isolator' },
    );
    flowIso.object.position.set(x - 0.58, -0.45, 0.02);
    object.add(flowIso.object);
    parts.add(flowIso);
    const returnIso = createWaterButterflyValve(
      kit,
      dn,
      'x',
      `${tag} return isolator`,
      {
        open: () => state.controller.returnIsolatorOpen,
        set: (open) => {
          state.controller = { ...state.controller, returnIsolatorOpen: open };
        },
      },
      'lever',
      { tag: `${tag}-IV2`, name: 'Heating return isolator' },
    );
    returnIso.object.position.set(x + 0.58, -0.45, 0.02);
    object.add(returnIso.object);
    parts.add(returnIso);
    const probe = createPoolTemperatureProbe(
      kit,
      `${tag}-TE1`,
      modern ? 0.11 : 0.06,
    );
    probe.position.set(x, -0.78, 0);
    object.add(probe);
    const sensorZ = (modern ? 0.11 : 0.06) / 2 + 0.174;
    cable(new Vector3(x, -0.78, sensorZ), new Vector3(x, -0.78, -0.04));
    cable(new Vector3(x, -0.78, -0.04), new Vector3(x, -0.14, -0.04));
    cable(new Vector3(x, -0.14, -0.04), new Vector3(x, -0.14, 0.05));
    const note = createMicroLabel(
      kit,
      'Pt100 IN EXCHANGER WATER OUTLET POCKET',
      { height: 0.012, ink: '#f2efe4', maxWidth: 0.55 },
    );
    note.position.set(x, -0.95, 0.08);
    object.add(note);
    cards.push(state);
  };
  addCard(
    'TC-PL1',
    'WEST 6000',
    'analogue time-proportioning; model date unverified',
    -0.85,
    false,
  );
  addCard('TC-PL2', 'CAL 3300', 'current digital PID controller', 0.85, true);
  return {
    object,
    parts,
    update(delta: number) {
      for (const c of cards) {
        const result = stepPoolTemperatureControl(c.controller, {
          poolTemperature: c.temp,
          circulationAvailable: true,
          primaryFlowIsolated: !c.controller.flowIsolatorOpen,
          primaryReturnIsolated: !c.controller.returnIsolatorOpen,
          dt: delta,
        });
        c.controller = result.state;
        c.command = result.commandedPosition;
        c.temp = stepThermal(
          { water: c.temp, air: c.modern ? 29 : 31 },
          HEAT[c.pool],
          {
            heatWater: true,
            heatAir: false,
            ambient: AMBIENT,
            ventilated: true,
            madeUp: 0,
            waterControllerOutput: c.controller.valvePosition,
            ring: 80,
          },
          delta,
        ).water;
        c.readout?.show(c.temp.toFixed(1));
        c.meter?.set(c.temp / 40);
        c.meter?.update(delta);
      }
      parts.update(delta);
    },
    status: () =>
      cards
        .map(
          (c) =>
            `${c.modern ? 'CAL 3300' : 'West 6000'} ${c.temp.toFixed(1)} °C, SP ${c.controller.setpoint.toFixed(1)} °C, ${c.controller.mode.toUpperCase()}, valve ${Math.round(c.controller.valvePosition * 100)}%`,
        )
        .join('; '),
  };
}
