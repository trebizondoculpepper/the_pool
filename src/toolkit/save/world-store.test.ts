import { afterEach, expect, it, vi } from 'vite-plus/test';
import { newWorld, applyAction } from '../../game/world';
import { deserialiseWorld, serialiseWorld } from '../../game/save';
import {
  exportSlot,
  exportSlotEvents,
  importSlot,
  listSlots,
  worldStore,
} from './world-store';
import { createGameSession } from './game-session';
import { healthFaults } from '../../game/health';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('Continue preserves a saved fault and position; New Game resets and saves a nominal world', () => {
  vi.useFakeTimers();
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
  vi.stubGlobal('window', { localStorage: storage, addEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn() });
  vi.stubGlobal('navigator', {});
  const damaged = applyAction(newWorld(), { type: 'plant/full-off' });
  damaged.pools.pool_03.level = -0.5;
  damaged.pools.pool_03.temperature = 20;
  damaged.pools.pool_03.ph = 8.2;
  storage.setItem(
    'pool-plant:new-game-test',
    serialiseWorld(damaged, Date.now()),
  );
  const store = worldStore('new-game-test');
  const session = createGameSession(store, storage);
  const position = '?room=plant_pool_03&x=1&y=2&z=3&yaw=90&pitch=-10&zoom=1';
  session.remember(position);
  const reopened = createGameSession(store, storage);
  expect(reopened.resume()).toBe(position);
  expect(store.world.value).toEqual(damaged);
  // The damaged save is unhealthy by the contract (mission 067)…
  expect(healthFaults(store.world.value).length).toBeGreaterThan(0);
  expect(reopened.start()).toBe('?room=pool_04');
  expect(store.world.value).toEqual(newWorld());
  // …and New Game's is healthy.
  expect(healthFaults(store.world.value)).toEqual([]);
  const saved = deserialiseWorld(storage.getItem('pool-plant:new-game-test')!);
  expect(saved.ok && saved.world).toEqual(newWorld());
  expect(createGameSession(store, storage).resume()).toBe('?room=pool_04');
});

it('a console simulation reset saves defaults without replacing the Continue position', () => {
  vi.useFakeTimers();
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
  vi.stubGlobal('window', { localStorage: storage, addEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn() });
  vi.stubGlobal('navigator', {});
  const store = worldStore('console-reset-test');
  const session = createGameSession(store, storage);
  const position = '?room=plant_pool_03&x=1&y=2&z=3&yaw=90&pitch=-10';
  session.remember(position);
  store.dispatch({ type: 'plant/full-off' }, 'console');
  store.dispatch({ type: 'simulation/reset' }, 'console');
  expect(store.world.value).toEqual(newWorld());
  expect(createGameSession(store, storage).resume()).toBe(position);
  const saved = deserialiseWorld(
    storage.getItem('pool-plant:console-reset-test')!,
  );
  expect(saved.ok && saved.world).toEqual(newWorld());
});

it('does not replay scenario parameters or bad coordinates on Continue', () => {
  const reset = vi.fn();
  const session = createGameSession({ reset }, null);
  expect(session.resume()).toBeNull();
  session.remember('?room=pool_02&x=NaN&z=3&scenario=cold');
  expect(session.resume()).toBe('?room=pool_02&z=3');
  expect(reset).not.toHaveBeenCalled();
  session.start();
  expect(reset).toHaveBeenCalledTimes(1);
});

it('downloads a slot and uploads one: validated, the last kept, the open world replaced', () => {
  vi.useFakeTimers();
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
  };
  vi.stubGlobal('window', { localStorage: storage, addEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn() });
  vi.stubGlobal('navigator', {});
  const theirs = applyAction(newWorld(), { type: 'plant/full-off' });
  theirs.pools.pool_01.ph = 7.9;
  storage.setItem('pool-plant:transfer-a', serialiseWorld(theirs, Date.now()));
  // A slot not open here: its stored save, as stored.
  expect(exportSlot('transfer-a')).toBe(
    storage.getItem('pool-plant:transfer-a'),
  );
  expect(exportSlot('nothing-here')).toBeNull();
  expect(listSlots()).toEqual(
    expect.arrayContaining(['game', 'dev', 'transfer-a']),
  );
  // Uploaded into an open slot: the world there replaced, the last kept.
  const store = worldStore('transfer-b');
  const before = storage.getItem('pool-plant:transfer-b');
  expect(importSlot('transfer-b', exportSlot('transfer-a')!)).toEqual({
    ok: true,
  });
  expect(store.world.value.pools.pool_01.ph).toBe(7.9);
  if (before)
    expect(storage.getItem('pool-plant:transfer-b:previous')).toBe(before);
  expect(storage.getItem('pool-plant:transfer-b:import')).toBeNull();
  // Nonsense is refused, and nothing is changed.
  const now = storage.getItem('pool-plant:transfer-b');
  expect(importSlot('transfer-b', '{"not":"a save"}').ok).toBe(false);
  expect(importSlot('transfer-b', 'garbage').ok).toBe(false);
  expect(storage.getItem('pool-plant:transfer-b')).toBe(now);
});

it('keeps the event log beside the save: restored, written, reset and uploaded', () => {
  vi.useFakeTimers();
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
  };
  const listeners = new Map<string, () => void>();
  vi.stubGlobal('window', { localStorage: storage, addEventListener: vi.fn() });
  vi.stubGlobal('document', {
    addEventListener: (type: string, f: () => void) => listeners.set(type, f),
    visibilityState: 'hidden',
  });
  vi.stubGlobal('navigator', {});
  const world = newWorld();
  world.time = 1000;
  storage.setItem('pool-plant:log-test', serialiseWorld(world, Date.now()));
  const line = (time: number, text: string) => ({
    time,
    kind: 'plant' as const,
    severity: 'info' as const,
    subject: '',
    text,
  });
  storage.setItem(
    'pool-plant:log-test:events',
    JSON.stringify([
      line(500, 'before'),
      { time: 'bad' },
      line(5000, 'from a later world'),
    ]),
  );
  const store = worldStore('log-test');
  // Restored: the well-formed lines, none after the world's time.
  expect(store.events.value.map((e) => e.text)).toEqual(['before']);
  store.dispatch({ type: 'plant/full-off' }, 'console');
  // Written when the tab is hidden (and every few seconds).
  listeners.get('visibilitychange')!();
  const kept = JSON.parse(storage.getItem('pool-plant:log-test:events')!);
  expect(kept.length).toBe(store.events.value.length);
  expect(kept.length).toBeGreaterThan(1);
  expect(exportSlotEvents('log-test')[0].text).toBe('before');
  // A reset lets it all go.
  store.reset();
  expect(store.events.value).toEqual([]);
  expect(storage.getItem('pool-plant:log-test:events')).toBeNull();
  // An upload brings its own log, or none.
  const uploaded = serialiseWorld(world, Date.now());
  importSlot('log-test', uploaded, [line(900, 'uploaded')]);
  expect(store.events.value[0].text).toBe('uploaded');
  importSlot('log-test', uploaded);
  expect(storage.getItem('pool-plant:log-test:events')).toBeNull();
  expect(store.events.value.map((e) => e.subject)).toEqual(['SAVE']);
});
