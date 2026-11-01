import type { GameEvent } from './game-event';

/**
 * The lines a world left alone still logs: the wet hall's make-up booster
 * set cycling on its floats' demand, and the control room's MAKE-UP
 * RUNNING window with it. A steady world logs nothing else.
 */
const MAKE_UP = (e: GameEvent) =>
  e.subject === 'WH-P1' || /MAKE-UP RUNNING/.test(e.text);

/** `log` without the make-up's cycle. */
export const steady = (log: readonly GameEvent[]) =>
  log.filter((e) => !MAKE_UP(e));
