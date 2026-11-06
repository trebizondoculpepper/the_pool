import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World, WorldAction } from '../world';
import type { GameEvent } from './game-event';
import { actionEvents } from './describe-action';
import { collectEvents } from './event-sources';

/** A world and its log, as the world store keeps them: actions and steps. */
function logged(start: World = newWorld()) {
  let world = start;
  const log: GameEvent[] = [];
  return {
    get world() {
      return world;
    },
    log,
    dispatch(action: WorldAction, by: 'you' | 'console' = 'you') {
      const before = world;
      world = applyAction(before, action);
      log.push(...actionEvents(before, action, world, by));
    },
    run(seconds: number, step = 0.1) {
      world = advance(world, seconds, step, (before, after) =>
        collectEvents(before, after, undefined, log),
      );
    },
  };
}

const plant = (log: readonly GameEvent[]) =>
  log.filter((e) => e.kind === 'plant');

describe('the pump log', () => {
  it('logs the make-up booster set starting and stopping on its demand', () => {
    const t = logged();
    t.run(900, 0.5);
    const booster = t.log.filter((e) => e.subject === 'WH-P1');
    expect(booster.slice(0, 2).map((e) => e.text)).toEqual([
      'Make-up booster set: STARTED',
      'Make-up booster set: STOPPED',
    ]);
    expect(booster.every((e) => e.by === 'AUTO, make-up demand')).toBe(true);
    // The circulation pumps, left alone, say nothing.
    expect(t.log.filter((e) => /^P-/.test(e.subject))).toEqual([]);
  });
});

describe('the alarm log', () => {
  it('logs an alarm coming in, accepted, cleared and reset, on its board', () => {
    const t = logged();
    t.dispatch({ type: 'motor/stop', pool: 'pool_02', stopped: true });
    t.run(20);
    const alarms = plant(t.log).filter((e) => e.text.endsWith(': ALARM'));
    expect(alarms.length).toBeGreaterThan(0);
    expect(alarms.every((e) => e.severity === 'alarm')).toBe(true);
    const one = alarms[0];
    // The board's tag and name, and the window's engraving, from the model.
    expect(one.subject).toMatch(/^[A-Z]+-CP\d+$/);
    expect(one.text).not.toMatch(/\n/);

    t.dispatch({ type: 'alarms/accept' }, 'console');
    t.dispatch({ type: 'location-alarms/accept' }, 'console');
    const accepted = plant(t.log).filter((e) => e.text.endsWith(': accepted'));
    expect(accepted.length).toBeGreaterThan(0);
    expect(accepted.every((e) => e.by === 'console')).toBe(true);

    t.dispatch({ type: 'motor/stop', pool: 'pool_02', stopped: false });
    t.run(120);
    t.dispatch({ type: 'alarms/reset' });
    t.dispatch({ type: 'location-alarms/reset' });
    expect(plant(t.log).some((e) => e.text.endsWith(': cleared'))).toBe(true);
    const reset = plant(t.log).filter((e) => e.text.endsWith(': reset'));
    expect(reset.length).toBeGreaterThan(0);
    expect(reset.every((e) => e.by === 'you')).toBe(true);
  });
});

describe('a status window', () => {
  it('logs MAKE-UP RUNNING as ON and OFF, never as an alarm to accept', () => {
    const t = logged();
    t.run(900, 0.5);
    const makeUp = plant(t.log).filter((e) => /MAKE-UP RUNNING/.test(e.text));
    expect(makeUp.length).toBeGreaterThan(0);
    for (const e of makeUp) {
      expect(e.severity).toBe('info');
      expect(e.text).toMatch(/: (ON|OFF)$/);
    }
  });
});
