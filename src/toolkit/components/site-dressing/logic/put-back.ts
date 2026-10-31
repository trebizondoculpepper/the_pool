/**
 * The engineer's software boxes can move among their original place, a
 * neat shelf slot, the desk's dump pile and the PC's cardboard carton.
 * Each has a home pose and may rest on another box there. One is held at
 * a time. A supported box cannot be lifted while its dependant remains
 * at home or on the shelf; a box cannot return to a supported pose without its support.
 * The desk and carton are stacks: only their top box can be lifted. The
 * carrying itself is the control scheme's (`controls/input/object-handling.ts`);
 * this pure model only decides whose turn it is and where each belongs.
 * Not saved: a room built afresh sets everything out again.
 */

/** A pose in a parent's frame: position, metres, and rotation as a quaternion (x, y, z, w). */
export interface Pose {
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
}

/** Where a thing is: at its original home, in the hands, or at a new place ('loose': dropped wherever it fell). */
export type Whereabouts =
  | 'home'
  | 'held'
  | 'binned'
  | 'desk'
  | 'shelf'
  | 'loose';

export type HomeArea = 'desk' | 'shelf';

export interface PutBack<K> {
  /** Set `key` out at `home`, resting on `restsOn` if anything. */
  home(key: K, home: Pose, restsOn?: K, area?: HomeArea): void;
  /** Register a neat shelf slot for this item, including items that began on the desk. */
  shelfPose(key: K, pose: Pose): void;
  /** Whether `key` is one of these things. */
  has(key: K): boolean;
  /** Where `key` is, or null if it is not one of these things. */
  where(key: K): Whereabouts | null;
  /** Whether `key` may be picked up now. */
  canPickUp(key: K): boolean;
  /** Pick `key` up, if it may be; whether it was. */
  pickUp(key: K): boolean;
  /** Whether the held `key` could be put back now (its support home), changing nothing. */
  canPutBack(key: K): boolean;
  /** Put the held `key` back: its home, or null if it is not the one held or its support is away. */
  putBack(key: K): Pose | null;
  /** Throw the held `key` in the bin: its place there (0 at the bottom), or null if it is not the one held. */
  bin(key: K): number | null;
  /** Set the held `key` on the desk's dump pile: its stack slot, or null. */
  desk(key: K): number | null;
  /** Whether the held `key` has a registered, available shelf slot. */
  canShelf(key: K): boolean;
  /** Set the held `key` neatly in its shelf slot: the pose there, or null. */
  shelf(key: K): Pose | null;
  /**
   * Stand the held `key` in the shelf's row, `tidied` being the others
   * straightened up in the row with it: all on the shelf now, none
   * leaning on another. Whether it was held.
   */
  shelve(key: K, tidied: readonly K[]): boolean;
  /** Let the held `key` fall wherever it is let go: whether it was held. */
  loosen(key: K): boolean;
  /** What is in the bin, bottom first. */
  binned(): readonly K[];
  /** What is in the desk's dump pile, bottom first. */
  onDesk(): readonly K[];
  /** What is held, if anything. */
  held(): K | null;
}

export function createPutBack<K>(): PutBack<K> {
  const homes = new Map<K, { pose: Pose; restsOn?: K; area: HomeArea }>();
  const shelfSlots = new Map<K, Pose>();
  const inBin: K[] = [];
  const onDesk: K[] = [];
  const onShelf = new Set<K>();
  const loose = new Set<K>();
  let held: K | null = null;
  const where = (key: K): Whereabouts | null =>
    !homes.has(key)
      ? null
      : key === held
        ? 'held'
        : inBin.includes(key)
          ? 'binned'
          : onDesk.includes(key)
            ? 'desk'
            : onShelf.has(key)
              ? 'shelf'
              : loose.has(key)
                ? 'loose'
                : 'home';
  const supports = (key: K, area: HomeArea) => {
    const at = where(key);
    return area === 'shelf'
      ? at === 'shelf' || (at === 'home' && homes.get(key)?.area === 'shelf')
      : at === 'home' && homes.get(key)?.area === 'desk';
  };
  const canPickUp = (key: K) => {
    if (held !== null) return false;
    const at = where(key);
    if (at === 'binned') return inBin[inBin.length - 1] === key;
    if (at === 'desk') return onDesk[onDesk.length - 1] === key;
    if (at === 'loose') return true;
    if (at !== 'home' && at !== 'shelf') return false;
    return ![...homes].some(
      ([other, { restsOn, area }]) => restsOn === key && supports(other, area),
    );
  };
  const canPutBack = (key: K) => {
    if (held === null || held !== key) return false;
    const { restsOn, area } = homes.get(key)!;
    return restsOn === undefined || supports(restsOn, area);
  };
  return {
    home(key, pose, restsOn, area = 'shelf') {
      homes.set(key, { pose, restsOn, area });
      if (area === 'shelf') shelfSlots.set(key, pose);
    },
    shelfPose(key, pose) {
      if (!homes.has(key))
        throw new Error('Register a home before a shelf slot');
      shelfSlots.set(key, pose);
    },
    has: (key) => homes.has(key),
    where,
    canPickUp,
    pickUp(key) {
      if (!canPickUp(key)) return false;
      if (where(key) === 'binned') inBin.pop();
      if (where(key) === 'desk') onDesk.pop();
      onShelf.delete(key);
      loose.delete(key);
      held = key;
      return true;
    },
    canPutBack,
    putBack(key) {
      if (!canPutBack(key)) return null;
      held = null;
      return homes.get(key)!.pose;
    },
    bin(key) {
      if (held === null || held !== key) return null;
      held = null;
      inBin.push(key);
      return inBin.length - 1;
    },
    desk(key) {
      if (held === null || held !== key) return null;
      held = null;
      onDesk.push(key);
      return onDesk.length - 1;
    },
    canShelf(key) {
      if (held === null || held !== key || !shelfSlots.has(key)) return false;
      const { restsOn, area } = homes.get(key)!;
      return (
        area !== 'shelf' || restsOn === undefined || supports(restsOn, 'shelf')
      );
    },
    shelf(key) {
      if (!this.canShelf(key)) return null;
      const pose = shelfSlots.get(key);
      if (!pose) return null;
      held = null;
      onShelf.add(key);
      return pose;
    },
    shelve(key, tidied) {
      if (held === null || held !== key) return false;
      held = null;
      for (const k of [key, ...tidied]) {
        loose.delete(k);
        onShelf.add(k);
        const home = homes.get(k);
        if (home) homes.set(k, { ...home, restsOn: undefined });
      }
      return true;
    },
    loosen(key) {
      if (held === null || held !== key) return false;
      held = null;
      loose.add(key);
      return true;
    },
    binned: () => inBin,
    onDesk: () => onDesk,
    held: () => held,
  };
}
