import { createTriggers } from '../../triggers';
import { defineRoomTrait } from '../room-trait';
import type {
  RoomTraitConfig,
  RoomTraitEvent,
  RoomTraitValue,
} from '../room-trait';

interface TimedEvent {
  at: number;
  event: RoomTraitEvent;
}

const record = (
  value: RoomTraitValue,
): value is Readonly<Record<string, RoomTraitValue>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the declaration when a room is entered, before its clock starts. */
function timedEvents(config: RoomTraitConfig): readonly TimedEvent[] {
  const entries = config.events;
  if (!Array.isArray(entries))
    throw new Error('timed-events: events must be an array');
  return entries.map((entry, index) => {
    if (!record(entry))
      throw new Error(`timed-events: event ${index} must be an object`);
    const { at, type, sender, text } = entry;
    if (typeof at !== 'number' || !Number.isFinite(at) || at < 0)
      throw new Error(`timed-events: event ${index} needs a nonnegative time`);
    if (
      type !== 'phone-message' ||
      typeof sender !== 'string' ||
      !sender.trim() ||
      typeof text !== 'string' ||
      !text.trim()
    )
      throw new Error(`timed-events: event ${index} needs a phone message`);
    return { at, event: { type, sender, text } };
  });
}

/** A room can schedule declared actions during each visit. */
export default defineRoomTrait({
  id: 'timed-events',
  reason:
    'A room schedules reusable actions at declared simulation times during each visit.',
  visit(config, context) {
    const events = timedEvents(config);
    const triggers = createTriggers(
      events.map((event, index) => ({
        id: String(index),
        when: { room: { atLeast: event.at } },
      })),
    );
    return {
      step(dt: number) {
        for (const id of triggers.step(dt))
          context.emit(events[Number(id)].event);
      },
    };
  },
});
