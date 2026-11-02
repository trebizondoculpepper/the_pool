/**
 * Where a look link (mission 125, `doc/plans/125-look-links.md`) puts the
 * camera: pure. In: the target's box and front, the room's rectangle and
 * floor, the field of view and the controls' limits, all in metres and
 * radians. Out: the ordered candidate cameras, each aimed at the box's
 * centre and zoomed so the box fills `fit` of the frame in its tighter
 * dimension and no more in the other; and, given which candidates the
 * views found walkable and how many of the nine rays each saw, the choice.
 *
 * Yaw is clockwise from north (0 looks along −z, π/2 along +x); pitch is
 * up positive; zoom divides the field of view (`first-person.ts`).
 */
import type { LookMode } from './look-ref';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LookBox {
  min: Vec3;
  max: Vec3;
}

export interface LookLimits {
  /** The eye's range above the floor, metres. */
  eyeMin: number;
  eyeMax: number;
  minZoom: number;
  maxZoom: number;
  pitchLimit: number;
  /** The walker's radius: candidates keep this far inside the room. */
  radius: number;
  /** The nearest a camera stands to what it looks at, metres. */
  nearest: number;
}

/** The game's own (`first-person.ts`): eye 1.0 to 2.2 m, as the brief has it. */
export const LOOK_LIMITS: LookLimits = {
  eyeMin: 1.0,
  eyeMax: 2.2,
  minZoom: 0.65,
  maxZoom: 4,
  pitchLimit: 1.45,
  radius: 0.175,
  nearest: 0.35,
};

export interface LookInput {
  box: LookBox;
  /** Its front, a unit vector in the world (its own +z). */
  front: Vec3;
  mode: LookMode;
  /** The share of the frame it fills, 0 to 1. */
  fit: number;
  /** Vertical field of view at zoom 1, degrees. */
  fov: number;
  /** Width over height. */
  aspect: number;
  /** The room's floor plan, metres, and its floor's height. */
  room: { minX: number; maxX: number; minZ: number; maxZ: number };
  floorY: number;
  limits?: LookLimits;
}

export interface LookCandidate {
  x: number;
  /** The eye's height, metres (world). */
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  zoom: number;
  /** Which rule made it: `front`, `front · 0.5 m left`, `left`, … */
  label: string;
  /** How far the camera is from the box's centre, metres. */
  distance: number;
}

/** The swing of `left` and `right`, radians. */
export const SWING = (35 * Math.PI) / 180;
const DEG = Math.PI / 180;

const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

export const centreOf = (box: LookBox): Vec3 => ({
  x: (box.min.x + box.max.x) / 2,
  y: (box.min.y + box.max.y) / 2,
  z: (box.min.z + box.max.z) / 2,
});

export const cornersOf = (box: LookBox): Vec3[] =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
    x: i & 1 ? box.max.x : box.min.x,
    y: i & 2 ? box.max.y : box.min.y,
    z: i & 4 ? box.max.z : box.min.z,
  }));

/**
 * The tangent of the half-angle, vertically, that the box needs from
 * `eye` (looking at its centre) to fill `fit` of the frame in its tighter
 * dimension: the larger of its vertical extent's and its horizontal
 * extent's (over the aspect).
 */
export function neededTan(
  box: LookBox,
  eye: Vec3,
  fit: number,
  aspect: number,
) {
  const centre = centreOf(box);
  const forward = unit(sub(centre, eye));
  const side =
    Math.abs(forward.y) > 0.999
      ? { x: 1, y: 0, z: 0 }
      : unit(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(side, forward);
  let h = 0;
  let v = 0;
  for (const corner of cornersOf(box)) {
    const r = sub(corner, eye);
    const depth = Math.max(1e-3, dot(r, forward));
    h = Math.max(h, Math.abs(dot(r, side)) / depth);
    v = Math.max(v, Math.abs(dot(r, up)) / depth);
  }
  return Math.max(v, h / aspect) / fit;
}

/** The zoom that makes the box fill `fit` from `eye`, within the limits. */
export function fitZoom(
  box: LookBox,
  eye: Vec3,
  fit: number,
  fov: number,
  aspect: number,
  limits: LookLimits = LOOK_LIMITS,
) {
  const tan = neededTan(box, eye, fit, aspect);
  const zoom = fov / ((2 * Math.atan(tan)) / DEG);
  return Math.max(limits.minZoom, Math.min(limits.maxZoom, zoom));
}

/** Yaw and pitch from `eye` to `at`. */
export function aim(eye: Vec3, at: Vec3, pitchLimit = LOOK_LIMITS.pitchLimit) {
  const d = sub(at, eye);
  return {
    yaw: Math.atan2(d.x, -d.z),
    pitch: Math.max(
      -pitchLimit,
      Math.min(pitchLimit, Math.atan2(d.y, Math.hypot(d.x, d.z))),
    ),
  };
}

/**
 * How far out along `direction` (a unit vector from the centre) the eye
 * must be for the box to fill `fit` at zoom 1: found by halving, since
 * the corners' depths change with it.
 */
export function fitDistance(
  box: LookBox,
  direction: Vec3,
  fit: number,
  fov: number,
  aspect: number,
) {
  const centre = centreOf(box);
  const target = Math.tan((fov * DEG) / 2);
  const at = (d: number) => ({
    x: centre.x + direction.x * d,
    y: centre.y + direction.y * d,
    z: centre.z + direction.z * d,
  });
  const half = Math.hypot(
    box.max.x - box.min.x,
    box.max.y - box.min.y,
    box.max.z - box.min.z,
  );
  let lo = 1e-3;
  let hi = Math.max(1, half * 50);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (neededTan(box, at(mid), fit, aspect) > target) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * `v` turned about the vertical by `angle`: a front turned by a positive
 * angle puts the camera on the viewer's left.
 */
const turn = (v: Vec3, angle: number): Vec3 => ({
  x: v.x * Math.cos(angle) - v.z * Math.sin(angle),
  y: v.y,
  z: v.x * Math.sin(angle) + v.z * Math.cos(angle),
});

/** The front flattened to the floor, unless it faces up (a desk's screen). */
export function flatFront(front: Vec3): Vec3 {
  const flat = { x: front.x, y: 0, z: front.z };
  if (Math.hypot(flat.x, flat.z) < 0.35) return unit(front);
  return unit(flat);
}

/**
 * Make a candidate at `eye`: kept inside the room (pulled in along the
 * line to the centre), its eye within the range, aimed at the centre and
 * zoomed to fit. Null if no place inside the room is on that line.
 */
function candidate(
  input: LookInput,
  eye: Vec3,
  label: string,
  limits: LookLimits,
): LookCandidate | null {
  const centre = centreOf(input.box);
  const r = input.room;
  const inset = limits.radius;
  const minX = r.minX + inset,
    maxX = r.maxX - inset,
    minZ = r.minZ + inset,
    maxZ = r.maxZ - inset;
  if (minX > maxX || minZ > maxZ) return null;
  let { x, z } = eye;
  // Pulled in towards the centre's line until inside the room.
  if (x < minX || x > maxX || z < minZ || z > maxZ) {
    let t = 1;
    const dx = x - centre.x,
      dz = z - centre.z;
    if (x < minX && dx < 0) t = Math.min(t, (minX - centre.x) / dx);
    if (x > maxX && dx > 0) t = Math.min(t, (maxX - centre.x) / dx);
    if (z < minZ && dz < 0) t = Math.min(t, (minZ - centre.z) / dz);
    if (z > maxZ && dz > 0) t = Math.min(t, (maxZ - centre.z) / dz);
    x = centre.x + dx * Math.max(0, t);
    z = centre.z + dz * Math.max(0, t);
    x = Math.max(minX, Math.min(maxX, x));
    z = Math.max(minZ, Math.min(maxZ, z));
  }
  const y = Math.max(
    input.floorY + limits.eyeMin,
    Math.min(input.floorY + limits.eyeMax, eye.y),
  );
  let at = { x, y, z };
  // Never closer than the nearest a camera stands: back out along the line.
  const flat = Math.hypot(x - centre.x, z - centre.z);
  if (Math.hypot(flat, y - centre.y) < limits.nearest && flat > 1e-6) {
    const k = limits.nearest / flat;
    at = {
      x: centre.x + (x - centre.x) * k,
      y,
      z: centre.z + (z - centre.z) * k,
    };
  }
  const { yaw, pitch } = aim(at, centre, limits.pitchLimit);
  return {
    ...at,
    yaw,
    pitch,
    zoom: fitZoom(input.box, at, input.fit, input.fov, input.aspect, limits),
    label,
    distance: Math.hypot(at.x - centre.x, at.y - centre.y, at.z - centre.z),
  };
}

/**
 * The candidate cameras for `input.mode`, nearest the asked view first:
 * on its line at the fit distance; then up to 1 m left and right; lower
 * and higher within the eye range; the `left` and `right` swings; nearer,
 * with a wider view.
 */
export function lookCandidates(input: LookInput): LookCandidate[] {
  const limits = input.limits ?? LOOK_LIMITS;
  const centre = centreOf(input.box);
  const front = flatFront(input.front);
  const out: LookCandidate[] = [];
  const push = (eye: Vec3, label: string) => {
    const made = candidate(input, eye, label, limits);
    if (
      made &&
      !out.some(
        (c) =>
          Math.abs(c.x - made.x) < 1e-3 &&
          Math.abs(c.y - made.y) < 1e-3 &&
          Math.abs(c.z - made.z) < 1e-3,
      )
    )
      out.push(made);
  };
  const along = (direction: Vec3, distance: number): Vec3 => ({
    x: centre.x + direction.x * distance,
    y: centre.y + direction.y * distance,
    z: centre.z + direction.z * distance,
  });
  const modeDirection = (mode: LookMode): Vec3 =>
    mode === 'left'
      ? turn(front, SWING)
      : mode === 'right'
        ? turn(front, -SWING)
        : mode === 'above'
          ? unit({
              x: front.x * Math.SQRT1_2,
              y: Math.SQRT1_2,
              z: front.z * Math.SQRT1_2,
            })
          : front;
  if (input.mode === 'room') {
    const r = input.room;
    push(
      {
        x: (r.minX + r.maxX) / 2,
        y: input.floorY + 1.7,
        z: (r.minZ + r.maxZ) / 2,
      },
      'room',
    );
  }
  const asked = input.mode === 'room' ? 'front' : input.mode;
  const direction = modeDirection(asked);
  const distance = fitDistance(
    input.box,
    direction,
    input.fit,
    input.fov,
    input.aspect,
  );
  let main = along(direction, distance);
  // From above, the eye's range keeps the 45°: out further, or in nearer,
  // at the height it may take (the zoom then fits it).
  if (asked === 'above') {
    const y = Math.max(
      input.floorY + limits.eyeMin,
      Math.min(input.floorY + limits.eyeMax, main.y),
    );
    const out = Math.max(0, y - centre.y);
    main = { x: centre.x + front.x * out, y, z: centre.z + front.z * out };
  }
  // A level view looks from eye height; a high or low object is reached
  // by the pitch, within the eye's range.
  push(main, asked);
  const side = unit(cross({ x: 0, y: 1, z: 0 }, front));
  for (const metres of [0.5, 1])
    for (const sign of [-1, 1])
      push(
        {
          x: main.x + side.x * metres * sign,
          y: main.y,
          z: main.z + side.z * metres * sign,
        },
        `${asked} · ${metres} m ${sign < 0 ? 'left' : 'right'}`,
      );
  for (const height of [1.2, 2.0])
    push(
      { x: main.x, y: input.floorY + height, z: main.z },
      `${asked} · eye ${height} m`,
    );
  for (const swing of ['left', 'right'] as const)
    if (swing !== asked) {
      const d = modeDirection(swing);
      push(
        along(d, fitDistance(input.box, d, input.fit, input.fov, input.aspect)),
        swing,
      );
    }
  for (const share of [0.7, 0.5])
    push(along(direction, distance * share), `${asked} · nearer`);
  return out;
}

export interface CandidateResult {
  walkable: boolean;
  /** Of the nine rays, how many reached the box. */
  seen: number;
}

export interface LookChoice {
  /** The chosen candidate's index, or the first's when none walks. */
  index: number;
  /** No candidate stands where a walker could: placed in the free camera. */
  noclip: boolean;
  warnings: string[];
}

/** Rays of nine that must see it for a candidate to be taken at once. */
export const SEEN_ENOUGH = 8;

/**
 * Choose among the candidates (in their order), given what the views
 * found: the first walkable one that sees at least 8 of 9; otherwise the
 * walkable one that sees most, the nearest the asked mode (the earliest)
 * on a tie, with a warning; with none walkable, the first in the free
 * camera, saying so.
 */
export function chooseLook(results: readonly CandidateResult[]): LookChoice {
  const walkable = results
    .map((r, index) => ({ ...r, index }))
    .filter((r) => r.walkable);
  if (!walkable.length)
    return {
      index: 0,
      noclip: true,
      warnings: [
        'no candidate stands where a walker could: placed in the free camera',
      ],
    };
  const good = walkable.find((r) => r.seen >= SEEN_ENOUGH);
  if (good) return { index: good.index, noclip: false, warnings: [] };
  let best = walkable[0];
  for (const r of walkable) if (r.seen > best.seen) best = r;
  return {
    index: best.index,
    noclip: false,
    warnings: [`partly hidden: ${best.seen}/9 rays reach it`],
  };
}
