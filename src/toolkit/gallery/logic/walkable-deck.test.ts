import { describe, expect, it } from 'vite-plus/test';
import { deckAt } from './walkable-deck';
import type { WalkableDeck } from './walkable-deck';

const ROOF: WalkableDeck = {
  minX: -3,
  maxX: 3,
  minZ: -1.5,
  maxZ: 1.5,
  top: 2.25,
};

describe('walkable decks (mission 151)', () => {
  it('stands on a roof over its footprint when already up at it', () => {
    expect(deckAt([ROOF], 0, 0, 2.25)).toBe(2.25);
    expect(deckAt([ROOF], -2.9, 1.4, 2.3)).toBe(2.25);
  });

  it('does not lift a walker off the floor onto the roof from below', () => {
    expect(deckAt([ROOF], 0, 0, 0)).toBeNull();
    expect(deckAt([ROOF], 0, 0, 1.7)).toBeNull();
  });

  it('falls through outside the footprint', () => {
    expect(deckAt([ROOF], 3.2, 0, 2.25)).toBeNull();
    expect(deckAt([ROOF], 0, 1.7, 2.25)).toBeNull();
  });

  it('chooses a roof already reached by a step from the landing', () => {
    expect(deckAt([ROOF], -3.1, 0, 2.3)).toBeNull();
    expect(deckAt([ROOF], -2.8, 0, 2.05)).toBe(2.25);
  });
});
