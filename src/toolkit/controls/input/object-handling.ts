import { footprintOn, handMove } from '../logic/hand-move';
import { launch, stepThrow } from '../logic/throw';
import type { ThrowState } from '../logic/throw';
import type { Footprint } from '../logic/walk-collision';
import { landingGround } from '../logic/support-landing';
import type { Release } from '../logic/support-landing';
import {
  Box3,
  Euler,
  Matrix4,
  Mesh,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { assertDropProfile } from '../logic/drop-profile';
import type { Material, Object3D, PerspectiveCamera } from 'three';
import type { createPortableBoard } from '../logic/portable-board';
import { createBoardFall } from '../logic/portable-board';
import type { CarryAnswer } from '../logic/use-cue';
import { plinthOccupied } from './placement-target';
import type { PlacementTarget } from './placement-target';

export interface PortableObject {
  component: ReturnType<typeof createPortableBoard>;
  /** Disconnect the electrical component and stop its installed animation. */
  detach(): void;
  flat: 'face' | 'side' | 'upright';
}

/** Ignore the carried model when aiming past it at a separate control. */
export function isHeldPortableHit(object: Object3D): boolean {
  for (let at: Object3D | null = object; at; at = at.parent) {
    const portable = at.userData.portable as PortableObject | undefined;
    if (portable?.component.phase.value === 'held') return true;
  }
  return false;
}
export interface SupportSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
}

/**
 * What a room's `targetFeedback` says its `heldAction` will do at a point:
 * 'accept' (it fits) and 'reject' (refused) as before, or a carrying answer
 * naming the kind of place (mission 116).
 */
export type TargetFeedback = 'accept' | 'reject' | CarryAnswer | null;

/** A feedback answer as a carrying one. */
export const feedbackAnswer = (
  feedback: TargetFeedback,
  gesture: CarryAnswer['gesture'] = 'fit',
): CarryAnswer | null =>
  feedback === 'accept'
    ? { gesture, possible: true }
    : feedback === 'reject'
      ? { gesture, possible: false, refused: true }
      : feedback;

/**
 * What a use at a point would do with the hands (`resolve`): a carrying
 * answer, 'use' (the click is not the hands': a control is worked, or the
 * room's own use runs), or null (carrying, a drop). `run` does it, and
 * says whether the hands took the click.
 */
export interface HandsResolution {
  answer: CarryAnswer | 'use' | null;
  run(): boolean;
}

export interface DropPlacement {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
}

/** How far the wheel may bring a thing being inspected nearer, or take it further, than its fitted distance. */
const INSPECT_SCALE = { min: 0.3, max: 2 } as const;
/** A held thing's turn, in the eye's frame, that shows the eye its front (+z) with its top (+y) up. */
const UPRIGHT_TO_EYE = new Quaternion();

/**
 * Where a held thing's depth is squeezed to, at the very front of the
 * depth range (mission 117): drawn over the world, as a first-person game
 * draws the hands, so it never clips through a wall or shelf it is carried
 * against, while keeping its own faces in order.
 */
const HELD_DEPTH = { scale: 0.02, front: 0.98 } as const;

/**
 * A copy of `material` that draws over the world: its vertices' depth
 * squeezed into the front of the range, after whatever its own shader
 * patch does.
 */
function overWorld(material: Material): Material {
  const copy = material.clone();
  const own = material.onBeforeCompile.bind(material);
  copy.onBeforeCompile = (shader, renderer) => {
    own(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace(
      /}\s*$/,
      `  gl_Position.z = gl_Position.z * ${HELD_DEPTH.scale.toFixed(3)} - gl_Position.w * ${HELD_DEPTH.front.toFixed(3)};\n}`,
    );
  };
  const key = material.customProgramCacheKey.bind(material);
  copy.customProgramCacheKey = () => `${key()}|held-over-world`;
  return copy;
}

/** Shared first-person use behaviour, with no input bindings of its own. */
export function createObjectHandling(
  root: Object3D,
  camera: PerspectiveCamera,
  metre: number,
  floorY: number,
  supports: () => readonly SupportSurface[] = () => [],
  /**
   * A room's chance to take a released object itself (a toss into a bin):
   * return true and the object is the room's to move; it is not dropped.
   */
  divert?: (object: Object3D, portable: PortableObject) => boolean,
  /** Room geometry may move a release clear of an inaccessible enclosure. */
  redirectDrop?: (placement: DropPlacement) => DropPlacement,
  /** A held part cannot pass through these coarse world-space solid volumes. */
  carrySolids: () => readonly Box3[] = () => [],
  /** Give a room first chance to seat or magnetically bin a held part. */
  heldAction?: (
    object: Object3D,
    portable: PortableObject,
    x: number,
    y: number,
  ) => boolean | 'refuse',
  /**
   * A room may interlock pickup of installed parts. A pure question, asked
   * by the crosshair's cue a few times a second as well as by a click: it
   * must change nothing (what a pick-up sets off belongs in `onPickUp`).
   */
  allowPickup?: (object: Object3D, portable: PortableObject) => boolean,
  /**
   * What the room's `heldAction` will do at a point, asked (purely) by the
   * cue and by a click; an answer also stops a `useWhileCarrying` part
   * from taking the click.
   */
  targetFeedback?: (
    object: Object3D,
    portable: PortableObject,
    x: number,
    y: number,
  ) => TargetFeedback,
  /** A part is being picked up, before it leaves its place (a spark, a notice). */
  onPickUp?: (object: Object3D, portable: PortableObject) => void,
  /**
   * The room's solid things on the floor plan (its walls, cabinets), in
   * scene units: what a throw rebounds off (mission 211).
   */
  walls: () => readonly Footprint[] = () => [],
  /**
   * A held thing has left the hands by a way that did not ask the room
   * (`heldAction`): LET GO (dropped, thrown or tossed into a bin) or put
   * down on a top. Its owner hears so it can count it as no longer held.
   */
  onLetGo?: (object: Object3D, portable: PortableObject) => void,
) {
  const fixedSupports: SupportSurface[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (object.userData.portable)
      assertDropProfile(
        (object.userData.portable as PortableObject).component.dropProfile,
      );
    if (!object.userData.boardSupport) return;
    const bounds = new Box3().setFromObject(object);
    fixedSupports.push({
      minX: bounds.min.x / metre,
      maxX: bounds.max.x / metre,
      minZ: bounds.min.z / metre,
      maxZ: bounds.max.z / metre,
      top: bounds.max.y / metre,
    });
  });
  const ray = new Raycaster(),
    point = new Vector2();
  const records = new Map<
    Object3D,
    {
      parent: Object3D;
      portable: PortableObject;
      position: Vector3;
      rotation: Quaternion;
      scale: Vector3;
    }
  >();
  const falling = new Map<
    Object3D,
    {
      motion: ReturnType<typeof createBoardFall>;
      from: Quaternion;
      flat: Quaternion;
      centre: Vector3;
      size: Vector3;
      axis: Vector3;
      halfHeight: number;
      age: number;
      /** Where it was let go, for the supports it may land on (181). */
      release: Release;
    }
  >();
  let held: {
    object: Object3D;
    grab: Vector3;
    offset: Vector3;
    rotation: Quaternion;
    /** Half the diagonal of its bounds, metres: how big it looks. */
    radius: number;
    /** On its way from where it rested to the hand (mission 210). */
    move: { age: number; from: Vector3; fromQ: Quaternion } | null;
  } | null = null;
  // Things thrown, in flight until they come down (mission 211).
  const throwing = new Map<
    Object3D,
    {
      portable: PortableObject;
      state: ThrowState;
      centre: Vector3;
      half: number;
      halfHeight: number;
    }
  >();
  // Things on their way from the hand to a place on a top (mission 210).
  const placing = new Map<
    Object3D,
    {
      portable: PortableObject;
      age: number;
      from: Vector3;
      fromQ: Quaternion;
      to: Vector3;
      toQ: Quaternion;
      locked: boolean;
    }
  >();
  // Held up close to look at (mission 117): while inspecting, the held
  // thing swings to the middle of the view, at a distance that fits it,
  // scaled by `inspectScale`, which the wheel changes.
  let inspecting = false;
  let inspectScale = 1;
  // Turning to show its front (mission 117): from X's press until the
  // walker turns it, it eases to face the eye, upright. A portable's
  // front is its own +z and its top its own +y.
  let facing = false;
  // The held thing's own materials while it is drawn over the world
  // (`overWorld`), to put back when it is let go.
  let drawnOver: {
    object: Object3D;
    originals: Map<Mesh, Material | Material[]>;
  } | null = null;
  const drawOver = (object: Object3D | null) => {
    if (drawnOver?.object === object) return;
    if (drawnOver) {
      for (const [mesh, original] of drawnOver.originals) {
        const copies = mesh.material;
        mesh.material = original;
        for (const m of Array.isArray(copies) ? copies : [copies]) m.dispose();
      }
      drawnOver = null;
    }
    if (!object) return;
    const originals = new Map<Mesh, Material | Material[]>();
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      originals.set(child, child.material);
      child.material = Array.isArray(child.material)
        ? child.material.map(overWorld)
        : overWorld(child.material);
    });
    drawnOver = { object, originals };
  };
  const cameraRotation = new Quaternion();
  const worldRotation = new Quaternion();
  const worldPosition = new Vector3();
  const portableAt = (
    object: Object3D,
  ): { object: Object3D; portable: PortableObject } | null => {
    for (let o: Object3D | null = object; o; o = o.parent) {
      if (o.userData.portable)
        return { object: o, portable: o.userData.portable as PortableObject };
    }
    return null;
  };
  const hitAt = (x: number, y: number) => {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    ray.setFromCamera(point.set(x, y), camera);
    return ray
      .intersectObject(root, true)
      .find((hit) => visible(hit.object) && !hit.object.userData.noCollision);
  };
  const visible = (object: Object3D) => {
    for (let at: Object3D | null = object; at; at = at.parent)
      if (!at.visible || at === held?.object) return false;
    return true;
  };
  const surfaceTarget = (plinth: Object3D, deck: Object3D): PlacementTarget => {
    const occupied = (object: Object3D) => {
      if (plinthOccupied(plinth, object)) return true;
      const top = new Box3().setFromObject(deck);
      const candidates = new Set<Object3D>(records.keys());
      return [...candidates].some((other) => {
        if (other === object || !visible(other)) return false;
        const portable = other.userData.portable as PortableObject | undefined;
        if (!portable || portable.component.phase.value === 'held')
          return false;
        const bounds = new Box3().setFromObject(other);
        return (
          bounds.max.x > top.min.x &&
          bounds.min.x < top.max.x &&
          bounds.max.z > top.min.z &&
          bounds.min.z < top.max.z &&
          bounds.min.y >= top.max.y - 0.04 * metre &&
          bounds.min.y < top.max.y + 0.15 * metre
        );
      });
    };
    return {
      accepts: (object) => !occupied(object),
      place(object, portable) {
        const deckBounds = new Box3().setFromObject(deck);
        const centre = deckBounds.getCenter(new Vector3());
        // Preserve the carried orientation, and rest the actual model on top.
        root.attach(object);
        const bounds = new Box3().setFromObject(object);
        const middle = bounds.getCenter(new Vector3());
        const destination = object
          .getWorldPosition(new Vector3())
          .add(
            new Vector3(
              centre.x - middle.x,
              deckBounds.max.y - bounds.min.y,
              centre.z - middle.z,
            ),
          );
        object.position.copy(root.worldToLocal(destination));
        plinth.attach(object);
        portable.component.drop();
        portable.component.settle();
        portable.component.motion(0, true);
      },
    };
  };
  /** Ignore the held model itself; a destination can be seen behind it. */
  const placementAt = (
    x: number,
    y: number,
    // The same ray's first hit, when the caller has already cast it.
    found?: ReturnType<typeof hitAt> | null,
  ) => {
    const hit = found === undefined ? hitAt(x, y) : found;
    if (!hit) return null;
    for (let at: Object3D | null = hit.object; at; at = at.parent) {
      const target = at.userData.placementTarget as PlacementTarget | undefined;
      const deck = at.userData.placementSurface as Object3D | undefined;
      if (target || deck) {
        const destination = target ?? surfaceTarget(at, deck!);
        const portable = records.get(held!.object)!.portable;
        if (
          hit.distance > (destination.reach ?? 3.2) * metre ||
          destination.inRange?.(held!.object, portable) === false
        )
          return null;
        return {
          target: destination,
          accepts: destination.accepts(held!.object, portable),
          retainReset: Boolean(deck),
          cue: target?.cue ?? (deck ? 'put-down' : 'fit'),
        };
      }
    }
    return null;
  };
  /** A thing's bounds in its own frame (unscaled), from its meshes. */
  const ownBounds = (object: Object3D) => {
    object.updateMatrixWorld(true);
    const inverse = object.matrixWorld.clone().invert();
    const bounds = new Box3();
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox)
        bounds.union(
          child.geometry.boundingBox
            .clone()
            .applyMatrix4(
              new Matrix4().multiplyMatrices(inverse, child.matrixWorld),
            ),
        );
    });
    return bounds;
  };
  /** How a portable lies when it rests flat (its `flat` side down). */
  const lyingFlat = (portable: PortableObject) =>
    portable.flat === 'upright'
      ? new Quaternion()
      : new Quaternion().setFromAxisAngle(
          portable.flat === 'side'
            ? new Vector3(0, 0, 1)
            : new Vector3(1, 0, 0),
          portable.flat === 'side' ? Math.PI / 2 : -Math.PI / 2,
        );
  /**
   * Where a use at a screen point would put the held thing down on a top
   * (mission 210; the owner, 2026-11-05): at the exact spot aimed at, on
   * the upper face of a supportable top within reach, lying flat and
   * turned square to the eye, wholly on the top (no corner over its edge)
   * and clear of anything already there. Null when not aimed at a top; a
   * refusal when aimed at one where it will not go. No nearby spot is
   * looked for. Pure.
   */
  const spotOnTop = (
    object: Object3D,
    portable: PortableObject,
    hit: ReturnType<typeof hitAt> | null,
  ): { to: Vector3; toQ: Quaternion } | 'refused' | null => {
    if (!hit || hit.distance > 3.2 * metre || !hit.face) return null;
    const normal = hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld);
    if (normal.y < 0.7) return null;
    const px = hit.point.x / metre;
    const py = hit.point.y / metre;
    const pz = hit.point.z / metre;
    const top = [...fixedSupports, ...supports()].find(
      (s) =>
        px >= s.minX &&
        px <= s.maxX &&
        pz >= s.minZ &&
        pz <= s.maxZ &&
        Math.abs(s.top - py) <= 0.03,
    );
    if (!top) return null;
    // Lying flat, turned about the vertical to square with the eye.
    const forward = camera.getWorldDirection(new Vector3());
    const yaw = Math.atan2(-forward.x, -forward.z);
    const toQ = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), yaw)
      .multiply(lyingFlat(portable));
    const local = ownBounds(object);
    if (local.isEmpty()) return 'refused';
    local.min.multiply(object.scale);
    local.max.multiply(object.scale);
    const turned = local
      .clone()
      .applyMatrix4(new Matrix4().makeRotationFromQuaternion(toQ));
    const size = turned.getSize(new Vector3()).divideScalar(metre);
    const footprint = {
      minX: px - size.x / 2,
      maxX: px + size.x / 2,
      minZ: pz - size.z / 2,
      maxZ: pz + size.z / 2,
    };
    if (!footprintOn(footprint, top)) return 'refused';
    // Where its origin goes: its turned bounds' middle over the spot, its
    // bottom on the top.
    const middle = turned.getCenter(new Vector3());
    const to = new Vector3(
      hit.point.x - middle.x,
      top.top * metre - turned.min.y,
      hit.point.z - middle.z,
    );
    // Clear of anything already resting there.
    const room = new Box3(
      new Vector3(
        footprint.minX,
        top.top + 0.002,
        footprint.minZ,
      ).multiplyScalar(metre),
      new Vector3(
        footprint.maxX,
        top.top + size.y,
        footprint.maxZ,
      ).multiplyScalar(metre),
    ).expandByScalar(-0.002 * metre);
    let clear = true;
    root.traverse((other) => {
      if (!clear || other === object) return;
      const theirs = other.userData.portable as PortableObject | undefined;
      if (!theirs || theirs.component.phase.value === 'held') return;
      if (!visible(other)) return;
      if (new Box3().setFromObject(other).intersectsBox(room)) clear = false;
    });
    return clear ? { to, toQ } : 'refused';
  };
  /** Start putting the held thing down at `spot` (mission 210): it is no longer held. */
  const putDown = (spot: { to: Vector3; toQ: Quaternion }) => {
    if (!held) return;
    const { object } = held;
    const portable = records.get(object)!.portable;
    const locked = portable.component.locked.value;
    portable.component.drop();
    // Nothing takes it up again until it is down.
    portable.component.setLocked(true);
    onLetGo?.(object, portable);
    placing.set(object, {
      portable,
      age: 0,
      from: object.position.clone(),
      fromQ: object.quaternion.clone(),
      to: spot.to,
      toQ: spot.toQ,
      locked,
    });
    held = null;
  };
  const release = (x: number, y: number) => {
    if (!held) return;
    const { object } = held;
    const portable = records.get(object)!.portable;
    const action = heldAction?.(object, portable, x, y);
    if (action === 'refuse') return;
    if (action) {
      records.delete(object);
      held = null;
      return;
    }
    const destination = placementAt(x, y);
    if (destination) {
      if (!destination.accepts) return;
      destination.target.place(object, portable);
      if (!destination.retainReset) records.delete(object);
      held = null;
      return;
    }
    fall(object, portable);
  };
  /** Let the held thing go from the hand, to fall by its drop profile (until 211's throw). */
  /** A thing's middle and size in its own frame, scaled, in metres. */
  const middleAndSize = (object: Object3D) => {
    const bounds = ownBounds(object);
    return {
      centre: bounds
        .getCenter(new Vector3())
        .multiply(object.scale)
        .divideScalar(metre),
      size: bounds
        .getSize(new Vector3())
        .multiply(object.scale)
        .divideScalar(metre),
    };
  };
  /**
   * LET GO with nothing to take it (mission 211): thrown from the hand the
   * way it is aimed, at the one leisurely speed, rebounding off the room's
   * solid sides, until it comes down on the floor or a top; then it falls
   * and settles as anything let go does. Aimed down, a short drop.
   */
  const throwFrom = (object: Object3D, portable: PortableObject) => {
    portable.component.drop();
    if (divert?.(object, portable)) {
      records.delete(object);
      held = null;
      return;
    }
    const { centre, size } = middleAndSize(object);
    const at = object.position
      .clone()
      .divideScalar(metre)
      .add(centre.clone().applyQuaternion(object.quaternion));
    const aim = camera.getWorldDirection(new Vector3());
    const start = launch(at, aim);
    const placed = redirectDrop?.({
      x: start.x,
      y: start.y,
      z: start.z,
      vx: start.vx,
      vz: start.vz,
    });
    if (placed) Object.assign(start, placed);
    object.position
      .set(start.x, start.y, start.z)
      .sub(centre.clone().applyQuaternion(object.quaternion))
      .multiplyScalar(metre);
    throwing.set(object, {
      portable,
      state: start,
      centre,
      half: Math.max(size.x, size.z) / 2,
      halfHeight: size.y / 2,
    });
    held = null;
  };
  const fall = (
    object: Object3D,
    portable: PortableObject,
    /** Where a throw came down, and how it was going: it falls on from there. */
    landing?: { x: number; y: number; z: number; vx: number; vz: number },
  ) => {
    if (!landing) portable.component.drop();
    if (!landing && divert?.(object, portable)) {
      // The room's to move from now on: it is not put back where it was
      // picked up, even if it is installed again somewhere else.
      records.delete(object);
      held = null;
      return;
    }
    const profile = portable.component.dropProfile;
    assertDropProfile(profile);
    const forward = camera.getWorldDirection(new Vector3());
    const vx = landing?.vx ?? forward.x * 0.65 + 0.12;
    const vz = landing?.vz ?? forward.z * 0.65;
    const axis = new Vector3(vz, 0, -vx).normalize();
    if (axis.lengthSq() === 0) axis.set(1, 0, 0);
    const flat = lyingFlat(portable);
    if (profile.shape === 'round')
      flat.setFromUnitVectors(
        new Vector3(
          profile.rollAxis === 'x' ? 1 : 0,
          profile.rollAxis === 'y' ? 1 : 0,
          profile.rollAxis === 'z' ? 1 : 0,
        ),
        axis,
      );
    // Bounds in the object's own frame, independent of where it was grabbed.
    object.updateMatrixWorld(true);
    const inverse = object.matrixWorld.clone().invert();
    const bounds = new Box3();
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox)
        bounds.union(
          child.geometry.boundingBox
            .clone()
            .applyMatrix4(
              new Matrix4().multiplyMatrices(inverse, child.matrixWorld),
            ),
        );
    });
    const centre = bounds
      .getCenter(new Vector3())
      .multiply(object.scale)
      .divideScalar(metre);
    const size = bounds
      .getSize(new Vector3())
      .multiply(object.scale)
      .divideScalar(metre);
    const original = object.quaternion.clone();
    const position = object.position
      .clone()
      .divideScalar(metre)
      .add(centre.clone().applyQuaternion(original));
    const placed = landing ??
      redirectDrop?.({
        x: position.x,
        y: position.y,
        z: position.z,
        vx,
        vz,
      }) ?? { x: position.x, y: position.y, z: position.z, vx, vz };
    position.set(placed.x, placed.y, placed.z);
    object.position
      .copy(position)
      .sub(centre.clone().applyQuaternion(original))
      .multiplyScalar(metre);
    falling.set(object, {
      motion: createBoardFall(
        position.x,
        position.y,
        position.z,
        placed.vx,
        placed.vz,
        profile,
      ),
      from: original,
      flat,
      centre,
      size,
      axis,
      halfHeight: size.y / 2,
      age: 0,
      release: { x: position.x, z: position.z, top: position.y + size.y / 2 },
    });
    held = null;
  };
  /** Into the hands, as if grabbed at `point` (world). */
  const take = (
    object: Object3D,
    portable: PortableObject,
    // Where it was grabbed: it is held by its middle whatever the point.
    _point: Vector3,
  ) => {
    if (!records.has(object))
      records.set(object, {
        parent: object.parent!,
        portable,
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.clone(),
      });
    assertDropProfile(portable.component.dropProfile);
    onPickUp?.(object, portable);
    portable.component.pickUp();
    portable.detach();
    root.attach(object);
    falling.delete(object);
    object.updateMatrixWorld(true);
    camera.getWorldQuaternion(cameraRotation);
    // Held, and turned, about its middle (mission 117): the middle of its
    // bounds stands for its centre of gravity, so it turns as a thing
    // turned in the hands does, not about the corner its origin is at.
    const inverse = object.matrixWorld.clone().invert();
    const local = new Box3();
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox)
        local.union(
          child.geometry.boundingBox
            .clone()
            .applyMatrix4(
              new Matrix4().multiplyMatrices(inverse, child.matrixWorld),
            ),
        );
    });
    const middle = local.isEmpty()
      ? new Vector3()
      : local.getCenter(new Vector3());
    const size = local.isEmpty()
      ? new Vector3()
      : local.getSize(new Vector3()).multiply(object.scale);
    inspectScale = 1;
    placing.delete(object);
    throwing.delete(object);
    held = {
      object,
      // Straight for the hand (mission 210): the move eases it there.
      grab: new Vector3(0.18 * metre, -0.18 * metre, -0.65 * metre),
      move: {
        age: 0,
        from: object.position.clone(),
        fromQ: object.quaternion.clone(),
      },
      offset: middle,
      rotation: cameraRotation
        .clone()
        .invert()
        .multiply(object.getWorldQuaternion(new Quaternion())),
      radius: size.length() / 2 / metre,
    };
  };
  /**
   * How far in front of the eye a held thing of `radius` (metres) is held
   * to be looked at: far enough that it fills about 70% of the view's
   * height, scaled by the wheel, never nearer than the camera can draw.
   */
  const inspectionDistance = (radius: number) => {
    const half = ((camera.fov / 2) * Math.PI) / 180;
    const fit = radius / Math.tan(half * 0.7);
    const nearest = camera.near / metre + radius + 0.02;
    return Math.max(nearest, Math.min(1.5, fit * inspectScale));
  };
  const NOT_THE_HANDS: HandsResolution = { answer: 'use', run: () => false };
  /**
   * What a use at a normalised screen point would do with the hands, and
   * the step that does it (mission 116): the click and the crosshair's cue
   * both come from here, so they cannot disagree. Asking changes nothing:
   * it calls only the pure hooks (`allowPickup`, `targetFeedback`,
   * a target's `inRange` and `accepts`), never
   * `heldAction`, `divert`, `place` or a pick-up. Its order is the use's.
   *
   * Carrying: the room's `targetFeedback` (what its `heldAction` will do);
   * else a `useWhileCarrying` part aimed at (not the hands'); else a
   * placement target or surface aimed at (fit, put down, put back, put
   * in a bin, or refused, when the thing is kept); else a clear spot on a
   * supportable top aimed at (put down there, eased, mission 210), or a
   * refusal where it will not go; else the room's use, after its
   * `heldAction`, the thing kept in hand (211: only LET GO lets go).
   *
   * Not carrying: a portable thing under the aim, in reach, is a lift,
   * possible or not; a fixed one, or nothing, is not the hands'.
   */
  function resolve(x: number, y: number): HandsResolution {
    // Held up to look at: nothing is placed or dropped, and no cue says
    // otherwise, until it is back in the hand (mission 117).
    if (held && inspecting) return { answer: null, run: () => true };
    // On its way to the hand: nothing else until it is there (mission 210).
    if (held?.move) return { answer: null, run: () => true };
    if (held) {
      const object = held.object;
      const portable = records.get(object)!.portable;
      const releaseHere = () => {
        release(x, y);
        return true;
      };
      const custom = feedbackAnswer(
        targetFeedback?.(object, portable, x, y) ?? null,
      );
      if (custom) return { answer: custom, run: releaseHere };
      // One raycast for both: the control aimed at, and the place.
      const hit = hitAt(x, y) ?? null;
      if (hit && hit.distance <= 3.2 * metre)
        for (let at: Object3D | null = hit.object; at; at = at.parent)
          if (at.userData.useWhileCarrying) return NOT_THE_HANDS;
      const destination = placementAt(x, y, hit);
      if (destination)
        return {
          answer: destination.accepts
            ? { gesture: destination.cue, possible: true }
            : { gesture: destination.cue, possible: false, refused: true },
          run: releaseHere,
        };
      // Down on a top aimed at, where it fits (mission 210).
      const spot = spotOnTop(object, portable, hit);
      if (spot === 'refused')
        return {
          answer: { gesture: 'put-down', possible: false, refused: true },
          run: () => true,
        };
      if (spot)
        return {
          answer: { gesture: 'put-down', possible: true },
          run: () => {
            putDown(spot);
            return true;
          },
        };
      // Anything else is the room's use, the thing staying in hand (211),
      // after the room's own held action (a part seated where it is aimed).
      return {
        answer: 'use',
        run: () => {
          const action = heldAction?.(object, portable, x, y);
          if (action === 'refuse') return true;
          if (!action) return false;
          records.delete(object);
          held = null;
          return true;
        },
      };
    }
    const hit = hitAt(x, y);
    if (!hit || hit.distance > 3.2 * metre) return NOT_THE_HANDS;
    const found = portableAt(hit.object);
    if (
      !found ||
      found.portable.component.attachment === 'fixed' ||
      placing.has(found.object)
    )
      return NOT_THE_HANDS;
    const { object, portable } = found;
    const possible =
      portable.component.canPickUp.value &&
      (!allowPickup || allowPickup(object, portable));
    return {
      answer: { gesture: 'pick-up', possible },
      run() {
        if (!possible) return false;
        take(object, portable, hit.point);
        return true;
      },
    };
  }
  return {
    holding: () => held !== null,
    heldObject: () => held?.object ?? null,
    resolve,
    /** The old feedback, from the resolver: 'accept', 'reject', or null. */
    targetFeedback(x: number, y: number): 'accept' | 'reject' | null {
      if (!held) return null;
      const { answer } = resolve(x, y);
      if (!answer || answer === 'use') return null;
      return answer.possible ? 'accept' : answer.refused ? 'reject' : null;
    },
    /**
     * Hold the held thing up to look at, or put it back in the right hand
     * (mission 117): it swings to the middle of the view while `on`.
     */
    inspect(on: boolean) {
      const now = on && held !== null;
      if (now && !inspecting) facing = true;
      if (!now) facing = false;
      inspecting = now;
    },
    /** Whether the held thing is being looked at close to. */
    inspecting: () => inspecting && held !== null,
    /** Bring the held thing nearer (a wheel's negative `deltaY`) or further while inspecting it. */
    inspectNearer(deltaY: number) {
      inspectScale = Math.min(
        INSPECT_SCALE.max,
        Math.max(INSPECT_SCALE.min, inspectScale * Math.exp(deltaY * 0.0015)),
      );
    },
    rotate(yaw: number, pitch: number) {
      if (!held) return;
      // Turned by hand: no longer easing to show its front.
      if (yaw || pitch) facing = false;
      const previous = held.rotation.clone();
      held.rotation.premultiply(
        new Quaternion().setFromEuler(new Euler(-pitch, yaw, 0, 'YXZ')),
      );
      camera.getWorldQuaternion(cameraRotation);
      held.object.quaternion.copy(cameraRotation).multiply(held.rotation);
      held.object.updateMatrixWorld(true);
      const rotated = new Box3().setFromObject(held.object);
      if (carrySolids().some((solid) => rotated.intersectsBox(solid))) {
        held.rotation.copy(previous);
        held.object.quaternion.copy(cameraRotation).multiply(previous);
      }
    },
    /** Use at a point: whether the hands took it (else the room's use runs). */
    use: (x: number, y: number) => resolve(x, y).run(),
    /**
     * LET GO at a point (mission 211; the owner, 2026-11-05): a bin aimed
     * at within reach takes it, as a use would (209), carried or held up
     * to look at; otherwise, held up to look at (inspecting), it is thrown
     * the way it is aimed, and only carried, it is dropped. Whether it was
     * let go of.
     */
    letGo(x: number, y: number) {
      if (!held || held.move) return false;
      const { object } = held;
      const portable = records.get(object)!.portable;
      const wasInspecting = inspecting;
      const done = () => {
        inspecting = false;
        facing = false;
      };
      const destination = placementAt(x, y);
      if (destination?.target.letGo) {
        if (!destination.accepts) return false;
        done();
        onLetGo?.(object, portable);
        destination.target.place(object, portable);
        if (!destination.retainReset) records.delete(object);
        held = null;
        return true;
      }
      done();
      onLetGo?.(object, portable);
      // Held up to look at, it is thrown; only carried, it is dropped.
      if (wasInspecting) throwFrom(object, portable);
      else fall(object, portable);
      return true;
    },
    /** Whether a thing is in flight, thrown (mission 211). */
    thrown: (object: Object3D) => throwing.has(object),
    /** Whether a thing is on its way to the hand or to a top. */
    moving: () => Boolean(held?.move) || placing.size > 0,
    /**
     * Put a portable object straight into the hands (a find handed over
     * from a container, which the visitor did not pick off the floor): it
     * must be in the scene under `root`, with `userData.portable`. Held
     * as if picked up at its middle, with its pick-up event. False if the
     * hands are full or it cannot be picked up.
     */
    give(object: Object3D) {
      const portable = object.userData.portable as PortableObject | undefined;
      if (held || !portable || !object.parent) return false;
      if (!portable.component.canPickUp.value) return false;
      object.updateMatrixWorld(true);
      take(
        object,
        portable,
        new Box3().setFromObject(object).getCenter(new Vector3()),
      );
      return true;
    },
    /**
     * Let go of an object without dropping it (a room resetting): it is no
     * longer held, falling or remembered, and stays where it is.
     */
    forget(object: Object3D) {
      records.delete(object);
      falling.delete(object);
      placing.delete(object);
      throwing.delete(object);
      if (held?.object === object) held = null;
    },
    /** Whether the hands have something, or something at the centre can be lifted now. */
    aimed() {
      if (held) return true;
      const { answer } = resolve(0, 0);
      return Boolean(
        answer &&
        answer !== 'use' &&
        answer.gesture === 'pick-up' &&
        answer.possible,
      );
    },
    update(dt: number) {
      // Only dev0 requests a model reset; ordinary drops never reattach themselves.
      for (const [object, record] of records) {
        if (record.portable.component.phase.value !== 'installed') continue;
        record.parent.add(object);
        object.position.copy(record.position);
        object.quaternion.copy(record.rotation);
        object.scale.copy(record.scale);
        falling.delete(object);
        throwing.delete(object);
        placing.delete(object);
        if (held?.object === object) held = null;
        records.delete(object);
      }
      drawOver(held?.object ?? null);
      if (held) {
        camera.getWorldQuaternion(cameraRotation);
        // Its front to the eye, upright: its frame the camera's own.
        if (facing) held.rotation.slerp(UPRIGHT_TO_EYE, Math.min(1, dt * 12));
        worldRotation.copy(cameraRotation).multiply(held.rotation);
        held.object.quaternion.copy(worldRotation);
        held.grab.lerp(
          inspecting
            ? new Vector3(0, 0, -inspectionDistance(held.radius) * metre)
            : new Vector3(0.18 * metre, -0.18 * metre, -0.65 * metre),
          Math.min(1, dt * 12),
        );
        worldPosition
          .copy(held.offset)
          .multiply(held.object.scale)
          .applyQuaternion(worldRotation);
        const start = held.object.position.clone();
        const target = camera
          .localToWorld(held.grab.clone())
          .sub(worldPosition);
        const travel = target.clone().sub(start);
        const solids = carrySolids();
        if (held.move) {
          // Straight from where it rested to the moving hand, eased,
          // whatever is between (mission 210).
          held.move.age += dt;
          const { k, done } = handMove(held.move.age);
          held.object.position.copy(held.move.from).lerp(target, k);
          held.object.quaternion.copy(held.move.fromQ).slerp(worldRotation, k);
          if (done) held.move = null;
        } else if (solids.length) {
          held.object.updateMatrixWorld(true);
          const startBox = new Box3().setFromObject(held.object);
          const candidate = new Box3();
          const steps = Math.min(
            48,
            Math.max(1, Math.ceil(travel.length() / (0.04 * metre))),
          );
          let safe = 0;
          for (let i = 1; i <= steps; i++) {
            candidate
              .copy(startBox)
              .translate(travel.clone().multiplyScalar(i / steps));
            if (
              solids.some(
                (solid) =>
                  candidate.intersectsBox(solid) &&
                  !startBox.intersectsBox(solid),
              )
            )
              break;
            safe = i / steps;
          }
          held.object.position.copy(start).addScaledVector(travel, safe);
        } else held.object.position.copy(target);
      }
      for (const [object, flight] of throwing) {
        const sides = walls().map((w) => ({
          minX: w.minX / metre,
          maxX: w.maxX / metre,
          minZ: w.minZ / metre,
          maxZ: w.maxZ / metre,
        }));
        const was = flight.state;
        flight.state = stepThrow(was, dt, sides, flight.half);
        const s = flight.state;
        // Down on the floor, or on a top it comes down onto from above (181).
        const ground = landingGround(
          [...fixedSupports, ...supports()],
          s.x,
          s.z,
          was.y - flight.halfHeight,
          floorY / metre,
        );
        const landed = s.y - flight.halfHeight <= ground;
        const y = landed ? ground + flight.halfHeight : s.y;
        object.position
          .set(s.x, y, s.z)
          .sub(flight.centre.clone().applyQuaternion(object.quaternion))
          .multiplyScalar(metre);
        if (!landed) continue;
        throwing.delete(object);
        // It falls on from where it came down, a little slower, and settles.
        fall(object, flight.portable, {
          x: s.x,
          y,
          z: s.z,
          vx: s.vx * 0.5,
          vz: s.vz * 0.5,
        });
      }
      for (const [object, move] of placing) {
        move.age += dt;
        const { k, done } = handMove(move.age);
        object.position.copy(move.from).lerp(move.to, k);
        object.quaternion.copy(move.fromQ).slerp(move.toQ, k);
        if (!done) continue;
        // Down, still: no bounce (mission 210).
        placing.delete(object);
        move.portable.component.setLocked(move.locked);
        move.portable.component.settle();
        move.portable.component.motion(0, true);
      }
      for (const [object, fall] of falling) {
        const portable = records.get(object)!.portable;
        fall.age += dt;
        const previous = fall.motion.body;
        const profile = portable.component.dropProfile;
        const rotate = () => {
          if (profile.shape === 'flat') {
            object.quaternion
              .copy(fall.from)
              .slerp(fall.flat, Math.min(1, fall.age / 0.32));
          } else {
            let angle = previous.angle;
            if (profile.shape === 'box') {
              const speed = Math.hypot(previous.vx, previous.vz);
              const snap = previous.grounded ? Math.max(0, 1 - speed / 0.2) : 0;
              angle +=
                ((Math.round(angle / (Math.PI / 2)) * Math.PI) / 2 - angle) *
                snap;
              // Box corners turn about a principal axis and finish on a face.
              object.quaternion
                .setFromAxisAngle(new Vector3(0, 0, 1), angle)
                .multiply(fall.flat);
            } else {
              object.quaternion
                .setFromAxisAngle(fall.axis, -angle)
                .multiply(fall.flat);
            }
            if (fall.age < 0.25) {
              const target = object.quaternion.clone();
              object.quaternion.copy(fall.from).slerp(target, fall.age / 0.25);
            }
          }
          const box = new Box3()
            .setFromCenterAndSize(new Vector3(), fall.size)
            .applyMatrix4(
              new Matrix4().makeRotationFromQuaternion(object.quaternion),
            );
          return box.getSize(new Vector3()).y / 2;
        };
        const height = rotate();
        // Never teleport onto a support from its side, but one it was let
        // go over, partly above its top, takes it (181).
        const bottom = previous.y - fall.halfHeight;
        const groundAt = (x: number, z: number) =>
          landingGround(
            [...fixedSupports, ...supports()],
            x,
            z,
            bottom,
            floorY / metre,
            fall.release,
          );
        fall.motion.step(
          dt,
          (x, z) => groundAt(x, z) + height,
          portable.component.impact,
        );
        fall.halfHeight = rotate();
        if (previous.grounded)
          previous.y = groundAt(previous.x, previous.z) + fall.halfHeight;
        const offset = fall.centre.clone().applyQuaternion(object.quaternion);
        object.position
          .set(
            previous.x - offset.x,
            previous.y - offset.y,
            previous.z - offset.z,
          )
          .multiplyScalar(metre);
        portable.component.motion(
          Math.hypot(previous.vx, previous.vz),
          previous.grounded,
        );
        if (previous.settled) {
          portable.component.settle();
          falling.delete(object);
        }
      }
    },
    dispose() {
      drawOver(null);
      for (const [object, record] of records) record.parent.attach(object);
      records.clear();
      falling.clear();
      placing.clear();
      throwing.clear();
      held = null;
    },
  };
}
