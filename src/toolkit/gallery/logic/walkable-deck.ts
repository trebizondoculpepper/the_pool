/**
 * A walkable surface raised above a room's floor (mission 151, the owner,
 * 2026-11-03): the roof of a sectional balance tank with a caged ladder is
 * a deck — a footprint with a height — that the room's `floorAt` consults,
 * and its guardrails are solid footprints while the walker stands up there.
 * Pure; tested beside this file.
 */
export interface WalkableDeck {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Its top's height, the surface the walker stands on. */
  top: number;
}

/** Within `decks` at (x, z): the deck's height if the walker is already up at it (at or within half a metre below its top, so a step down from the landing onto the roof still stands). */
export function deckAt(
  decks: readonly WalkableDeck[],
  x: number,
  z: number,
  previous: number,
): number | null {
  for (const deck of decks) {
    if (
      x >= deck.minX &&
      x <= deck.maxX &&
      z >= deck.minZ &&
      z <= deck.maxZ &&
      previous >= deck.top - 0.5
    )
      return deck.top;
  }
  return null;
}
