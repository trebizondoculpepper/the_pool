import { describe, expect, it } from 'vite-plus/test';
import { createPutBack } from './put-back';
import type { Pose } from './put-back';

const at = (x: number): Pose => ({
  position: [x, 1.66, -0.3],
  quaternion: [0, 0, 0, 1],
});

describe('picking a thing up to look at it, and putting it back', () => {
  it('picks up a thing set out, and puts it back exactly where it was', () => {
    const things = createPutBack<string>();
    things.home('pool-sim', at(0.3));
    expect(things.has('pool-sim')).toBe(true);
    expect(things.canPickUp('pool-sim')).toBe(true);
    expect(things.pickUp('pool-sim')).toBe(true);
    expect(things.held()).toBe('pool-sim');
    expect(things.putBack('pool-sim')).toEqual(at(0.3));
    expect(things.held()).toBeNull();
    // Home again, it may be picked up again.
    expect(things.pickUp('pool-sim')).toBe(true);
  });

  it('holds one at a time', () => {
    const things = createPutBack<string>();
    things.home('a', at(0));
    things.home('b', at(0.1));
    expect(things.pickUp('a')).toBe(true);
    expect(things.canPickUp('b')).toBe(false);
    expect(things.pickUp('b')).toBe(false);
    expect(things.putBack('b')).toBeNull();
    expect(things.held()).toBe('a');
    things.putBack('a');
    expect(things.pickUp('b')).toBe(true);
  });

  it('leaves alone what something rests on, so nothing is left floating', () => {
    const things = createPutBack<string>();
    things.home('coshh', at(0.6));
    things.home('beige', at(0.6), 'coshh');
    expect(things.canPickUp('coshh')).toBe(false);
    expect(things.pickUp('coshh')).toBe(false);
    // The one on top comes off freely, and while it is away its support
    // still stays put, for it is to go back on top of it.
    expect(things.pickUp('beige')).toBe(true);
    expect(things.canPickUp('coshh')).toBe(false);
    things.putBack('beige');
    expect(things.canPickUp('coshh')).toBe(false);
  });

  it('bins the one held, on top of what is in the bin, and takes out only the top one', () => {
    const things = createPutBack<string>();
    things.home('a', at(0));
    things.home('b', at(0.1));
    expect(things.bin('a')).toBeNull();
    things.pickUp('a');
    expect(things.bin('a')).toBe(0);
    expect(things.where('a')).toBe('binned');
    expect(things.held()).toBeNull();
    things.pickUp('b');
    expect(things.bin('b')).toBe(1);
    expect(things.binned()).toEqual(['a', 'b']);
    expect(things.canPickUp('a')).toBe(false);
    expect(things.pickUp('b')).toBe(true);
    expect(things.binned()).toEqual(['a']);
    expect(things.putBack('b')).toEqual(at(0.1));
    expect(things.where('b')).toBe('home');
    expect(things.pickUp('a')).toBe(true);
  });

  it('frees a support once what rests on it is binned', () => {
    const things = createPutBack<string>();
    things.home('coshh', at(0.6));
    things.home('beige', at(0.6), 'coshh');
    things.pickUp('beige');
    things.bin('beige');
    // Nothing rests on it now.
    expect(things.pickUp('coshh')).toBe(true);
    things.bin('coshh');
    expect(things.binned()).toEqual(['beige', 'coshh']);
    things.pickUp('coshh');
    things.putBack('coshh');
    expect(things.where('coshh')).toBe('home');
    // With its support home again, it goes back on top of it.
    expect(things.pickUp('beige')).toBe(true);
    expect(things.putBack('beige')).toEqual(at(0.6));
  });

  it('keeps a binned thing under its binned support until the support is home', () => {
    const things = createPutBack<string>();
    things.home('book', at(0.15));
    things.home('lean', at(0.2), 'book');
    things.pickUp('lean');
    things.bin('lean');
    things.pickUp('book');
    things.bin('book');
    expect(things.binned()).toEqual(['lean', 'book']);
    expect(things.canPickUp('lean')).toBe(false);
    things.pickUp('book');
    things.putBack('book');
    expect(things.pickUp('lean')).toBe(true);
    expect(things.putBack('lean')).toEqual(at(0.2));
  });

  it('says whether the held thing would go back, as putBack does, changing nothing', () => {
    const things = createPutBack<string>();
    things.home('book', at(0.15));
    things.home('lean', at(0.2), 'book');
    // Resting on something that is not home (never set out here).
    things.home('stray', at(0.4), 'shelf');
    expect(things.canPutBack('lean')).toBe(false);
    things.pickUp('lean');
    for (let i = 0; i < 10; i++) expect(things.canPutBack('lean')).toBe(true);
    expect(things.held()).toBe('lean');
    expect(things.canPutBack('book')).toBe(false);
    expect(things.putBack('lean')).toEqual(at(0.2));
    things.pickUp('stray');
    expect(things.canPutBack('stray')).toBe(false);
    expect(things.held()).toBe('stray');
    expect(things.putBack('stray')).toBeNull();
    expect(things.held()).toBe('stray');
  });

  it('moves a shelf box to the desk and returns it to its own neat shelf slot', () => {
    const things = createPutBack<string>();
    things.home('panes', at(0.1));
    expect(things.canShelf('panes')).toBe(false);
    expect(things.desk('panes')).toBeNull();
    expect(things.pickUp('panes')).toBe(true);
    expect(things.desk('panes')).toBe(0);
    expect(things.where('panes')).toBe('desk');
    expect(things.onDesk()).toEqual(['panes']);
    expect(things.pickUp('panes')).toBe(true);
    expect(things.canShelf('panes')).toBe(true);
    expect(things.shelf('panes')).toEqual(at(0.1));
    expect(things.where('panes')).toBe('shelf');
    expect(things.onDesk()).toEqual([]);
  });

  it('moves an original desk box or a carton box into a registered shelf slot', () => {
    const things = createPutBack<string>();
    things.home('ledger', at(0.6), undefined, 'desk');
    expect(things.pickUp('ledger')).toBe(true);
    expect(things.canShelf('ledger')).toBe(false);
    expect(things.shelf('ledger')).toBeNull();
    expect(things.held()).toBe('ledger');
    things.shelfPose('ledger', at(-0.2));
    expect(things.shelf('ledger')).toEqual(at(-0.2));
    expect(things.where('ledger')).toBe('shelf');
    expect(things.pickUp('ledger')).toBe(true);
    expect(things.bin('ledger')).toBe(0);
    expect(things.pickUp('ledger')).toBe(true);
    expect(things.shelf('ledger')).toEqual(at(-0.2));
    expect(things.binned()).toEqual([]);
  });

  it('keeps a leaning shelf box supported after it is returned to the shelf', () => {
    const things = createPutBack<string>();
    things.home('book', at(0.1));
    things.home('leaning', at(0.2), 'book');
    expect(things.pickUp('book')).toBe(false);
    expect(things.pickUp('leaning')).toBe(true);
    expect(things.desk('leaning')).toBe(0);
    expect(things.pickUp('book')).toBe(true);
    expect(things.bin('book')).toBe(0);
    expect(things.pickUp('leaning')).toBe(true);
    expect(things.canShelf('leaning')).toBe(false);
    expect(things.shelf('leaning')).toBeNull();
    expect(things.desk('leaning')).toBe(0);
    expect(things.pickUp('book')).toBe(true);
    expect(things.shelf('book')).toEqual(at(0.1));
    expect(things.pickUp('leaning')).toBe(true);
    expect(things.shelf('leaning')).toEqual(at(0.2));
    expect(things.pickUp('book')).toBe(false);
  });

  it('takes only the top of the desk pile and does not move a supported original pile bottom', () => {
    const things = createPutBack<string>();
    things.home('bottom', at(0), undefined, 'desk');
    things.home('top', at(0), 'bottom', 'desk');
    expect(things.pickUp('bottom')).toBe(false);
    expect(things.pickUp('top')).toBe(true);
    expect(things.desk('top')).toBe(0);
    expect(things.pickUp('bottom')).toBe(true);
    expect(things.desk('bottom')).toBe(1);
    expect(things.onDesk()).toEqual(['top', 'bottom']);
    expect(things.canPickUp('top')).toBe(false);
    expect(things.pickUp('bottom')).toBe(true);
    expect(things.onDesk()).toEqual(['top']);
    expect(things.putBack('bottom')).toEqual(at(0));
    expect(things.pickUp('top')).toBe(true);
  });

  it('knows nothing of what it was never given', () => {
    const things = createPutBack<string>();
    expect(things.has('stapler')).toBe(false);
    expect(things.pickUp('stapler')).toBe(false);
    expect(things.putBack('stapler')).toBeNull();
  });
});
