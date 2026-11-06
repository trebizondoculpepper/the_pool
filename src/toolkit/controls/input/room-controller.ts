import type { Camera, Object3D } from 'three';
import { createFirstPerson, firstPersonOn } from './first-person';
import type { FirstPersonOptions } from './first-person';
import type { PortableObject, SupportSurface } from './object-handling';
import type { Footprint } from '../logic/walk-collision';
import type { LadderZone } from '../logic/ladder-zone';
import type { InspectionTarget } from '../logic/inspection';

/** A named room style may be approved later; every room uses the standard style now. */
export type RoomStyle = 'standard';

/**
 * What the game's object registry says about a room's things, for carrying
 * (missions 189 and 181): this layer imports nothing of ours, so the game
 * registers it once (`useRoomTraits`) and every room's controller asks it.
 */
export interface RoomTraits {
  /** Whether `object` is of a holdable kind; null when it has no kind. */
  holdable(object: Object3D): boolean | null;
  /** The tops (metres) that things let go of in `root` rest on. */
  supports(root: Object3D, metre: number): readonly SupportSurface[];
  /**
   * The room's bins (mission 205): things let go near a bin-like object
   * fly into it. Made once per room; found among `root`'s objects.
   */
  bins?(root: Object3D, metre: number): RoomBins;
  /**
   * Make every thing of a holdable kind in `root` carryable (mission 189),
   * where its builder did not: cheap when nothing has changed, so it is
   * asked every frame.
   */
  holdables?(root: Object3D, metre: number): void;
  /**
   * What blocks the walker besides the room's own solids (mission 208,
   * stage 2): its solid, bounds-modelled things, in scene units. What is
   * thrown rebounds off the same footprints (211).
   */
  solids?(root: Object3D, metre: number): readonly Footprint[];
  /**
   * The room's racks (mission 206): every placed `rack`-kind object's
   * placement target, registered on the object. Built once per room; found
   * among `root`'s objects.
   */
  racks?(root: Object3D, metre: number): void;
  /**
   * The room's ladders (#18): every placed object of a `ladder` kind,
   * climbable from either end, in scene units. `floorAt` is the floor a
   * pool ladder's foot stands on.
   */
  ladders?(
    root: Object3D,
    metre: number,
    floorAt?: (x: number, z: number) => number,
  ): readonly LadderZone[];
}

/** Throwing into a room's bin-like objects, as the walker sees it. */
/**
 * A room's bins (mission 205): each is a placement target, aimed at to
 * put a held thing in by use or let go (209).
 */
export interface RoomBins {
  update(delta: number): void;
  /** How many things have gone into each bin so far, by name. */
  filled(): Readonly<Record<string, number>>;
  /** Throw `object` straight into the nearest bin (for development). */
  toss(object: Object3D, portable: PortableObject): void;
}

let registered: RoomTraits | null = null;

/** Register the registry's traits for every room controller made after this. */
export const useRoomTraits = (traits: RoomTraits | null) => {
  registered = traits;
};

/**
 * The information overlay (prompt 061), as the factory installs it for
 * every room (mission 160): how what the aim meets is named. This layer
 * imports nothing of ours, so the game registers the builder once
 * (`useRoomInspector`, from `gallery/views/inspect-pick.ts`'s
 * `installRoomInspector`) and every room's controller asks it, exactly as
 * it does the carrying traits.
 */
export interface RoomInspectorOptions {
  /** What to look among: the room's scene. */
  scene: Object3D;
  camera: Camera;
  /** Scene units per metre. */
  metre: number;
  /** The world whose live state the second line reads, if the room has one. */
  world?: () => unknown;
  /** Another way to know a hit object, for a room whose things are not marked (dev0). */
  identify?: (object: Object3D) => unknown;
}

export type RoomInspectorFactory = (
  options: RoomInspectorOptions,
) => ((x: number, y: number) => InspectionTarget | null) | null;

let inspectorFactory: RoomInspectorFactory | null = null;

/** Register the information overlay's builder for every room made after this. */
export const useRoomInspector = (factory: RoomInspectorFactory | null) => {
  inspectorFactory = factory;
};

/**
 * The overlay a room's controller installs (mission 160): the registered
 * factory's inspector for the room's own scene, camera and metre, or null
 * where none is registered. Kept apart from the controller so a fast test
 * can check the factory is asked.
 */
export const roomInspectorFor = (options: RoomInspectorOptions) =>
  inspectorFactory ? inspectorFactory(options) : null;

export interface RoomControllerOptions extends Omit<
  FirstPersonOptions,
  'inspect'
> {
  roomStyle?: RoomStyle;
  /**
   * Whether the owner of a thing of a holdable kind lets it go now (a desk
   * while its box is in use, a cupboard whose drawer is shut): true or
   * false, or null when it has no say. Things with no kind keep the
   * room's `allowPickup`.
   */
  ownerAllows?: (object: Object3D, portable: PortableObject) => boolean | null;
  /**
   * The floor under a point, in scene units, where it is not flat (a pool's
   * sloping floor): data for the factory's ladders (#18), which stand a
   * pool ladder's foot on it.
   */
  ladderFloorAt?: (x: number, z: number) => number;
  /**
   * The world whose live state the information overlay's second line reads
   * (mission 160): a room's own data, not behaviour, given to the factory's
   * inspector. A room with no world of its own omits it.
   */
  world?: () => unknown;
  /** Another way to know a hit object, for a room whose things are not marked (dev0). */
  identify?: (object: Object3D) => unknown;
}

/**
 * The single entry for a room's controls (mission 159). With the
 * registry's traits registered and the room carrying things (`objects`),
 * a thing's kind decides whether it may be picked up (holdable or not; its
 * owner may still say not now), and things let go of rest on the room's
 * supportable tops besides any supports the room gives. The information
 * overlay (mission 160) is installed for every room from its own scene,
 * camera and metre, so what is aimed at is named wherever the registry or
 * the identity marks say so; a room no longer passes `inspect` itself.
 */
export function createRoomController(options: RoomControllerOptions) {
  const traits = registered;
  const root = options.objects;
  // The information overlay, one per room (mission 160): built by the
  // registered inspector from what the controller already has, so every
  // room names what is aimed at, and no room starter passes `inspect`
  // (it is not in `RoomControllerOptions`; the factory is the only way).
  const roomRoot = options.scene ?? root;
  const inspect =
    roomRoot !== undefined
      ? roomInspectorFor({
          scene: roomRoot,
          camera: options.camera,
          metre: options.metre,
          world: options.world,
          identify: options.identify,
        })
      : null;
  // The factory's ladders (#18), for every room with a scene, whether or
  // not it carries things: a room that still lists its own (`ladders`)
  // keeps them while the rooms migrate.
  const ladderRoot = options.scene ?? root;
  const factoryLadders =
    traits?.ladders && ladderRoot && !options.ladders
      ? () => traits.ladders!(ladderRoot, options.metre, options.ladderFloorAt)
      : undefined;
  const overlay: FirstPersonOptions = {
    ...options,
    ...(factoryLadders ? { ladders: factoryLadders } : {}),
    ...(inspect !== null ? { inspect } : {}),
  };
  if (!traits || !root)
    return Object.assign(createFirstPerson(overlay), {
      bins: null as RoomBins | null,
    });
  const scene = options.scene ?? root;
  const roomSupports = options.supports;
  const roomSolids = options.solids;
  const bins = traits.bins?.(scene, options.metre);
  traits.holdables?.(scene, options.metre);
  traits.racks?.(scene, options.metre);
  const walker = createFirstPerson({
    ...overlay,
    allowPickup(object, portable) {
      const holdable = traits.holdable(object);
      if (holdable === false) return false;
      if (holdable === true)
        return options.ownerAllows?.(object, portable) ?? true;
      return options.allowPickup ? options.allowPickup(object, portable) : true;
    },
    supports: () => [
      ...(roomSupports?.() ?? []),
      ...traits.supports(scene, options.metre),
    ],
    solids: traits.solids
      ? () => [
          ...(roomSolids?.() ?? []),
          ...(traits.solids?.(scene, options.metre) ?? []),
        ]
      : roomSolids,
  });
  const step = walker.update.bind(walker);
  walker.update = (delta: number) => {
    traits.holdables?.(scene, options.metre);
    step(delta);
    bins?.update(delta);
  };
  return Object.assign(walker, { bins: bins ?? null });
}

/** The controller attached by a starter, for the main room-mount seam. */
export const roomControllerOn = firstPersonOn;
