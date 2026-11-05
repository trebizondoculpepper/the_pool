import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { click, partAudio } from '../../core/audio/part-audio';
import { binRest, binTossPath, targetZone } from '../logic/bin-toss';
import type { BinShape, TargetZone, TossPath } from '../logic/bin-toss';
import type { PortableObject } from '../../../controls/input/object-handling';
import type { PlacementTarget } from '../../../controls/input/placement-target';

/** A bin things can be thrown into: its model, its inside and where it is. */
export interface TossBin {
  name: string;
  /** Its model, placed by `x` and `z` (metres) on the floor. */
  group: Object3D;
  shape: BinShape;
  /** Its size on the floor plan, metres, its length along x. */
  footprint: { x: number; z: number };
  x: number;
  z: number;
  /** The height of its foot above the floor, metres (0 if on the floor). */
  y?: number;
  /** Its target disc (mission 209); made from its inside if not given. */
  zone?: TargetZone;
  /** What it takes, if not everything (a skip for the skimmer's finds only). */
  takes?: (object: Object3D) => boolean;
  /** Whether what lands stays locked in; the tossing's own rule if unset. */
  keep?: boolean;
  /** Called as each object lands in this bin. */
  onLanded?: (object: Object3D) => void;
}

/**
 * A bin-like object's inside, set by its own builder (mission 205): the
 * shared bin tossing a room's controller makes (`room-traits.ts`) finds
 * every placed object of a `bin-like` kind and reads this from it.
 */
export const BIN_MARK = 'bin';
export interface BinMark {
  shape: BinShape;
  footprint: { x: number; z: number };
  /** Its target disc, above its foot (mission 209); made from `shape` if not given. */
  zone?: TargetZone;
  /** A placement's own rules (`binRules`): what it takes, whether it keeps it, what follows a landing. */
  takes?: (object: Object3D) => boolean;
  keep?: boolean;
  onLanded?: (object: Object3D) => void;
}
export function markBin<T extends Object3D>(group: T, mark: BinMark): T {
  group.userData[BIN_MARK] = mark;
  return group;
}

/**
 * A placed bin's own rules, as its placement's metadata (mission 205): the
 * room that placed it says what it takes (the skimmer's finds only), whether
 * what lands stays locked in, and what a landing sets off (a count, a
 * restock). The room's shared bin tossing reads them; no room makes one.
 */
export function binRules<T extends Object3D>(
  group: T,
  rules: Pick<BinMark, 'takes' | 'keep' | 'onLanded'>,
): T {
  const mark = group.userData[BIN_MARK] as BinMark | undefined;
  if (!mark) throw new Error(`${group.name || 'object'} is not a bin`);
  group.userData[BIN_MARK] = { ...mark, ...rules };
  return group;
}

const BIN_EMPTY = 'binEmpty';
/** Empty a placed bin, as a reset does: it counts from nothing again. */
export function emptyBin(group: Object3D) {
  (group.userData[BIN_EMPTY] as (() => void) | undefined)?.();
}

// Landing in a steel skip: a hollow clang.
const clang = click({
  band: 820,
  q: 7,
  decay: 0.45,
  level: 0.3,
  thump: [72, 0.16],
});

/**
 * Throwing things into bins, for any room (`logic/bin-toss.ts` is the
 * rule; mission 209): each bin added is a placement target, so a thing
 * held and aimed at the bin within use reach goes in by use or let go
 * alike, never one merely let go near it. It is lobbed underarm through
 * the bin's target disc under gravity, turning to lie flat, glances off
 * the inside, and lands with a clang on whatever is already there, where
 * it can be picked out again (unless the bin keeps it). Bins can be added
 * at any time, so a room may conjure one up.
 * Objects are in the scene's frame, `metre` units to the metre.
 */
export function createBinTossing({
  metre: m,
  random = Math.random,
  onLanded = () => {},
  keep = false,
}: {
  metre: number;
  random?: () => number;
  /** Whether what lands stays locked in (true), or may be picked out again. */
  keep?: boolean;
  /** Called as each object lands in its bin. */
  onLanded?: (object: Object3D, bin: TossBin) => void;
}) {
  const bins: (TossBin & { filled: number })[] = [];
  const tosses: {
    object: Object3D;
    portable: PortableObject;
    path: TossPath;
    fromQ: Quaternion;
    toQ: Quaternion;
    centre: Vector3;
    age: number;
    bin: TossBin;
  }[] = [];
  /** Where an object's middle is, in its own frame, scaled. */
  const middleOf = (object: Object3D) => {
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const centre = box.getCenter(new Vector3());
    return object.worldToLocal(centre).multiply(object.scale);
  };
  /** Send `object` into `bin` from where it is now. */
  const toss = (
    object: Object3D,
    portable: PortableObject,
    bin: TossBin & { filled: number },
  ) => {
    const centre = middleOf(object);
    const start = object.position
      .clone()
      .add(centre.clone().applyQuaternion(object.quaternion))
      .divideScalar(m);
    const rest = binRest(bin.filled++, bin.shape, random);
    const zone = targetZone(bin.shape, bin.zone);
    const foot = bin.y ?? 0;
    // Its inside about its middle, turned with the bin a quarter turn or not.
    const quarter = Math.abs(Math.sin(bin.group.rotation.y)) > 0.7;
    const margin = 0.02;
    const inside = {
      halfX: Math.max(
        0,
        (quarter ? bin.shape.halfZ : bin.shape.halfX) - margin,
      ),
      halfZ: Math.max(
        0,
        (quarter ? bin.shape.halfX : bin.shape.halfZ) - margin,
      ),
    };
    const path = binTossPath(
      { x: start.x, y: start.y, z: start.z },
      { x: bin.x, y: foot + zone.y, z: bin.z },
      foot + rest.y + 0.02,
      inside,
    );
    // Lying flat (its thinnest side up) with its length along the bin,
    // then tipped up at the end as the bin fills, and turned a little.
    const turned = object.quaternion.clone();
    object.quaternion.identity();
    object.updateMatrixWorld(true);
    const own = new Box3().setFromObject(object).getSize(new Vector3());
    object.quaternion.copy(turned);
    object.updateMatrixWorld(true);
    const axes = [
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ].sort((p, q) => own.dot(p) - own.dot(q));
    const thin = axes[0];
    const long = axes[2];
    const across = long.clone().cross(thin);
    const lay = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(long, thin, across).transpose(),
    );
    const toQ = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), rest.yaw)
      .multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rest.tilt),
      )
      .multiply(lay);
    tosses.push({
      object,
      portable,
      path,
      fromQ: object.quaternion.clone(),
      toQ,
      centre,
      age: 0,
      bin,
    });
  };
  const available = (bin: TossBin) => {
    if (!bin.group.parent) return false;
    for (let at: Object3D | null = bin.group; at; at = at.parent)
      if (!at.visible) return false;
    return true;
  };
  /** Whether a bin takes this thing now: it is in the scene, shown, and takes it. */
  const accepts = (object: Object3D, bin: TossBin) =>
    available(bin) && (bin.takes?.(object) ?? true);
  return {
    bins: bins as readonly (TossBin & { filled: number })[],
    /** Add a bin to throw things into; it must already be in the scene. */
    add(bin: TossBin) {
      const entry = Object.assign(bin, { filled: 0 });
      bins.push(entry);
      // Aimed at within use reach, by use or let go (mission 209): the
      // only way in; nothing near a bin is drawn into it.
      const target: PlacementTarget = {
        cue: 'put-in',
        letGo: true,
        inRange: () => available(entry),
        accepts: (object) => accepts(object, entry),
        place: (object, portable) => {
          portable.component.drop();
          toss(object, portable, entry);
        },
      };
      entry.group.userData.placementTarget = target;
      entry.group.userData[BIN_EMPTY] = () => {
        entry.filled = 0;
        for (let i = tosses.length - 1; i >= 0; i--)
          if (tosses[i].bin === entry) tosses.splice(i, 1);
      };
      return entry;
    },
    /** Take a bin away; anything on its way into it lands nowhere. */
    remove(bin: TossBin) {
      const at = bins.findIndex((b) => b === bin);
      if (at >= 0) {
        bins.splice(at, 1);
        delete bin.group.userData.placementTarget;
        delete bin.group.userData[BIN_EMPTY];
      }
      for (let i = tosses.length - 1; i >= 0; i--)
        if (tosses[i].bin === bin) tosses.splice(i, 1);
    },
    /** Whether anything is on its way into `bin`. */
    incoming: (bin: TossBin) => tosses.some((t) => t.bin === bin),
    /** Throw `object` straight into the named bin (for development). */
    toss(object: Object3D, portable: PortableObject, name: string) {
      const bin = bins.find((b) => b.name === name) ?? bins[0];
      if (bin) toss(object, portable, bin);
    },
    /** Fly whatever is on its way into a bin. */
    update(delta: number) {
      for (let i = tosses.length - 1; i >= 0; i--) {
        const t = tosses[i];
        t.age += delta;
        const k = Math.min(1, t.age / t.path.seconds);
        const at = t.path.at(t.age);
        t.object.quaternion.copy(t.fromQ).slerp(t.toQ, k);
        t.object.position
          .set(at.x * m, at.y * m, at.z * m)
          .sub(t.centre.clone().applyQuaternion(t.object.quaternion));
        if (k < 1) continue;
        // Landed: on the bin's bottom, or on what is already in it.
        tosses.splice(i, 1);
        t.portable.component.impact(1.4, 0);
        t.portable.component.settle();
        // It stays in, but can be picked out again (the owner, 2026-11-05),
        // unless the room's bins keep what they are given.
        if (t.bin.keep ?? keep) t.portable.component.setLocked(true);
        partAudio.play(clang, t.object);
        t.bin.onLanded?.(t.object);
        onLanded(t.object, t.bin);
      }
    },
  };
}
