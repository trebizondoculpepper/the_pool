import { describe, expect, it } from 'vite-plus/test';
import {
  TREND_SAMPLES,
  TREND_SAMPLE_S,
  cascadeAction,
  cascadeViewOf,
  logHeader,
} from './cascade-manager-view';
import {
  actOnBoilerHouse,
  newBoilerHouse,
} from '../../../game/plant/boiler-plant';
import type { BoilerHouseState } from '../../../game/plant/boiler-plant';
import {
  CASCADE_LIMITS,
  cascadeInput,
  newCascadeUi,
} from '../../components/plant/logic/cascade-manager';
import type {
  CascadeEdit,
  CascadeInput,
} from '../../components/plant/logic/cascade-manager';
import { SEQUENCER_SETTINGS } from '../../../game/plant/boiler-sequencer';

const log = logHeader(null, 0, 78);
const viewOf = (house: BoilerHouseState) =>
  cascadeViewOf(house, { flow: 78.4, time: 3600, log });

describe('the CM6 bound to the boiler house', () => {
  it('shows the sequencer as it is', () => {
    const house = newBoilerHouse();
    const v = viewOf(house);
    expect(v.enable).toBe(house.sequencer.enable);
    expect(v.running).toBe(house.sequencer.run);
    expect(v.setpointC).toBe(house.sequencer.setpoint);
    expect(v.lead).toBe(house.sequencer.lead);
    expect(v.stageUpS).toBe(house.sequencer.stageUp);
    expect(v.minRunS).toBe(house.sequencer.minRun);
    expect(v.headerC).toBe(78.4);
    expect(v.boilers).toHaveLength(6);
  });

  it('hears each boiler’s state from its controller and the sequencer', () => {
    const house = newBoilerHouse();
    const boilers = house.boilers.map((b) => ({ ...b }));
    boilers[0] = { ...boilers[0], code: 3, rate: 0.6 };
    boilers[1] = { ...boilers[1], code: 1 };
    boilers[2] = { ...boilers[2], code: 0, lockout: 'ignition-failure' };
    boilers[3] = { ...boilers[3], code: 7 };
    boilers[4] = { ...boilers[4], on: false };
    const v = viewOf({
      ...house,
      boilers,
      sequencer: { ...house.sequencer, called: [5] },
    });
    expect(v.boilers.map((b) => b.state)).toEqual([
      'firing',
      'purge',
      'lockout',
      'overrun',
      'off',
      'called',
    ]);
    expect(v.boilers[2].code).toBe('E02');
    expect(v.boilers[0].rate).toBe(0.6);
  });

  it('shows the sequencer’s alarms, new or accepted', () => {
    const house = newBoilerHouse();
    const v = viewOf({
      ...house,
      sequencer: {
        ...house.sequencer,
        alarms: {
          lockout: 'flashing',
          'header-low': 'steady',
          'none-available': 'off',
        },
      },
    });
    expect(v.alarms).toEqual([
      { text: 'BOILER LOCKOUT', flashing: true },
      { text: 'HEADER LOW', flashing: false },
    ]);
  });

  it('asks the boiler house for each edit and command', () => {
    const cases: [CascadeEdit, unknown][] = [
      [
        { setting: 'setpoint', value: 75 },
        { act: 'setting', setting: 'setpoint', value: 75 },
      ],
      [
        { setting: 'stageUp', value: 120 },
        { act: 'setting', setting: 'stageUp', value: 120 },
      ],
      [
        { setting: 'rotation', value: 'fixed' },
        { act: 'rotation', rotation: 'fixed' },
      ],
      [
        { setting: 'lead', value: 3 },
        { act: 'lead', boiler: 3 },
      ],
      [{ command: 'accept' }, { act: 'accept' }],
      [{ command: 'reset' }, { act: 'reset' }],
    ];
    for (const [edit, action] of cases)
      expect(cascadeAction(edit)).toEqual(action);
  });

  it('changes the world’s set point from its menus', () => {
    let house = newBoilerHouse();
    let ui = newCascadeUi();
    const push: CascadeInput = { kind: 'push' };
    const up: CascadeInput = { kind: 'turn', direction: 1 };
    for (const input of [push, push, push, up, up, push]) {
      const out = cascadeInput(ui, viewOf(house), input);
      ui = out.ui;
      if (out.edit) house = actOnBoilerHouse(house, cascadeAction(out.edit));
    }
    expect(house.sequencer.setpoint).toBe(
      newBoilerHouse().sequencer.setpoint + 2,
    );
  });

  it('holds the same limits as the sequencer', () => {
    expect(CASCADE_LIMITS).toEqual(SEQUENCER_SETTINGS);
  });
});

describe('the CM6’s header log', () => {
  it('starts full of the first reading', () => {
    expect(log.samples).toHaveLength(TREND_SAMPLES);
    expect(new Set(log.samples)).toEqual(new Set([78]));
  });

  it('samples every 20 s of world time, keeping the newest', () => {
    const same = logHeader(log, TREND_SAMPLE_S - 1, 80);
    expect(same).toBe(log);
    const next = logHeader(log, TREND_SAMPLE_S * 2 + 5, 80);
    expect(next.samples).toHaveLength(TREND_SAMPLES);
    expect(next.samples.slice(-2)).toEqual([80, 80]);
    expect(next.at).toBe(TREND_SAMPLE_S * 2);
  });

  it('starts again when the world’s time goes back', () => {
    const later = logHeader(log, 1000, 70);
    expect(logHeader(later, 10, 60).samples[0]).toBe(60);
  });
});
