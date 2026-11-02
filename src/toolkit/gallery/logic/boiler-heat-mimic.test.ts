import { describe, expect, it } from 'vite-plus/test';
import { newBoiler } from '../../components/plant/logic/boiler-house';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { layoutRoom } from './room-equipment';
import {
  BOILER_HEAT_COPY,
  BOILER_HEAT_MIMIC,
  BOILER_HEAT_PANEL,
  boilerHeatPress,
  boilerHeatState,
  cascadeOf,
} from './boiler-heat-mimic';
import { newWorld } from '../../../game/world';

describe('boiler heat mimic', () => {
  it('shows the live firing output of each boiler and their combined kW', () => {
    const a = { ...newBoiler(), code: 3 as const, rate: 0.5, flow: 76 };
    const b = { ...newBoiler(), code: 3 as const, rate: 0.8, flow: 78 };
    const state = boilerHeatState([
      a,
      b,
      newBoiler(),
      newBoiler(),
      newBoiler(),
      newBoiler(),
    ]);
    expect(checkMimic(BOILER_HEAT_MIMIC, state)).toEqual([]);
    expect(state.lamps['b1-fire']).toBe(true);
    expect(state.lamps['b2-fire']).toBe(true);
    expect(state.readouts.b1.output.value).toBe(150);
    expect(state.readouts.b2.output.value).toBe(240);
    expect(state.readouts.total.output.value).toBe(390);
  });

  it('drops stopped or faulted boilers to zero, and places the board in the boiler house', () => {
    const firing = { ...newBoiler(), code: 3 as const, rate: 0.6 };
    const faulted = {
      ...newBoiler(),
      code: 3 as const,
      rate: 0.8,
      lockout: 'flame-loss' as const,
    };
    const state = boilerHeatState([
      firing,
      faulted,
      newBoiler(),
      newBoiler(),
      newBoiler(),
      newBoiler(),
    ]);
    expect(state.readouts.total.output.value).toBe(180);
    expect(state.readouts.b2.output.value).toBe(0);
    expect(state.lamps['b2-fault']).toBe(true);
    expect(state.readouts.b6.output.value).toBe(0);
    expect(
      layoutRoom('boiler_house')?.placed.some(
        (p) => p.item.key === 'mimic-boiler-heat',
      ),
    ).toBe(true);
  });

  it('shows the sequencer: each boiler called, the lead, the header, the demand and its alarms (mission 121)', () => {
    const w = newWorld();
    const house = {
      ...w.boilerHouse,
      sequencer: {
        ...w.boilerHouse.sequencer,
        called: [2, 3],
        lead: 2,
        demand: 0.3,
        alarms: {
          lockout: 'flashing' as const,
          'header-low': 'off' as const,
          'none-available': 'steady' as const,
        },
      },
    };
    const state = boilerHeatState(
      house.boilers,
      cascadeOf(house, { flow: 79.4, return: 71.2 }),
    );
    expect(checkMimic(BOILER_HEAT_MIMIC, state)).toEqual([]);
    expect(state.lamps['b3-called']).toBe(true);
    expect(state.lamps['b4-called']).toBe(true);
    expect(state.lamps['b1-called']).toBe(false);
    expect(state.lamps['b3-lead']).toBe(true);
    expect(state.lamps['b1-lead']).toBe(false);
    expect(state.lamps['alarm-lockout']).toBe(true);
    expect(state.lamps['alarm-header-low']).toBe(false);
    expect(state.lamps['alarm-none']).toBe(true);
    expect(state.readouts.flow.temperature?.value).toBe(79.4);
    expect(state.readouts.return.output?.value).toBe(71.2);
    expect(state.readouts.setpoint.rate?.value).toBe(80);
    expect(state.readouts.demand.output?.value).toBeCloseTo(30);
  });

  it('is the rough sequencer panel in the boiler house, and only START and STOP in the control room (mission 121)', () => {
    const w = newWorld();
    const state = boilerHeatState(
      w.boilerHouse.boilers,
      cascadeOf(w.boilerHouse, w.lthw),
    );
    expect(checkMimic(BOILER_HEAT_PANEL, state)).toEqual([]);
    expect(checkMimic(BOILER_HEAT_COPY, state)).toEqual([]);
    expect(state.lamps['enable-auto']).toBe(true);
    expect(state.lamps['plant-run']).toBe(true);
    // The boiler house's board works nothing: the CM6 has its controls.
    expect(BOILER_HEAT_PANEL.buttons ?? []).toEqual([]);
    expect(
      BOILER_HEAT_COPY.buttons?.map((b) => boilerHeatPress(b.id)?.act),
    ).toEqual(['run', 'run']);
  });
});
