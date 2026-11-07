import { describe, expect, it } from 'vite-plus/test';
import { createRoomTraitHost, defineRoomTrait } from './room-trait';

/** A test trait: records what happens to each visit. */
function probe() {
  const log: string[] = [];
  const trait = defineRoomTrait({
    id: 'probe',
    reason: 'test only',
    defaults: { label: 'default', rate: 1 },
    visit(config, { room }) {
      const label = typeof config.label === 'string' ? config.label : '?';
      const rate = typeof config.rate === 'number' ? config.rate : 0;
      log.push(`enter ${room} ${label} ${rate}`);
      return {
        step: (dt) => log.push(`step ${room} ${dt}`),
        dispose: () => log.push(`leave ${room}`),
      };
    },
  });
  return {
    log,
    host: createRoomTraitHost({ probe: trait }, { emit: () => {} }),
  };
}

describe('room traits, per visit (#102)', () => {
  it('sets up a declared trait on entry, with the room config over defaults', () => {
    const { log, host } = probe();
    host.enter('dev0', [{ trait: 'probe', config: { label: 'mine' } }]);
    expect(log).toEqual(['enter dev0 mine 1']);
    expect(host.room()).toBe('dev0');
  });

  it('steps by world time, and not at all while the world is paused', () => {
    const { log, host } = probe();
    host.enter('dev0', [{ trait: 'probe' }]);
    host.step(0.5);
    // Paused: the world's time does not move, so the step is nothing.
    host.step(0);
    host.step(Number.NaN);
    expect(log.slice(1)).toEqual(['step dev0 0.5']);
  });

  it('tears down on leaving, and on entering another room', () => {
    const { log, host } = probe();
    host.enter('dev0', [{ trait: 'probe' }]);
    host.enter('dev1', [{ trait: 'probe' }]);
    host.leave();
    host.step(1);
    expect(log).toEqual([
      'enter dev0 default 1',
      'leave dev0',
      'enter dev1 default 1',
      'leave dev1',
    ]);
    expect(host.room()).toBeNull();
  });

  it('gives a room with no traits nothing, and refuses an unknown trait', () => {
    const { log, host } = probe();
    host.enter('dev0');
    host.step(1);
    expect(log).toEqual([]);
    expect(() => host.enter('dev0', [{ trait: 'missing' }])).toThrow(
      /unknown room trait missing/,
    );
  });
});
