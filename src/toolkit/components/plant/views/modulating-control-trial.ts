import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createPartSet } from '../../core/parts/parts';
import { createTemperatureControllerPlaceholder } from './temperature-controller-placeholder';
import { createModulatingValvePlaceholder } from './modulating-valve-placeholder';
import { createThermalProbePlaceholder } from './thermal-probe-placeholder';
import {
  stepController,
  stepModulatingValve,
} from '../logic/modulating-control';
import type {
  ControllerModel,
  ModulatingValveState,
} from '../logic/modulating-control';

/**
 * The modulating temperature control trial (mission 146, the owner,
 * 2026-11-03): the placeholder temperature controller, its modulating
 * valve and its probe on a heat source whose temperature fluctuates, so
 * the controller can be seen switching the valve to regulate. A small
 * circulating loop: the probe reads the source's temperature, the
 * controller holds its set point with its band, and the valve opens and
 * closes toward the command, its stem and LED bar showing the opening.
 *
 * The heat source drifts up and down (a sine over a minute or two) so the
 * controller is always working; the probe reads the source's temperature;
 * the valve throttles a simulated heat flow that pulls the source toward
 * the set point when open.
 */
export function createModulatingControlTrial(kit: PanelKit) {
  const group = new Group();
  group.name = 'Modulating temperature control trial (mission 146)';
  const parts = createPartSet();
  // The controller's model: set 28 °C, band 4 K, AUTO.
  let model: ControllerModel = {
    measured: 27.2,
    setpoint: 28,
    band: 4,
    output: 0,
    mode: 'auto',
  };
  // The valve: a slow stroke, so its movement is seen.
  let valve: ModulatingValveState = {
    command: 0,
    position: 0,
    strokeSeconds: 12,
    powered: true,
  };
  // The heat source's own temperature, and its natural drift.
  let source = 26.5;
  let time = 0;

  const controller = createTemperatureControllerPlaceholder(kit, {
    tag: 'TC-TRIAL',
    model: () => model,
    change: (e) => {
      if (e.setpoint !== undefined) model = { ...model, setpoint: e.setpoint };
      if (e.band !== undefined) model = { ...model, band: e.band };
      if (e.mode !== undefined) model = { ...model, mode: e.mode };
    },
  });
  controller.group.position.set(0, 0.9, 0);
  group.add(controller.group);

  // The probe on the source's pipe.
  const probe = createThermalProbePlaceholder(kit, 'TE-TRIAL', {
    pipeOd: 0.08,
    read: () => source,
  });
  probe.group.position.set(0.35, 0.55, 0.15);
  group.add(probe.group);

  // The valve on the heat line between the source and the pool.
  const valvePart = createModulatingValvePlaceholder(
    kit,
    'Heat exchanger control valve',
    {
      od: 0.08,
      tag: 'TC-TRIAL-CV1',
      command: () => valve.command,
    },
  );
  valvePart.object.position.set(-0.35, 0.55, 0.15);
  group.add(valvePart.object);

  return {
    object: group,
    parts,
    update(delta: number) {
      time += delta;
      // The source drifts: up and down over about ninety seconds.
      source = 26 + 1.5 * Math.sin((time / 90) * Math.PI * 2);
      // The valve, when open, pulls the source toward the set point.
      source += (model.setpoint - source) * valve.position * 0.2 * delta;
      model = { ...model, measured: source };
      model = stepController(model);
      valve = { ...valve, command: model.output };
      valve = stepModulatingValve(valve, delta);
      controller.update(delta);
      valvePart.update(delta);
      parts.update(delta);
    },
    status: () =>
      `TRIAL: source ${source.toFixed(1)} °C, set ${model.setpoint.toFixed(1)} °C, band ${model.band} K, valve ${Math.round(valve.position * 100)}%`,
    dispose: () => {
      controller.dispose();
      valvePart.dispose();
      parts.dispose();
    },
  };
}
