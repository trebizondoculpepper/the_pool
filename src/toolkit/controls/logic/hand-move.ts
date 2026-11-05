/**
 * The hands' deliberate moves (mission 210; the owner, 2026-11-05): a pick-up
 * from where a thing rests to the hand, and a put-down from the hand to a
 * place on a top, each about half a second, eased in and out, straight
 * from one end to the other whatever is between. Pure.
 */

/** How long a pick-up or a put-down takes, seconds, at any distance. */
export const HAND_MOVE_SECONDS = 0.5;

/** Smoothstep: slow away, quick between, slow in; 0 at 0 and 1 at 1. */
export function easeInOut(t: number) {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** How far through a move `age` seconds into it is, eased, and whether it is over. */
export function handMove(age: number, seconds = HAND_MOVE_SECONDS) {
  const t = seconds > 0 ? age / seconds : 1;
  return { k: easeInOut(t), done: t >= 1 };
}

/** An axis-aligned rectangle on the floor plan, metres. */
export interface PlanRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Whether a footprint lies wholly on a top (mission 210: all four of its
 * bottom corners over the top, none overhanging). `slack` forgives a hair.
 */
export function footprintOn(footprint: PlanRect, top: PlanRect, slack = 1e-4) {
  return (
    footprint.minX >= top.minX - slack &&
    footprint.maxX <= top.maxX + slack &&
    footprint.minZ >= top.minZ - slack &&
    footprint.maxZ <= top.maxZ + slack
  );
}
