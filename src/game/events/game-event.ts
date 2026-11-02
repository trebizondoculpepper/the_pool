/**
 * The game's event log (`doc/prompts/done/058-developer-console.md`): a line for
 * everything done to the model and everything the plant does by itself,
 * as a plant logbook would keep it. The console shows it. It is not part
 * of the world and not in its save (no `WORLD_VERSION` for it): each save
 * slot keeps its recent log beside its save in the browser
 * (`world-store.ts`, the owner, 2026-11-02), the last game-day of it
 * (`recentEvents`), so the console shows what went on before a reload, and
 * a state file carries it for debugging. Pure.
 */

export type GameEventKind = 'action' | 'plant' | 'command' | 'system';
export type GameEventSeverity = 'info' | 'notice' | 'alarm';

export interface GameEvent {
  /** World seconds when it happened. */
  time: number;
  kind: GameEventKind;
  severity: GameEventSeverity;
  /** What it happened to: a tag, an id or a room; '' for none. */
  subject: string;
  text: string;
  /**
   * Who did it, where the world knows: for actions the player's hand
   * ('you') or the console; for the plant, what moved it ('AUTO,
   * Wash-O-Tron wash', 'spring return, actuator unpowered').
   */
  by?: string;
}

/** The lines a log keeps, newest last. */
export const EVENT_LOG_LINES = 2000;

/** `events` with `more` appended, the oldest let go past `limit`. */
export function appendEvents(
  events: readonly GameEvent[],
  more: readonly GameEvent[],
  limit = EVENT_LOG_LINES,
): readonly GameEvent[] {
  if (!more.length) return events;
  const all = [...events, ...more];
  return all.length > limit ? all.slice(all.length - limit) : all;
}

/** How far back a kept log reaches: one game-day, world seconds. */
export const EVENT_LOG_WINDOW = 86_400;

/**
 * The part of a log worth keeping at world time `now`: the events of the
 * last `window` world seconds back from the newest of them, none after
 * `now` (a log from a later world, before a reset or an upload, is let
 * go), and at most `limit` of them, the newest.
 */
export function recentEvents(
  events: readonly GameEvent[],
  now: number,
  window = EVENT_LOG_WINDOW,
  limit = EVENT_LOG_LINES,
): GameEvent[] {
  const kept = events.filter((e) => e.time <= now);
  const newest = kept.length ? kept[kept.length - 1].time : now;
  const recent = kept.filter((e) => e.time >= newest - window);
  return recent.length > limit ? recent.slice(recent.length - limit) : recent;
}

const KINDS: readonly string[] = ['action', 'plant', 'command', 'system'];
const SEVERITIES: readonly string[] = ['info', 'notice', 'alarm'];

/** Whether `e` is a well-formed event, as read back from storage or a file. */
export function isGameEvent(e: unknown): e is GameEvent {
  if (!e || typeof e !== 'object') return false;
  const v = e as Record<string, unknown>;
  return (
    typeof v.time === 'number' &&
    Number.isFinite(v.time) &&
    typeof v.kind === 'string' &&
    KINDS.includes(v.kind) &&
    typeof v.severity === 'string' &&
    SEVERITIES.includes(v.severity) &&
    typeof v.subject === 'string' &&
    typeof v.text === 'string' &&
    (v.by === undefined || typeof v.by === 'string')
  );
}

/** A stored or uploaded log: its well-formed events, in time order; [] for anything else. */
export function eventsFrom(data: unknown): GameEvent[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(isGameEvent)
    .map((e) => ({
      time: e.time,
      kind: e.kind,
      severity: e.severity,
      subject: e.subject,
      text: e.text,
      ...(e.by === undefined ? {} : { by: e.by }),
    }))
    .sort((a, b) => a.time - b.time);
}

/** World seconds as a clock, `hh:mm:ss`, hours running on past 24. */
export function worldClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
}

/** One line of the log: the clock, the subject, the text, and who. */
export function formatEvent(e: GameEvent) {
  const who = e.by ? ` (by ${e.by})` : '';
  const subject = e.subject ? `${e.subject.padEnd(12)}  ` : '';
  return `${worldClock(e.time)}  ${subject}${e.text}${who}`;
}

/** The log as a text file, for `condump`: a header, then a line each. */
export function formatDump(
  events: readonly GameEvent[],
  header: readonly string[],
) {
  return [...header, '', ...events.map(formatEvent), ''].join('\n');
}
