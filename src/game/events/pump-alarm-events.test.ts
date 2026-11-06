import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World, WorldAction } from '../world';
import type { GameEvent } from './game-event';
import { formatEvent } from './game-event';
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

describe('the pump log', () => {
  it('logs a circulation pump stopped and started by its starter, named from its set', () => {
    const t = logged();
    t.dispatch({
      type: 'motor/starter',
      tag: 'P-201A',
      action: { act: 'stop' },
    });
    t.run(2);
    const lines = t.log.filter((e) => e.subject === 'P-201A');
    expect(lines.map(formatEvent)).toEqual([
      '00:00:00  P-201A        duty pump starter: STOP pressed (by you)',
      '00:00:00  P-201A        Lounge pool circulation pumps, duty: STOPPED (by its starter)',
    ]);
    // Once, not each step.
    expect(lines.filter((e) => /STOPPED/.test(e.text))).toHaveLength(1);
  });
});
