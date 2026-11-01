import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import { alarmEvents } from '../events/alarm-events';
import type { GameEvent } from '../events/game-event';
import { co2MimicLamps, co2Windows } from './co2-annunciator';
import { newCo2Plant } from './co2-plant';
import { setMaster, setPortOpen, tripMaster } from './co2-distribution';
import { loungeAlarms } from './lounge-annunciator';
import { olympicAlarms } from './olympic-annunciator';
import { litLocationWindows } from './location-annunciators';
import { INFORMATIONAL_INDICATIONS } from '../health';

describe('the CO₂ system’s windows and mimic lamps', () => {
  it('lights nothing in a new game', () => {
    const w = newWorld();
    expect(co2Windows(w.co2, 'plant_pool_01')).toEqual([]);
    expect(co2Windows(w.co2, 'plant_pool_02')).toEqual([]);
    expect(co2MimicLamps(w.co2, 'plant_pool_01')).toEqual({
      pressureLow: false,
      changeCylinders: false,
    });
  });

  it('calls the master valve tripped and, the line drawn down, its pressure low, on both boards', () => {
    const p = newCo2Plant();
    const tripped = {
      ...p,
      distribution: { ...tripMaster(p.distribution), lineKg: 0 },
    };
    for (const room of ['plant_pool_01', 'plant_pool_02'] as const)
      expect(co2Windows(tripped, room)).toEqual([
        'co2-line-low',
        'co2-master-trip',
      ]);
    expect(co2MimicLamps(tripped, 'plant_pool_01').pressureLow).toBe(true);
    // Switched off at its panel, the line's low pressure is not an alarm.
    const off = {
      ...p,
      distribution: { ...setMaster(p.distribution, false), lineKg: 0 },
    };
    expect(co2Windows(off, 'plant_pool_01')).toEqual([]);
  });

  it('lights a room’s CO₂ PRESSURE LOW lamp from its own wall port shut, not the other’s', () => {
    const p = newCo2Plant();
    const shut = {
      ...p,
      distribution: setPortOpen(p.distribution, 'plant_pool_01', false),
    };
    expect(co2MimicLamps(shut, 'plant_pool_01').pressureLow).toBe(true);
    expect(co2MimicLamps(shut, 'plant_pool_02').pressureLow).toBe(false);
  });

  it('calls its own room’s detector alarms and panel fault', () => {
    const p = newCo2Plant();
    const alarmed = {
      ...p,
      detectors: {
        ...p.detectors,
        plant_pool_02: { ...p.detectors.plant_pool_02, a1: true, a2: true },
      },
      dosers: {
        ...p.dosers,
        plant_pool_01: {
          ...p.dosers.plant_pool_01,
          fault: 'valve-stuck' as const,
        },
      },
    };
    expect(co2Windows(alarmed, 'plant_pool_01')).toEqual(['co2-panel-fault']);
    expect(co2Windows(alarmed, 'plant_pool_02')).toEqual([
      'co2-gas-a1',
      'co2-gas-a2',
    ]);
  });

  it('puts them on the Lounge’s and the Olympic’s boards, and so on the bridge’s lists', () => {
    const w = newWorld();
    const tripped = {
      ...w,
      co2: {
        ...w.co2,
        distribution: tripMaster(w.co2.distribution),
      },
    };
    expect(loungeAlarms(tripped)).toContain('co2-master-trip');
    expect(olympicAlarms(tripped)).toContain('co2-master-trip');
    const stepped = stepWorld(tripped, 1);
    const listed = litLocationWindows(stepped).map((l) => l.words);
    expect(listed).toContain('PL1 CO₂ MASTER VALVE TRIPPED');
    expect(listed).toContain('PL2 CO₂ MASTER VALVE TRIPPED');
    // A rack changed over is routine, logged ON and OFF; the rest are faults.
    expect('co2-bank-empty' in INFORMATIONAL_INDICATIONS).toBe(true);
    expect('co2-exhausted' in INFORMATIONAL_INDICATIONS).toBe(false);
  });

  it('shows the Olympic’s mass flow controller’s valve OVERRIDE in its spare way, logged ON and OFF, not an alarm', () => {
    const w = newWorld();
    expect(olympicAlarms(w)).not.toContain('co2-mfc-override');
    const forced = applyAction(w, {
      type: 'co2/panel',
      room: 'plant_pool_02',
      action: { kind: 'override', override: 'open' },
    });
    expect(olympicAlarms(forced)).toContain('co2-mfc-override');
    expect(loungeAlarms(forced)).not.toContain('co2-mfc-override');
    expect('co2-mfc-override' in INFORMATIONAL_INDICATIONS).toBe(true);
    const on = stepWorld(forced, 1);
    const out: GameEvent[] = [];
    alarmEvents(w, on, undefined, out);
    const line = out.find((e) => e.text.includes('OVERRIDDEN'));
    expect(line?.text).toMatch(/: ON$/);
    expect(line?.severity).toBe('info');
    const back = stepWorld(
      applyAction(on, {
        type: 'co2/panel',
        room: 'plant_pool_02',
        action: { kind: 'override', override: 'normal' },
      }),
      1,
    );
    const off: GameEvent[] = [];
    alarmEvents(on, back, undefined, off);
    expect(off.find((e) => e.text.includes('OVERRIDDEN'))?.text).toMatch(
      /: OFF$/,
    );
  });
});
