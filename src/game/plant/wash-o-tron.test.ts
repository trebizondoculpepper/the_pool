import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { installedValveByCommandId } from './installed-valves';
import { washDisplay } from '../../toolkit/components/plant/logic/wash-o-tron-display';
import { filterValves } from './wash-o-tron-world';
import { act, allDue } from './wash-o-tron.test-support';

describe('the Lidoluxe Wash-O-Tron', () => {
  it('sets a filter’s state from its button: its old path shut first, then its new opened and proved', () => {
    let w = act(newWorld(), { act: 'mode', filter: 1, mode: 'backwash' });
    w = advance(w, 5, 1);
    // Shutting: everything shut, nothing yet open.
    expect(Object.values(filterValves(w.installedValves, 1))).toEqual(
      Array(6).fill(false),
    );
    w = advance(w, 30, 1);
    expect(filterValves(w.installedValves, 1)).toMatchObject({
      V1: false,
      V2: false,
      V3: true,
      V4: true,
      V5: false,
    });
    expect(w.washOTron.filters[1]).toMatchObject({
      mode: 'backwash',
      phase: 'steady',
    });
  });

  it('waits for room in the pit before starting a wash', () => {
    // Its programme is in AUTO from the start.
    let w = allDue(newWorld());
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 80 } };
    w = advance(w, 5, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.waiting).toBe('PIT CAPACITY');
  });

  it('will not wash while too few filters are left in service', () => {
    let w = act(newWorld(), { act: 'mode', filter: 0, mode: 'isolate' });
    w = advance(w, 30, 1);
    w = allDue(w);
    w = advance(w, 5, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.waiting).toBe('FILTER UNAVAILABLE');
  });

  it('holds its programme with a valve fault when a valve is worked by hand mid-wash', () => {
    // Its programme is in AUTO from the start.
    let w = allDue(newWorld());
    w = advance(w, 60, 1);
    const n = w.washOTron.washing!;
    expect(n).not.toBe(null);
    w = applyAction(w, {
      type: 'plant/valve',
      id: installedValveByCommandId(`PL2-F${n + 1}-V3`)!.assetId,
      open: false,
    });
    w = advance(w, 2, 1);
    expect(w.washOTron.hold).toBe(true);
    expect(w.washOTron.alarms.valveFault.on).toBe(true);
  });

  it('keeps a locked-out filter isolated, out of the programme', () => {
    let w = act(newWorld(), { act: 'lockout', filter: 2 });
    w = advance(w, 30, 1);
    w = act(w, { act: 'mode', filter: 2, mode: 'filter' });
    w = advance(w, 30, 1);
    expect(w.washOTron.filters[2]).toMatchObject({
      lockout: true,
      mode: 'isolate',
    });
  });

  it('changes a setpoint only while PROGRAMME has unlocked it, and stores it on ENTER', () => {
    let w = newWorld();
    for (let k = 0; k < 3; k++) w = act(w, { act: 'view' });
    expect(w.washOTron.view).toBe(3);
    w = act(w, { act: 'adjust', by: 1 });
    expect(w.washOTron.editing).toBe(null);
    w = act(w, { act: 'unlock' });
    w = act(w, { act: 'adjust', by: 1 });
    w = act(w, { act: 'enter' });
    expect(w.washOTron.setpoints.backwash).toBe(310);
  });

  it('starts with its programme in AUTO', () => {
    expect(newWorld().washOTron.running).toBe(true);
  });

  it('CYCLE NOW immediately starts the common timed sequence in AUTO', () => {
    let w = act(newWorld(), { act: 'cycle-now', filter: 2 });
    expect(w.washOTron.filters[2].auto).toBe(true);
    expect(w.washOTron.washing).toBe(2);
    expect(w.washOTron.step).toBe('backwash');
    // Through SETTLE and RINSE on its own timers, back to FILTER, still in AUTO.
    w = advance(w, 900, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.filters[2].mode).toBe('filter');
    expect(w.washOTron.filters[2].auto).toBe(true);
  });

  it('BACKWASH is a manual state button, not another route into the cycle', () => {
    const w = act(newWorld(), { act: 'mode', filter: 1, mode: 'backwash' });
    expect(w.washOTron.filters[1].auto).toBe(false);
    expect(w.washOTron.washing).toBe(null);
  });

  it('CYCLE NOW completes with automatic scheduling off and leaves it off', () => {
    let w = act(newWorld(), { act: 'run' });
    w = act(w, { act: 'auto', filter: 3 });
    expect(w.washOTron.running).toBe(false);
    expect(w.washOTron.filters[3].auto).toBe(false);
    w = act(w, { act: 'cycle-now', filter: 3 });
    expect(w.washOTron.washing).toBe(3);
    w = advance(w, 900, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.filters[3].mode).toBe('filter');
    expect(w.washOTron.filters[3].auto).toBe(false);
    expect(w.washOTron.running).toBe(false);
  });

  it('switching scheduled AUTO off during a cycle leaves its sequencer running', () => {
    let w = act(newWorld(), { act: 'cycle-now', filter: 1 });
    w = advance(w, 60, 1);
    w = act(w, { act: 'run' });
    expect(w.washOTron.running).toBe(false);
    expect(w.washOTron.washing).toBe(1);
    w = advance(w, 900, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.filters[1]).toMatchObject({
      mode: 'filter',
      phase: 'steady',
    });
  });

  it('keeps CYCLE NOW lit through the return valves until FILTER is proved', () => {
    let w = act(newWorld(), { act: 'cycle-now', filter: 1 });
    for (let t = 0; t < 900 && w.washOTron.step !== null; t++)
      w = advance(w, 1, 1);
    expect(w.washOTron.washing).toBe(1);
    expect(w.washOTron.filters[1].phase).not.toBe('steady');
    w = advance(w, 45, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.filters[1]).toMatchObject({
      mode: 'filter',
      phase: 'steady',
    });
  });

  it('ignores CYCLE NOW while any filter has the one sequencer', () => {
    let w = act(newWorld(), { act: 'cycle-now', filter: 2 });
    const before = w.washOTron;
    w = act(w, { act: 'cycle-now', filter: 1 });
    expect(w.washOTron).toBe(before);
    w = advance(w, 900, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.filters[1].lastWash).toBe(0);
  });

  it('refuses an unsafe button cycle without saving a pending request', () => {
    let w = {
      ...newWorld(),
      wetHall: { ...newWorld().wetHall, backwashTank: 80 },
    };
    w = act(w, { act: 'cycle-now', filter: 2 });
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.waiting).toBe('PIT CAPACITY');
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 0 } };
    w = advance(w, 5, 1);
    expect(w.washOTron.washing).toBe(null);
  });

  it('keeps an AUTO IDLE button refusal readable after the next world step', () => {
    let w = newWorld();
    w = applyAction(w, {
      type: 'plant/feeder',
      room: 'plant_pool_02',
      on: false,
    });
    w = act(w, { act: 'cycle-now', filter: 2 });
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.waiting).toBe('LOW FLOW');
    w = advance(w, 2, 1);
    expect(washDisplay(w.washOTron, { time: w.time, pitShare: 0 })).toEqual([
      'AUTO IDLE           ',
      'WAIT LOW FLOW       ',
    ]);
  });
});
