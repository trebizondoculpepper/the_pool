import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { knobAnswer } from '../logic/use-cue';
import type { Turnable, UseAnswer } from '../logic/use-cue';
import { touchingAt } from './touch-point';
import { knobDirection } from './knob-turning';

/**
 * Things that say what a use on them would do (prompt 115, part two,
 * `doc/plans/115/push-pull-cue.md`), for the crosshair's cue. A component
 * marks the object a use lands on with a function that answers, when the
 * aim finds it, which gesture a use makes (turn, push, pull, or some other
 * way) and whether it will have a consequence now. The mark lives on the
 * object (`userData.usable`) and goes with it; the controls find it by
 * walking up from the first mesh the aim meets.
 */

/** Where the aim found a marked thing, and how. */
export interface UseQuery {
  /** The marked object (a knob's shaft, a button's cap). */
  object: Object3D;
  /** The mesh the ray actually met, for a touch surface's `touchPoint` walk. */
  hit: Object3D;
  /** The world point the aim met. */
  point: Vector3;
  camera: Camera;
  /** The aim's normalised screen x, -1 to 1. */
  x: number;
  /** A gamepad's use: no pointer side. */
  pad: boolean;
  /** The texture coordinates of the hit, for a touch surface's own questions. */
  uv?: { x: number; y: number } | null;
}

/**
 * What a use would do now, or null for nothing. Called by the probe at
 * most ten times a second: it must be cheap and change nothing.
 */
export type Usable = (at: UseQuery) => UseAnswer | null;

/**
 * What a use on the marked thing does (mission 161, the one click handler):
 * run on the click, on the same `UseQuery` the cue answered, so cue and
 * click cannot disagree. Kept apart from the side-effect-free `Usable`
 * answer, which is asked by the probe and never acted on.
 */
export type UseAction = (at: UseQuery) => void;

/** Mark `object` as usable, with the action a click runs; returns the unmarking. */
export function markUsable(
  object: Object3D,
  usable: Usable,
  action?: UseAction,
) {
  object.userData.usable = usable;
  if (action) object.userData.useAction = action;
  else delete object.userData.useAction;
  return () => {
    if (object.userData.usable === usable) delete object.userData.usable;
    if (object.userData.useAction === action) delete object.userData.useAction;
  };
}

/** The marked thing `object` is part of (itself or an ancestor), or null. */
export function usableOf(
  object: Object3D,
): { object: Object3D; usable: Usable } | null {
  for (let o: Object3D | null = object; o; o = o.parent) {
    const usable = o.userData.usable as Usable | undefined;
    if (usable) return { object: o, usable };
  }
  return null;
}

/**
 * The click's action on the marked thing `object` is part of, or null: the
 * same first visible hit the cue used (mission 161). The action runs on the
 * click; the answer stays the probe's.
 */
export function useActionOf(
  object: Object3D,
): { object: Object3D; action: UseAction } | null {
  for (let o: Object3D | null = object; o; o = o.parent) {
    const action = o.userData.useAction as UseAction | undefined;
    if (action) return { object: o, action };
  }
  return null;
}

/** A thing's one registration: its usable answer and its click's action together. */
export interface UseRegistration {
  /** The object the mark lives on (itself or an ancestor of the hit). */
  object: Object3D;
  /** What a use would do now (the cue's answer, asked purely). */
  usable: Usable;
  /** The action a click runs, when the registration carries one. */
  action?: UseAction;
}

/**
 * Resolve a hit to its one registration (mission 161, step 2): the nearest
 * object carrying `usable`, and — from that same object, never a separate
 * walk — its action. A registration with an answer but no action means the
 * click is not the object's (the room's `use` still runs during migration);
 * a decoration registers nothing at all. The cue answers `usable`; the
 * click runs `action` only when that answer is possible (the control's own
 * way of saying "now").
 */
export function useRegistrationOf(object: Object3D): UseRegistration | null {
  const found = usableOf(object);
  if (!found) return null;
  const action = found.object.userData.useAction as UseAction | undefined;
  return action ? { ...found, action } : found;
}

/** Whether neither `object` nor anything above it is hidden. */
export function visibleAll(object: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent)
    if (!o.visible) return false;
  return true;
}

const centre = new Vector3();

/** A knob's answer where the aim falls on it: the side it turns, and both ways. */
export function turnAt(at: UseQuery, knob: Turnable): UseAnswer {
  const x = at.object.getWorldPosition(centre).project(at.camera).x;
  return knobAnswer(knob, at.x, x);
}

/**
 * Register a component's use as the shared registration (mission 161, the
 * one click handler): `object` (where a use lands) answers `usable` for the
 * cue, and on a click runs `work` — the direction-taking use of a part or
 * machine — with the hit known (`UseQuery.hit`, `point`, `uv`), so a knob
 * turns by which half of it is clicked and a touch surface asks where it
 * was touched. One adapter for every part and machine, never per room:
 * this is what replaces the rooms' own `use`/`aimed` walks over
 * `parts.uses` and `machines.useOf`.
 */
export function registerPartUse(
  object: Object3D,
  usable: Usable,
  work: (direction?: number) => void,
) {
  return markUsable(object, usable, (at) => {
    touchingAt(
      {
        object: at.hit,
        uv: at.uv,
        point: { x: at.point.x, y: at.point.y, z: at.point.z },
      },
      () => work(knobDirection(object, at.point, at.camera)),
    );
  });
}
