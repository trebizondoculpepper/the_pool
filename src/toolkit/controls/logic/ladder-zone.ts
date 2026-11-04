import type { Footprint } from './walk-collision';

/** A ladder joins two walkable floors. All positions are in scene units. */
export interface LadderZone extends Footprint {
  bottom: number;
  top: number;
  /** Where the player stands after leaving each end. */
  bottomExit: { x: number; z: number };
  topExit: { x: number; z: number };
  /** The position held while moving on the rungs. */
  rung: { x: number; z: number };
  /** Restrict entry at one end without trapping someone at the other. */
  canUseBottom?: boolean;
  canUseTop?: boolean;
}

/** Climbing speed, metres a second. */
export const CLIMB_METRES_PER_SECOND = 0.9;
/** How close the player must stand to an end before Use mounts it. */
export const LADDER_USE_REACH_METRES = 0.9;

export type LadderEnd = 'bottom' | 'top';

/** Use only mounts an end at the player's current floor. */
export function ladderToUse(
  zones: readonly LadderZone[],
  x: number,
  y: number,
  z: number,
  metre: number,
): { zone: LadderZone; end: LadderEnd } | null {
  for (const zone of zones) {
    for (const end of ['bottom', 'top'] as const) {
      if (end === 'bottom' && zone.canUseBottom === false) continue;
      if (end === 'top' && zone.canUseTop === false) continue;
      const floor = zone[end];
      const exit = end === 'bottom' ? zone.bottomExit : zone.topExit;
      if (
        Math.abs(y - floor) <= 0.3 * metre &&
        Math.hypot(x - exit.x, z - exit.z) <= LADDER_USE_REACH_METRES * metre
      )
        return { zone, end };
    }
  }
  return null;
}

/**
 * W climbs and S descends, regardless of where the player looks.
 */
export function climb(
  zone: LadderZone,
  y: number,
  ahead: number,
  dt: number,
  metre: number,
): number {
  const next =
    y + Math.max(-1, Math.min(1, ahead)) * CLIMB_METRES_PER_SECOND * metre * dt;
  return Math.min(zone.top, Math.max(zone.bottom, next));
}

/**
 * How long the walker takes to step onto a ladder once it is used (the
 * owner, 2026-11-04): six frames at 30 fps from the foot, ten from the top,
 * where it also turns to face the ladder to climb down.
 */
/** Rung to rung, metres (`createCagedLadder`'s 300 mm). */
export const LADDER_RUNG_PITCH = 0.3;

export const LADDER_MOUNT_SECONDS = { bottom: 6 / 30, top: 10 / 30 } as const;

/** Ease in and out (cubic): slow away, quick through the middle, slow to rest. */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** A pose between where the walker stood and its place on the ladder. */
export interface MountPose {
  x: number;
  z: number;
  y: number;
  /** Facing, radians (view direction (sin yaw, −cos yaw)). */
  yaw: number;
}

/** The facing that looks from the climbing line at the ladder (towards its top exit's side, the wall). */
export function yawFacingLadder(zone: LadderZone): number {
  return Math.atan2(
    zone.topExit.x - zone.rung.x,
    -(zone.topExit.z - zone.rung.z),
  );
}

/**
 * Where the walker is, `progress` (0–1) of the way through stepping onto a
 * ladder, from `from` to `to` on an ease-in-out curve, turning the shorter
 * way round.
 */
export function ladderMountPose(
  from: MountPose,
  to: MountPose,
  progress: number,
): MountPose {
  const k = easeInOutCubic(Math.min(1, Math.max(0, progress)));
  let turn = (to.yaw - from.yaw) % (2 * Math.PI);
  if (turn > Math.PI) turn -= 2 * Math.PI;
  if (turn < -Math.PI) turn += 2 * Math.PI;
  return {
    x: from.x + (to.x - from.x) * k,
    z: from.z + (to.z - from.z) * k,
    y: from.y + (to.y - from.y) * k,
    yaw: from.yaw + turn * k,
  };
}
