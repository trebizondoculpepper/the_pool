/**
 * Game and room timers, and the trigger component scenarios use (mission
 * 230, issue #104; the owner, 2026-11-07). Pure: no DOM, Three.js or room
 * code. It keeps two clocks in simulation seconds, the game timer (since
 * the game or scenario started) and the room timer (since the player last
 * entered a room, restarted on every entry), and evaluates rules against
 * them. It reports which rules fired and performs no action itself: the
 * scenario that owns it decides what a firing means (a phone text, say).
 *
 * Time passes only through `step(dt)`, so a paused game, which does not
 * step, stops both clocks. Room entry comes through `event`.
 *
 * Firing is edge-triggered. A rule fires when its condition becomes true,
 * not while it stays true. An `entered` condition is an event, not a level:
 * it is true only while the entry event itself is being evaluated, so a
 * rule on it fires at the entry and rearms only on a fresh entry.
 *
 * Policies:
 * - `'once'` (the default): the rule fires at most once until `reset()`.
 * - `{ every, max?, until? }`: the rule fires when its condition becomes
 *   true, then every `every` seconds of game time after that, on its own
 *   clock, whatever its condition does meanwhile, until it has fired `max`
 *   times or `until` holds when an occurrence falls due (or at its
 *   first firing). Once stopped, a fresh rising edge of its
 *   condition (a new entry, a room timer climbing again after an entry)
 *   starts it afresh with its count back at zero; a rising edge while it is
 *   still running changes nothing.
 *
 * When one step crosses several recurrence times, every due occurrence
 * fires, in time order, each reported separately; `until` is checked at
 * each occurrence against the clocks as they stood at that moment, so the
 * result does not depend on how time was cut into steps. Rules are
 * evaluated in the order given and never delay one another.
 */

/** A condition on the clocks or on room entry, or a combination of them. */
export type Condition<Room extends string = string> =
  | { game: { atLeast: number } }
  | { room: { atLeast: number } }
  | { entered: Room }
  | { all: readonly Condition<Room>[] }
  | { any: readonly Condition<Room>[] }
  | { not: Condition<Room> };

/** A recurring policy: every `every` seconds, at most `max` times, until `until`. */
export interface Recurrence<Room extends string = string> {
  every: number;
  max?: number;
  until?: Condition<Room>;
}

export type FirePolicy<Room extends string = string> =
  | 'once'
  | Recurrence<Room>;

export interface TriggerRule<Room extends string = string> {
  id: string;
  when: Condition<Room>;
  /** `'once'` when omitted. */
  fire?: FirePolicy<Room>;
}

/** Something that happened which conditions can see. */
export type TriggerEvent<Room extends string = string> = {
  type: 'entered';
  room: Room;
};

export interface TriggerClocks {
  /** Seconds since the start (or the last reset). */
  game: number;
  /** Seconds since the last room entry (or the start). */
  room: number;
}

export interface Triggers<Room extends string = string> {
  /** Advance both clocks by `dt` seconds; returns the ids fired, in order. */
  step(dt: number): string[];
  /** Report an event; returns the ids fired, in order. */
  event(e: TriggerEvent<Room>): string[];
  /** Clear firing history, counters and both clocks. */
  reset(): void;
  clocks(): TriggerClocks;
  /** Call `listener` with each fired id; returns a function that removes it. */
  onFire(listener: (id: string) => void): () => void;
}

/** What a condition is evaluated against. */
interface Moment<Room extends string> {
  game: number;
  room: number;
  /** The room entered by the event being evaluated, if any. */
  entered?: Room;
}

export function evaluate<Room extends string>(
  c: Condition<Room>,
  m: Moment<Room>,
): boolean {
  if ('game' in c) return m.game >= c.game.atLeast;
  if ('room' in c) return m.room >= c.room.atLeast;
  if ('entered' in c) return m.entered !== undefined && m.entered === c.entered;
  if ('all' in c) return c.all.every((x) => evaluate(x, m));
  if ('any' in c) return c.any.some((x) => evaluate(x, m));
  return !evaluate(c.not, m);
}

interface RuleState {
  /** The condition's value at the last evaluation, for edge detection. */
  was: boolean;
  /** A once rule has fired. */
  spent: boolean;
  /** A recurring rule is running. */
  running: boolean;
  /** Firings since it last started. */
  count: number;
  /** Game time of its next occurrence while running. */
  nextAt: number;
}

const fresh = (): RuleState => ({
  was: false,
  spent: false,
  running: false,
  count: 0,
  nextAt: 0,
});

export function createTriggers<Room extends string = string>(
  rules: readonly TriggerRule<Room>[],
): Triggers<Room> {
  for (const r of rules) {
    const p = r.fire;
    if (
      p !== undefined &&
      p !== 'once' &&
      !(Number.isFinite(p.every) && p.every > 0)
    ) {
      throw new Error(
        `trigger ${r.id}: every must be a positive number of seconds`,
      );
    }
  }
  let game = 0;
  let room = 0;
  let states = rules.map(fresh);
  const listeners = new Set<(id: string) => void>();

  /** Evaluate every rule at the moment `m`, appending firings to `out`. */
  const evaluateAll = (m: Moment<Room>, out: string[]): void => {
    rules.forEach((rule, i) => {
      const s = states[i];
      const now = evaluate(rule.when, m);
      const rising = now && !s.was;
      s.was = now;
      const p = rule.fire ?? 'once';
      if (p === 'once') {
        if (rising && !s.spent) {
          s.spent = true;
          out.push(rule.id);
        }
        return;
      }
      if (!rising || s.running) return;
      if (p.until && evaluate(p.until, m)) return;
      s.count = 1;
      out.push(rule.id);
      s.running = p.max === undefined || p.max > 1;
      s.nextAt = m.game + p.every;
    });
  };

  const notify = (ids: string[]): string[] => {
    for (const id of ids) for (const l of listeners) l(id);
    return ids;
  };

  return {
    step(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return [];
      game += dt;
      room += dt;
      const due: { at: number; order: number; id: string }[] = [];
      rules.forEach((rule, i) => {
        const s = states[i];
        const p = rule.fire;
        if (!s.running || p === undefined || p === 'once') return;
        while (s.running && s.nextAt <= game) {
          const at = s.nextAt;
          const m = { game: at, room: room - (game - at) };
          if (p.until && evaluate(p.until, m)) {
            s.running = false;
            break;
          }
          s.count += 1;
          due.push({ at, order: i, id: rule.id });
          s.nextAt = at + p.every;
          if (p.max !== undefined && s.count >= p.max) s.running = false;
        }
      });
      due.sort((a, b) => a.at - b.at || a.order - b.order);
      const out = due.map((d) => d.id);
      evaluateAll({ game, room }, out);
      return notify(out);
    },
    event(e) {
      room = 0;
      const out: string[] = [];
      evaluateAll({ game, room, entered: e.room }, out);
      // The entry is over: event conditions fall back to false, so a rule on
      // one rearms for the next entry, and level conditions see the new room
      // timer. Nothing fires here, since nothing rises by an event ending.
      const after: string[] = [];
      evaluateAll({ game, room }, after);
      return notify(out.concat(after));
    },
    reset() {
      game = 0;
      room = 0;
      states = rules.map(fresh);
    },
    clocks: () => ({ game, room }),
    onFire(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
