import { Group } from 'three';
import { computed } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { createPartSet, potentiometer, selector } from '../../core/parts/parts';
import { tools } from '../../core/views/fitting-tools';
import { createPanelMeter } from '../../industrial-control/views/panel-instruments';
import type { WorldAction } from '../../../../game/world';
import type { PoolTemperatureControlState } from '../../../../game/plant/pool-temperature-control';
import { roomWorld } from '../../../save/world-store';
import {
  createRackCabinet,
  createRackUnit,
} from '../../industrial-control/views/rack-equipment';
import { music_source } from '../../sound/parts/music-source';
import { serviceAvailable } from '../../../../game/plant/services';

/** Local pool-water controller fitted in a plant room; its settings operate the saved world. */
export function createPoolTemperatureController(
  kit: PanelKit,
  pool: 'pool_01' | 'pool_02',
  period: 'analogue' | 'digital',
) {
  const tag = pool === 'pool_01' ? 'PL1-TC1' : 'PL2-TC1';
  const state = (): PoolTemperatureControlState =>
    roomWorld().world.value.poolTemperatureControls[pool]!;
  const dispatch = (act: WorldAction) => roomWorld().dispatch(act);
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} pool water temperature controller`;
  const parts = createPartSet();
  // Penfold 8U wall enclosure. Its 19-inch rails take standard rack units;
  // CAL/WEST fasciae are only the small apertures visible in their 2U panel.
  const enclosure = createRackCabinet(kit, {
    units: 8,
    width: 0.55,
    depth: 0.18,
    brand: 'penfold',
    colour: period === 'analogue' ? 'charcoal' : 'grey',
    door: 'none',
    feet: 'levellers',
  });
  enclosure.group.position.set(0, -0.24, 0.07);
  group.add(enclosure.group);
  const zone = pool === 'pool_01' ? 'lazy_pool' : 'olympic';
  const musicBinding = {
    source: computed(() => roomWorld().world.value.music.zones[zone].source),
    amplifier: computed(
      () => roomWorld().world.value.music.zones[zone].amplifier,
    ),
    powered: computed(() =>
      serviceAvailable(roomWorld().world.value.plant, `plant_${pool}`, 'power'),
    ),
    skip: () =>
      roomWorld().dispatch({ type: 'music', action: { type: 'skip', zone } }),
    toggle: () =>
      roomWorld().dispatch({ type: 'music', action: { type: 'toggle', zone } }),
    volume: (volume: number) =>
      roomWorld().dispatch({
        type: 'music',
        action: { type: 'volume', zone, volume },
      }),
  };
  const musicPlayer = parts.add(music_source(kit, musicBinding, []));
  enclosure.mount(musicPlayer.unit, 2);
  const controller = createRackUnit(kit, {
    u: 2,
    style: 'controls',
    colour: period === 'analogue' ? 'charcoal' : 'grey',
    depth: 0.14,
    label: period === 'analogue' ? 'WEST 6000' : 'CAL 3300',
  });
  enclosure.mount(controller, 6);
  const controllerFace = controller.face;
  const moduleWidth = period === 'analogue' ? 0.048 : 0.051;
  const moduleHeight = period === 'analogue' ? 0.048 : 0.0285;
  // The DIN controller's enclosure projects behind the panel. Only its
  // bezel and display appear on the face; the mounting clamp is behind it.
  const moduleX = -0.145;
  t.box(
    controllerFace,
    t.paint('#15191b', 0.3),
    moduleWidth,
    moduleHeight,
    0.1067,
    moduleX,
    0,
    -0.051,
  );
  t.box(
    controllerFace,
    t.paint(period === 'analogue' ? '#22282c' : '#d9ddda', 0.45),
    moduleWidth,
    moduleHeight,
    0.004,
    moduleX,
    0,
    0.004,
  );
  const reading =
    period === 'analogue'
      ? createPanelMeter(kit, '°C', { width: 0.046, scaleMax: 40 })
      : createSevenSegment(kit, 4, { digitHeight: 0.0055 });
  reading.group.position.set(moduleX, 0, 0.008);
  controllerFace.add(reading.group);
  const modelLabel = createMicroLabel(
    kit,
    `${tag}  ${period === 'analogue' ? 'WEST 6000' : 'CAL 3300'}`,
    {
      height: 0.006,
      ink: period === 'analogue' ? '#f1eee4' : '#25241f',
      maxWidth: 0.27,
    },
  );
  modelLabel.position.set(0.085, 0.024, 0.004);
  controllerFace.add(modelLabel);
  const controlsUnit = createRackUnit(kit, {
    u: 2,
    style: 'controls',
    colour: period === 'analogue' ? 'charcoal' : 'grey',
    depth: 0.08,
    label: 'LOCAL TEMPERATURE CONTROLS',
  });
  enclosure.mount(controlsUnit, 4);
  const controlsFace = controlsUnit.face;
  const setpoint = potentiometer(kit, {
    steps: 20,
    legend: 'SET °C',
    name: `${tag} local set point`,
    bound: {
      get value() {
        return Math.round((state().setpoint - 20) * 2);
      },
      set(value: number) {
        dispatch({ type: 'pool/setpoint', pool, celsius: 20 + value / 2 });
      },
    },
  });
  setpoint.object.position.set(-0.145, 0, 0.004);
  controlsFace.add(setpoint.object);
  parts.add(setpoint);
  const mode = selector(kit, {
    positions: 2,
    initial: 0,
    legend: 'AUTO · HAND',
    name: `${tag} local mode selector`,
    bound: {
      get value() {
        return state().mode === 'auto' ? 0 : 1;
      },
      set(value: number) {
        dispatch({
          type: 'pool/temperature-control',
          pool,
          act: 'mode',
          mode: value ? 'hand' : 'auto',
        });
      },
    },
  });
  mode.object.position.set(0, 0, 0.004);
  controlsFace.add(mode.object);
  parts.add(mode);
  const handOutput = potentiometer(kit, {
    steps: 10,
    legend: 'HAND %',
    name: `${tag} manual heat output`,
    bound: {
      get value() {
        return Math.round(state().manualOutput * 10);
      },
      set(value: number) {
        dispatch({
          type: 'pool/temperature-control',
          pool,
          act: 'manual-output',
          output: value / 10,
        });
      },
    },
  });
  handOutput.object.position.set(0.145, 0, 0.004);
  controlsFace.add(handOutput.object);
  parts.add(handOutput);
  let shown = '';
  const valveMeter =
    period === 'analogue'
      ? createPanelMeter(kit, '%', { width: 0.07, scaleMax: 100 })
      : null;
  if (valveMeter) {
    valveMeter.group.position.set(0.145, 0, 0.012);
    controlsFace.add(valveMeter.group);
  }
  const label = createMicroLabel(kit, 'VALVE POSITION', {
    height: 0.008,
    ink: period === 'analogue' ? '#eeeade' : '#17222a',
    maxWidth: 0.17,
  });
  label.position.set(0.145, -0.025, 0.004);
  controlsFace.add(label);
  for (const at of [1, 3, 8])
    enclosure.mount(
      createRackUnit(kit, { u: 1, style: 'blank', colour: 'black' }),
      at,
    );
  return {
    group,
    parts,
    update(delta: number) {
      const w = roomWorld().world.value;
      const s = state();
      const temp = w.pools[pool].temperature;
      if (period === 'analogue') {
        (reading as ReturnType<typeof createPanelMeter>).set(temp / 40);
        (reading as ReturnType<typeof createPanelMeter>).update(delta);
        valveMeter!.set(s.valvePosition);
        valveMeter!.update(delta);
      } else {
        const text = temp.toFixed(1);
        if (text !== shown) {
          shown = text;
          (reading as ReturnType<typeof createSevenSegment>).show(text);
        }
      }
      parts.update(delta);
    },
    status: () =>
      `${tag}: ${roomWorld().world.value.pools[pool].temperature.toFixed(1)} °C; SP ${state().setpoint.toFixed(1)} °C; ${state().mode.toUpperCase()}; valve ${Math.round(state().valvePosition * 100)}%`,
  };
}

/** Remote Pt100 pocket probe with a screened lead gland; no local display. */
export function createPoolTemperatureProbe(
  kit: PanelKit,
  tag: string,
  pipeOd: number,
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} remote pool water Pt100 probe`;
  const stainless = t.paint('#aeb5b5', 0.55, 0.7);
  const head = t.paint('#aeb7b2', 0.45, 0.2);
  const radius = pipeOd / 2;
  t.cyl(group, stainless, 0.012, 0.035, 0, 0, radius + 0.01, 'z', 12);
  t.cyl(group, stainless, 0.006, 0.095, 0, 0, radius + 0.07, 'z', 10);
  t.box(group, head, 0.07, 0.05, 0.045, 0, 0, radius + 0.15);
  const label = createMicroLabel(kit, `${tag}  Pt100`, {
    height: 0.009,
    ink: '#182027',
    maxWidth: 0.07,
  });
  label.position.set(0, -0.031, radius + 0.174);
  group.add(label);
  return group;
}
