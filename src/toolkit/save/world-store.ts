import { computed, signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { STEP, advance, applyAction, newWorld } from '../../game/world';
import type { World, WorldAction } from '../../game/world';
import {
  CATCH_UP_LIMIT,
  catchUpSeconds,
  deserialiseWorld,
  serialiseWorld,
} from '../../game/save';
import { clockStopped, paused } from '../controls/logic/paused';
import {
  appendEvents,
  eventsFrom,
  recentEvents,
} from '../../game/events/game-event';
import type { GameEvent } from '../../game/events/game-event';
import { actionEvents } from '../../game/events/describe-action';
import { collectEvents } from '../../game/events/event-sources';

/**
 * The world, kept and saved in the browser: one per save slot, shared by
 * every room on the page. It runs on its own clock whichever room is
 * showing, saves itself to localStorage every ten seconds, when the tab
 * is hidden and when the page goes, and on opening loads the slot's save
 * and catches up the time it was away (up to an hour).
 *
 * - **Two slots in storage**: each save first moves the last one to
 *   `…:previous`, so a write cut off halfway loses nothing.
 * - **An unreadable save** is kept aside under `…:unreadable` and a new
 *   world started, with a notice.
 * - **No storage** (some private windows): it runs unsaved, and says so.
 * - **Two tabs**: the first to open a slot holds it (the Web Locks API)
 *   and saves; another tab follows what the first saves and does not save
 *   itself. Its own actions apply at once and are sent to the holder
 *   (`BroadcastChannel`), which applies and saves them, so they are not
 *   undone by its next save; and when the holder goes, a follower takes
 *   the slot up.
 *
 * - **The event log** (the owner, 2026-11-02) is kept beside the save, under
 *   `…:events`, not in it: its last game-day, at most 2000 lines
 *   (`recentEvents`), written by the tab holding the slot at most every
 *   five seconds and when the tab is hidden or the page goes, so the
 *   console shows what went on before a reload. Lines from after the
 *   loaded world's time (a save reset or uploaded) are let go; a reset
 *   clears it, and an upload replaces it with the file's.
 *
 * localStorage, not IndexedDB, because a save is small and its write is
 * synchronous: one made as the page goes is not cut off.
 */

export interface WorldStore {
  readonly world: ReadonlySignal<World>;
  /** Do `action` to the world, logged as done by `by` (the player's hand unless said). */
  dispatch(action: WorldAction, by?: 'you' | 'console'): void;
  /**
   * The event log (`doc/prompts/done/058-developer-console.md`): a line for each
   * action and for each thing the plant did by itself, the newest last;
   * its last game-day kept beside the slot's save (`…:events`).
   */
  readonly events: ReadonlySignal<readonly GameEvent[]>;
  /** Add lines of one's own to the log (the console's commands). */
  log(...events: GameEvent[]): void;
  /** A part's view of something in the world, tracked. */
  read<T>(pick: (world: World) => T): ReadonlySignal<T>;
  /** Save now, if this tab holds the slot: whether it was saved. */
  save(): boolean;
  /**
   * Whether this tab holds the slot and saves it. Another tab with the
   * game open may hold it instead; this one then follows it, and does not
   * save.
   */
  readonly holding: ReadonlySignal<boolean>;
  /** Start again from a new world, discarding the save. */
  reset(): void;
  /** Anything the player should know: unsaved, or another tab has it. */
  readonly notice: ReadonlySignal<string | null>;
}

/** An action done in a follower tab, sent to the tab holding the slot. */
interface RelayedAction {
  action: WorldAction;
  by?: 'you' | 'console';
}

const SAVE_EVERY = 10_000;
/** The event log is written at most this often, ms (and when the page goes). */
const EVENTS_EVERY = 5_000;
const key = (slot: string) => `pool-plant:${slot}`;
const eventsKey = (slot: string) => `${key(slot)}:events`;

/** A slot's stored event log, its well-formed lines; [] if none or unreadable. */
function storedEvents(s: Storage | null, slot: string): GameEvent[] {
  try {
    const text = s?.getItem(eventsKey(slot));
    return text ? eventsFrom(JSON.parse(text)) : [];
  } catch {
    return [];
  }
}

/**
 * Keep a slot's event log: if storage is full, the older half let go and
 * tried once more; if that fails too, not kept (the game goes on).
 */
function writeEvents(
  s: Storage | null,
  slot: string,
  events: readonly GameEvent[],
) {
  if (!s) return;
  try {
    s.setItem(eventsKey(slot), JSON.stringify(events));
  } catch {
    try {
      s.setItem(
        eventsKey(slot),
        JSON.stringify(events.slice(Math.floor(events.length / 2))),
      );
    } catch {
      // No room: the log is not kept this time.
    }
  }
}

/** localStorage, or nothing if it is blocked. */
function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = 'pool-plant:probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const stores = new Map<string, WorldStore>();
/** Each open slot's way to take up an uploaded save in this tab. */
const imported = new Map<string, (text: string) => void>();

/**
 * The save slots kept in this browser (the dev panel's download and
 * upload, the owner, 2026-11-01): `dev`, the player's own, always, and any other
 * slot with a save, but not their backups.
 */
export function listSlots(): string[] {
  const s = storage();
  const found = new Set(['dev']);
  if (s)
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i) ?? '';
      const m = /^pool-plant:([^:]+)$/.exec(k);
      if (m && s.getItem(k)?.includes('"pool-plant-save"')) found.add(m[1]);
    }
  return [...found];
}

/**
 * A slot's save as a file's text, for inspection or debugging: the world
 * this tab is running for it if it has the slot open (so it is current),
 * else what is stored; null if the slot has no save.
 */
export function exportSlot(slot: string): string | null {
  const open = stores.get(slot);
  if (open) return serialiseWorld(open.world.value, Date.now());
  return storage()?.getItem(key(slot)) ?? null;
}

/**
 * A slot's recent event log, for a state file: this tab's if it has the
 * slot open, else what is stored; its last game-day.
 */
export function exportSlotEvents(slot: string): GameEvent[] {
  const open = stores.get(slot);
  if (open) return recentEvents(open.events.value, open.world.value.time);
  return recentEvents(storedEvents(storage(), slot), Infinity);
}

/**
 * Put an uploaded save into a slot: read and migrated as on loading, and
 * refused with the reason if it cannot be; the slot's last save kept as
 * its `:previous`; dated now, so it is not caught up for the time since it
 * was made; and taken up by every tab with the slot open, this one too.
 */
export function importSlot(
  slot: string,
  text: string,
  events: readonly GameEvent[] | null = null,
): { ok: true } | { ok: false; reason: string } {
  const loaded = deserialiseWorld(text);
  if (!loaded.ok) return loaded;
  const s = storage();
  if (!s) return { ok: false, reason: 'storage is blocked here' };
  const fresh = serialiseWorld(loaded.world, Date.now());
  try {
    const last = s.getItem(key(slot));
    if (last) s.setItem(`${key(slot)}:previous`, last);
    s.setItem(key(slot), fresh);
    // Its log: the file's, or none (the old one is another world's).
    if (events) writeEvents(s, slot, recentEvents(events, loaded.world.time));
    else s.removeItem(eventsKey(slot));
    // Other tabs hear this; one whose value is unchanged would not, so
    // it is removed again once heard.
    s.setItem(`${key(slot)}:import`, fresh);
    s.removeItem(`${key(slot)}:import`);
  } catch {
    return { ok: false, reason: 'storage is full' };
  }
  imported.get(slot)?.(fresh);
  return { ok: true };
}

/** The world kept in save slot `slot` ("game", or "dev" for the dev rooms). */
export function worldStore(slot: string): WorldStore {
  let store = stores.get(slot);
  if (!store) {
    store = openWorldStore(slot);
    stores.set(slot, store);
  }
  return store;
}

/**
 * The world a room reads and works: the player's (the dev rooms' save
 * slot), or, while one is set (`setRoomWorld`), another, such as the
 * title's attract sequence's scenario (`doc/prompts/done/054-title-attract-sequence.md`).
 * Rooms take their world from here, never from a save slot by name, so a
 * room built for the attract sequence reads and acts on the attract
 * sequence's world, and the player's never sees it.
 */
const roomOverride = signal<WorldStore | null>(null);
export function roomWorld(): WorldStore {
  return roomOverride.value ?? worldStore(devSlot() ?? 'dev');
}

/**
 * In development only, a save slot of its own named by the URL (`?slot=itest`):
 * a test's world, kept apart from the player's and from any other tab
 * holding theirs.
 */
function devSlot(): string | null {
  if (typeof window === 'undefined' || !import.meta.env?.DEV) return null;
  const search = window.location?.search;
  if (!search) return null;
  const slot = new URLSearchParams(search).get('slot');
  return slot && /^[a-z0-9-]{1,24}$/.test(slot) ? slot : null;
}
// For trying the world from the console in development only:
// `poolWorld.store().dispatch({ type: 'jacuzzi/cabinet', action: { act: 'power', on: false } })`.
if (typeof window !== 'undefined' && import.meta.env?.DEV)
  (window as unknown as { poolWorld?: unknown }).poolWorld = {
    store: roomWorld,
  };
/** Rooms' world from now on: `store`, or, with null, the player's again. */
export function setRoomWorld(store: WorldStore | null) {
  roomOverride.value = store;
}

/**
 * A world held in memory only, from `start`: never loaded, never saved,
 * held by no tab, its clock its own (run while `running` is set), so it
 * runs while the game is paused behind the title. The attract sequence's.
 */
export function createScenarioStore(start: World) {
  const world = signal(start);
  const holding = signal(false);
  const notice = signal<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;
  let last = 0;
  const events = signal<readonly GameEvent[]>([]);
  const store: WorldStore & { run(on: boolean): void; stop(): void } = {
    world,
    // Its own log, which nothing shows: never the player's.
    dispatch(action, by) {
      const before = world.value;
      world.value = applyAction(before, action);
      events.value = appendEvents(
        events.value,
        actionEvents(before, action, world.value, by),
      );
    },
    events,
    log(...more) {
      events.value = appendEvents(events.value, more);
    },
    read: (pick) => computed(() => pick(world.value)),
    save: () => false,
    holding,
    reset() {
      world.value = start;
    },
    notice,
    run(on) {
      if (on && !timer) {
        last = Date.now();
        timer = setInterval(() => {
          const now = Date.now();
          const elapsed = Math.min(1, Math.max(0, (now - last) / 1000));
          last = now;
          if (elapsed > 0) world.value = advance(world.value, elapsed);
        }, STEP * 1000);
      } else if (!on && timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    stop() {
      store.run(false);
    },
  };
  return store;
}

function openWorldStore(slot: string): WorldStore {
  const s = storage();
  const notice = signal<string | null>(
    s ? null : 'Storage is blocked here: this game will not be saved.',
  );
  const load = (): World => {
    const text = s?.getItem(key(slot));
    if (!text) return newWorld();
    const loaded = deserialiseWorld(text);
    if (!loaded.ok) {
      try {
        s?.setItem(`${key(slot)}:unreadable`, text);
      } catch {
        // No room to keep it aside: it is lost.
      }
      notice.value = `The saved game could not be loaded (${loaded.reason}): starting afresh.`;
      return newWorld();
    }
    return advance(loaded.world, catchUpSeconds(loaded.savedAt, Date.now()));
  };
  const world = signal(load());
  // The log kept from before (a reload): none from after the world's time.
  const events = signal<readonly GameEvent[]>(
    recentEvents(storedEvents(s, slot), world.value.time),
  );
  let eventsSaved = events.value;
  let lastEventsSave = 0;
  /** Keep the log, if this tab holds the slot and it has changed: at most every few seconds unless `now`. */
  const saveEvents = (now = false) => {
    if (!s || !holding.value || events.value === eventsSaved) return;
    const t = Date.now();
    if (!now && t - lastEventsSave < EVENTS_EVERY) return;
    lastEventsSave = t;
    eventsSaved = events.value;
    writeEvents(s, slot, recentEvents(events.value, world.value.time));
  };
  // Whether this tab holds the slot. Without Web Locks, assume so.
  const holding = signal(!('locks' in navigator));
  let release: () => void = () => {};
  const hold = () => {
    holding.value = true;
    notice.value = null;
    return new Promise<void>((resolve) => (release = resolve));
  };
  if ('locks' in navigator)
    void navigator.locks.request(key(slot), { ifAvailable: true }, (lock) => {
      if (lock) return hold();
      notice.value =
        'Pool Plant is open in another tab: this one follows it and does not save.';
      // Held by this tab once the other lets it go (closed or reloaded).
      void navigator.locks.request(key(slot), hold);
    });
  // A follower's actions, sent to the holder to apply and save (the owner,
  // 2026-10-27: the bridge's RESET, pressed in a follower tab, was undone
  // by the holder's next save, so its displays came back on).
  const channel =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel(key(slot));
  /** An uploaded save, taken up here, and saved if this tab holds the slot. */
  const takeImported = (text: string) => {
    const loaded = deserialiseWorld(text);
    if (!loaded.ok) return;
    world.value = loaded.world;
    // The uploaded file's log, put beside its save by `importSlot`.
    events.value = appendEvents(storedEvents(s, slot), [
      {
        time: loaded.world.time,
        kind: 'system',
        severity: 'notice',
        subject: 'SAVE',
        text: 'world replaced by a save uploaded on the dev panel',
      },
    ]);
    save();
  };
  imported.set(slot, takeImported);
  const save = () => {
    if (!s || !holding.value) return false;
    try {
      const last = s.getItem(key(slot));
      if (last) s.setItem(`${key(slot)}:previous`, last);
      s.setItem(key(slot), serialiseWorld(world.value, Date.now()));
      return true;
    } catch {
      notice.value = 'The game could not be saved (storage is full).';
      return false;
    }
  };
  // The clock: real time, in fixed steps. A hidden tab's timers slow to
  // once a second or less; whatever time passed is caught up when it ticks.
  let last = Date.now();
  let lastSave = last;
  const tick = () => {
    const now = Date.now();
    const elapsed = Math.min(CATCH_UP_LIMIT, Math.max(0, (now - last) / 1000));
    last = now;
    // Paused behind the menu, or by the console: the clock stands still (`paused.ts`).
    if (paused.value || clockStopped.value) return;
    if (elapsed > 0) {
      const found: GameEvent[] = [];
      world.value = advance(world.value, elapsed, STEP, (before, after) =>
        collectEvents(before, after, undefined, found),
      );
      events.value = appendEvents(events.value, found);
    }
    if (now - lastSave >= SAVE_EVERY) {
      lastSave = now;
      save();
    }
    saveEvents();
  };
  setInterval(tick, STEP * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      save();
      saveEvents(true);
    } else tick();
  });
  window.addEventListener('pagehide', () => {
    save();
    saveEvents(true);
    release();
  });
  // A save uploaded on the dev panel (`importSlot`), in this tab or
  // another: every tab with the slot open takes it up, the holder saving it.
  window.addEventListener('storage', (event) => {
    if (event.key !== `${key(slot)}:import` || !event.newValue) return;
    takeImported(event.newValue);
  });
  // A follower tab takes up what the holder saves.
  window.addEventListener('storage', (event) => {
    if (holding.value || event.key !== key(slot) || !event.newValue) return;
    const loaded = deserialiseWorld(event.newValue);
    if (!loaded.ok) return;
    world.value = loaded.world;
    // Said in the log: the world here is the other tab's.
    events.value = appendEvents(events.value, [
      {
        time: loaded.world.time,
        kind: 'system',
        severity: 'notice',
        subject: 'SAVE',
        text: 'world taken up from the game open in another tab (it holds the save)',
      },
    ]);
  });
  const apply = (action: WorldAction, by?: 'you' | 'console') => {
    const before = world.value;
    world.value = applyAction(before, action);
    events.value = appendEvents(
      events.value,
      actionEvents(before, action, world.value, by),
    );
    // Saved at once: an action is what a player would mind losing.
    save();
  };
  channel?.addEventListener('message', (event: MessageEvent) => {
    if (!holding.value) return;
    const { action, by } = event.data as RelayedAction;
    apply(action, by);
  });
  return {
    world,
    dispatch(action, by) {
      apply(action, by);
      // Not holding: applied here at once, and by the holder for keeps.
      if (!holding.value) channel?.postMessage({ action, by });
    },
    events,
    log(...more) {
      events.value = appendEvents(events.value, more);
    },
    read: (pick) => computed(() => pick(world.value)),
    save,
    holding,
    reset() {
      world.value = newWorld();
      events.value = eventsSaved = [];
      try {
        s?.removeItem(eventsKey(slot));
      } catch {
        // Blocked: nothing was kept.
      }
      last = Date.now();
      lastSave = last;
      save();
    },
    notice,
  };
}
