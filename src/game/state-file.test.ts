import { expect, it } from 'vite-plus/test';
import { newWorld } from './world';
import { deserialiseWorld, serialiseWorld } from './save';
import { bugReportUrl, saveFromFile, stateFile } from './state-file';

const meta = {
  game: { version: '0.11.0', build: 'abc1234', slot: 'game' },
  exported: '2026-11-01T16:00:00.000Z',
  worldTime: 3600,
  location: '?room=plant_pool_01&x=1&z=2',
  environment: {
    userAgent: 'iPad Safari',
    platform: 'iPad',
    language: 'en-GB',
    screen: { width: 1024, height: 1366, pixelRatio: 2 },
    touchPoints: 5,
    settings: { graphics: 'medium' },
  },
};

it('records a save with its metadata, and restores only the save', () => {
  const save = serialiseWorld(newWorld(), 1);
  const file = stateFile(save, meta);
  const parsed = JSON.parse(file);
  expect(parsed.format).toBe('pool-plant-state');
  expect(parsed.environment.userAgent).toBe('iPad Safari');
  const back = saveFromFile(file);
  expect(back.location).toBe('?room=plant_pool_01&x=1&z=2');
  const loaded = deserialiseWorld(back.save);
  expect(loaded.ok).toBe(true);
  // An older file, with no log: none restored.
  expect(back.events).toBeNull();
});

it('keeps the recent log and commands, and restores the well-formed log', () => {
  const save = serialiseWorld(newWorld(), 1);
  const event = {
    time: 12,
    kind: 'action' as const,
    severity: 'info' as const,
    subject: 'PL1-V1',
    text: 'opened',
    by: 'you',
  };
  const commands = Array.from({ length: 150 }, (_, i) => `cmd ${i}`);
  const file = stateFile(save, meta, { events: [event], commands });
  const parsed = JSON.parse(file);
  expect(parsed.commands).toHaveLength(100);
  expect(parsed.commands[99]).toBe('cmd 149');
  parsed.events.push({ time: 'later', text: 'broken' });
  expect(saveFromFile(JSON.stringify(parsed)).events).toEqual([event]);
});

it('takes a bare save as it is, and leaves nonsense to the save reader', () => {
  const save = serialiseWorld(newWorld(), 1);
  expect(saveFromFile(save)).toEqual({ save, location: null, events: null });
  expect(deserialiseWorld(saveFromFile('nonsense').save).ok).toBe(false);
});

it('prefills a GitHub issue with the record, asking for the file', () => {
  const url = new URL(
    bugReportUrl('https://github.com/o/r', meta, 'the-pool-game.json'),
  );
  expect(url.pathname).toBe('/o/r/issues/new');
  expect(url.searchParams.get('labels')).toBe('bug');
  const body = url.searchParams.get('body')!;
  expect(body).toContain('the-pool-game.json');
  expect(body).toContain('0.11.0 (build abc1234)');
  expect(body).toContain('1 h 0 min');
  expect(body).toContain('?room=plant_pool_01');
  expect(body).toContain('iPad Safari');
  expect(body).toContain('recent console commands');
});
