import { expect, it } from 'vite-plus/test';
import { eventsFrom, recentEvents } from './game-event';
import type { GameEvent } from './game-event';

const at = (time: number): GameEvent => ({
  time,
  kind: 'plant',
  severity: 'info',
  subject: '',
  text: `at ${time}`,
});

it('keeps the last game-day back from the newest event', () => {
  const log = [at(0), at(1000), at(90_000), at(100_000)];
  expect(recentEvents(log, 100_000).map((e) => e.time)).toEqual([
    90_000, 100_000,
  ]);
  expect(recentEvents(log, 200_000).map((e) => e.time)).toEqual([
    90_000, 100_000,
  ]);
});

it('keeps at most the limit, the newest', () => {
  const log = Array.from({ length: 50 }, (_, i) => at(i));
  const kept = recentEvents(log, 100, 86_400, 10);
  expect(kept).toHaveLength(10);
  expect(kept[9].time).toBe(49);
});

it('lets go of events after the world time (a reset or an upload)', () => {
  const log = [at(10), at(500), at(5000)];
  expect(recentEvents(log, 600).map((e) => e.time)).toEqual([10, 500]);
  expect(recentEvents(log, 0)).toEqual([]);
});

it('reads back only well-formed events, in time order', () => {
  const read = eventsFrom([
    at(5),
    { ...at(2), by: 'you' },
    { time: 'x', kind: 'plant', severity: 'info', subject: '', text: '' },
    { ...at(3), kind: 'nonsense' },
    { ...at(4), by: 7 },
    { ...at(6), extra: 'dropped' },
    null,
    'line',
  ]);
  expect(read).toEqual([{ ...at(2), by: 'you' }, at(5), at(6)]);
  expect(eventsFrom({ not: 'a list' })).toEqual([]);
});
