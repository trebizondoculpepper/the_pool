import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { membraneKey } from '../../components/core/parts/small-parts';
import {
  CM6_INSTALLED_WIDTH,
  CM6_SIZE,
  createCascadeManager,
} from '../../components/plant/views/cascade-manager';
import {
  editCascadeTrial,
  newCascadeTrial,
  stepCascadeTrial,
  trialView,
  tripTrialBoiler,
} from '../../components/plant/logic/cascade-manager-trial';
import type { CascadeTrial } from '../../components/plant/logic/cascade-manager-trial';
import type { CascadeManagerView } from '../../components/plant/logic/cascade-manager';
import { clockStopped, paused } from '../../controls/logic/paused';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/** The trial runs this many times fast, so staging can be watched. */
const SPEED = 10;

/**
 * Dev39's Hamwarmy CM6 (mission 122): the whole unit, its PLANT ENABLE
 * key switch beside it, run by the development rooms' stand-in sequencer
 * (`cascade-manager-trial.ts`) ten times fast, settled for an hour first;
 * under it a trial station: the control room's START and STOP (which work
 * in AUTO only), TRIP B4 and RESET to lock a boiler out and clear it,
 * and the unit's POWER.
 */
export function createCascadeManagerTrial(kit: PanelKit): LiveExhibit {
  const t = tools(kit);
  const object = new Group();
  let trial: CascadeTrial = newCascadeTrial();
  for (let s = 0; s < 3600; s++) trial = stepCascadeTrial(trial, 1);
  let powered = true;
  let shown: CascadeManagerView = trialView(trial, powered);
  const changed = () => (shown = trialView(trial, powered));
  const cm = createCascadeManager(kit, {
    view: () => shown,
    edit: (e) => {
      trial = editCascadeTrial(trial, e);
      changed();
    },
    setEnable: (enable) => {
      trial = { ...trial, enable };
      changed();
    },
  });
  const unitY = 0.46 / 2 - CM6_SIZE.h / 2 - 0.01;
  cm.group.position.set(-(CM6_INSTALLED_WIDTH - CM6_SIZE.w) / 2, unitY, 0);
  object.add(cm.group);
  // The trial station: a grey plate of membrane keys under the unit.
  const station = new Group();
  station.position.set(0, -0.46 / 2 + 0.05, 0);
  object.add(station);
  t.box(station, t.paint('#b9bcb5', 0.6), 0.42, 0.09, 0.01, 0, 0, 0.005);
  t.label(station, 'TRIAL STATION', 0, 0.033, 0.0105, 0.007, '#23241f');
  const keys: [string, string, () => void][] = [
    ['START', '#2f6a3a', () => (trial = { ...trial, running: true })],
    ['STOP', '#9a2a22', () => (trial = { ...trial, running: false })],
    ['TRIP B4', '#8a6a1a', () => (trial = tripTrialBoiler(trial, 3, true))],
    [
      'RESET',
      '#3b4f6b',
      () =>
        (trial = trial.boilers.reduce(
          (s, _, i) => tripTrialBoiler(s, i, false),
          trial,
        )),
    ],
    ['POWER', '#8f969c', () => (powered = !powered)],
  ];
  keys.forEach(([legend, colour, act], i) => {
    const key = cm.parts.add(
      membraneKey(kit, {
        legend,
        colour,
        ink: '#1b1b1b',
        name: `CM6 trial ${legend}`,
        action: () => {
          // The control room's START and STOP work in AUTO only.
          if (
            (legend === 'START' || legend === 'STOP') &&
            trial.enable !== 'auto'
          )
            return;
          act();
          changed();
        },
      }),
    );
    key.object.position.set(-0.16 + i * 0.08, -0.012, 0.01);
    key.object.scale.setScalar(1.4);
    station.add(key.object);
  });
  let carry = 0;
  return {
    object,
    parts: cm.parts,
    update(delta) {
      if (!clockStopped.value && !paused.value) {
        carry += Math.min(delta, 0.25) * SPEED;
        if (carry >= 1) {
          while (carry >= 1) {
            trial = stepCascadeTrial(trial, 1);
            carry -= 1;
          }
          changed();
        }
      }
      cm.update(delta);
    },
    status: cm.status,
    dispose: () => cm.dispose(),
  };
}
