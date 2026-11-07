import { describe, expect, it } from 'vite-plus/test';
import { createTriggers, type TriggerRule } from './triggers';

const run = (rules: TriggerRule[]) => createTriggers(rules);

describe('clocks', () => {
  it('advance in simulation time and ignore bad steps', () => {
    const t = run([]);
    t.step(1.5);
    t.step(0);
    t.step(-2);
    t.step(Number.NaN);
    t.step(Infinity);
    expect(t.clocks()).toEqual({ game: 1.5, room: 1.5 });
  });
  it('stand still while paused (no step)', () => {
    const t = run([{ id: 'a', when: { game: { atLeast: 5 } } }]);
    t.step(4);
    expect(t.clocks().game).toBe(4);
    expect(t.clocks().game).toBe(4);
    expect(t.step(0)).toEqual([]);
  });
  it('room entry restarts the room timer, not the game timer', () => {
    const t = run([]);
    t.step(10);
    t.event({ type: 'entered', room: 'dev71' });
    t.step(3);
    expect(t.clocks()).toEqual({ game: 13, room: 3 });
  });
});

describe('once rules', () => {
  it('fire on the game clock once, though the condition stays true', () => {
    const t = run([{ id: 'g', when: { game: { atLeast: 20 } } }]);
    expect(t.step(19)).toEqual([]);
    expect(t.step(1)).toEqual(['g']);
    expect(t.step(100)).toEqual([]);
  });
  it('fire on the room clock, and once means once until reset', () => {
    const t = run([{ id: 'r', when: { room: { atLeast: 30 } } }]);
    expect(t.step(30)).toEqual(['r']);
    t.event({ type: 'entered', room: 'a' });
    expect(t.step(30)).toEqual([]);
  });
  it('fire on entry to the named room only', () => {
    const t = run([{ id: 'e', when: { entered: 'dev71' } }]);
    expect(t.event({ type: 'entered', room: 'dev70' })).toEqual([]);
    expect(t.event({ type: 'entered', room: 'dev71' })).toEqual(['e']);
    expect(t.step(5)).toEqual([]);
  });
  it('report through the listener too, until removed', () => {
    const t = run([{ id: 'g', when: { game: { atLeast: 1 } } }]);
    const seen: string[] = [];
    const off = t.onFire((id) => seen.push(id));
    t.step(1);
    off();
    t.reset();
    t.step(1);
    expect(seen).toEqual(['g']);
  });
});

describe('combinators', () => {
  it('all needs every part', () => {
    const t = run([
      {
        id: 'x',
        when: { all: [{ game: { atLeast: 10 } }, { room: { atLeast: 5 } }] },
      },
    ]);
    t.step(8);
    t.event({ type: 'entered', room: 'a' });
    expect(t.step(4)).toEqual([]); // game 12, room 4
    expect(t.step(1)).toEqual(['x']);
  });
  it('any needs one part', () => {
    const t = run([
      {
        id: 'x',
        when: { any: [{ game: { atLeast: 100 } }, { entered: 'b' }] },
      },
    ]);
    expect(t.event({ type: 'entered', room: 'b' })).toEqual(['x']);
  });
  it('not inverts, firing at the start step when its inner condition is false', () => {
    const t = run([{ id: 'x', when: { not: { room: { atLeast: 5 } } } }]);
    expect(t.step(1)).toEqual(['x']);
  });
  it('an entry combined with a clock fires only if the clock holds at the entry', () => {
    const t = run([
      { id: 'x', when: { all: [{ entered: 'a' }, { game: { atLeast: 10 } }] } },
    ]);
    expect(t.event({ type: 'entered', room: 'a' })).toEqual([]);
    t.step(20);
    expect(t.event({ type: 'entered', room: 'a' })).toEqual(['x']);
  });
});

describe('recurring rules', () => {
  it('fire on the edge, then every interval, while running', () => {
    const t = run([
      { id: 'r', when: { game: { atLeast: 2 } }, fire: { every: 3 } },
    ]);
    expect(t.step(2)).toEqual(['r']);
    expect(t.step(2.9)).toEqual([]);
    expect(t.step(0.1)).toEqual(['r']);
    expect(t.step(3)).toEqual(['r']);
  });
  it('fire each due occurrence when one step crosses several', () => {
    const t = run([
      { id: 'r', when: { game: { atLeast: 0.5 } }, fire: { every: 1 } },
    ]);
    t.step(0.5);
    expect(t.step(3)).toEqual(['r', 'r', 'r']);
  });
  it('stop at max', () => {
    const t = run([
      { id: 'r', when: { game: { atLeast: 1 } }, fire: { every: 1, max: 3 } },
    ]);
    const fired = [t.step(1), t.step(10)].flat();
    expect(fired).toEqual(['r', 'r', 'r']);
    expect(t.step(10)).toEqual([]);
  });
  it('stop when until holds at an occurrence, judged at that moment', () => {
    const t = run([
      {
        id: 'r',
        when: { game: { atLeast: 1 } },
        fire: { every: 2, until: { game: { atLeast: 6 } } },
      },
    ]);
    // Occurrences at 1, 3, 5; at 7 until holds. One big step gives the same.
    expect(t.step(1)).toEqual(['r']);
    expect(t.step(20)).toEqual(['r', 'r']);
    expect(t.step(20)).toEqual([]);
  });
  it('rearm only after a fresh qualifying event', () => {
    const t = run([
      { id: 'r', when: { entered: 'a' }, fire: { every: 5, max: 2 } },
    ]);
    expect(t.event({ type: 'entered', room: 'a' })).toEqual(['r']);
    expect(t.step(5)).toEqual(['r']);
    expect(t.step(50)).toEqual([]);
    expect(t.event({ type: 'entered', room: 'b' })).toEqual([]);
    expect(t.event({ type: 'entered', room: 'a' })).toEqual(['r']);
  });
  it('a fresh event while running does not restart it', () => {
    const t = run([{ id: 'r', when: { entered: 'a' }, fire: { every: 5 } }]);
    t.event({ type: 'entered', room: 'a' });
    t.step(3);
    expect(t.event({ type: 'entered', room: 'a' })).toEqual([]);
    expect(t.step(2)).toEqual(['r']);
  });
  it('keep independent clocks and do not delay each other', () => {
    const t = run([
      { id: 'fast', when: { game: { atLeast: 0 } }, fire: { every: 1 } },
      {
        id: 'slow',
        when: { game: { atLeast: 1.5 } },
        fire: { every: 2, max: 2 },
      },
      { id: 'once', when: { game: { atLeast: 2 } } },
    ]);
    expect(t.step(0.5)).toEqual(['fast']);
    expect(t.step(1)).toEqual(['fast', 'slow']); // fast at 1.5 is due first
    expect(t.step(2)).toEqual(['fast', 'fast', 'slow', 'once']); // fast 2.5, 3.5; slow 3.5
  });
  it('reject a non-positive interval', () => {
    expect(() =>
      run([{ id: 'r', when: { game: { atLeast: 0 } }, fire: { every: 0 } }]),
    ).toThrow();
  });
});

describe('reset', () => {
  it('clears clocks, firing history and counters', () => {
    const t = run([
      { id: 'o', when: { game: { atLeast: 1 } } },
      { id: 'r', when: { game: { atLeast: 1 } }, fire: { every: 1, max: 2 } },
    ]);
    expect(t.step(5)).toEqual(['o', 'r']);
    t.reset();
    expect(t.clocks()).toEqual({ game: 0, room: 0 });
    expect(t.step(5)).toEqual(['o', 'r']);
  });
});
