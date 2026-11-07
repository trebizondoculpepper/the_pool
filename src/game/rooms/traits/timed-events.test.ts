import { describe, expect, it } from 'vite-plus/test';
import dev71 from '../declarations/dev71';
import { createRoomTraitHost } from '../room-trait';
import timedEvents from './timed-events';

function trial() {
  const messages: { sender: string; text: string }[] = [];
  const host = createRoomTraitHost(
    { 'timed-events': timedEvents },
    { emit: (event) => messages.push(event) },
  );
  return { host, messages };
}

describe('timed-events room trait (#105)', () => {
  it('delivers dev71’s declared texts at 20 and 120 seconds of room time', () => {
    const { host, messages } = trial();
    host.enter('dev71', dev71.traits);
    host.step(19.9);
    expect(messages).toEqual([]);
    host.step(0.2);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain('20 seconds');
    host.step(98);
    expect(messages).toHaveLength(1);
    host.step(3);
    expect(messages).toHaveLength(2);
    expect(messages[1].text).toContain('two minutes');
    host.step(1000);
    expect(messages).toHaveLength(2);
  });

  it('stops while paused and restarts on a fresh visit', () => {
    const { host, messages } = trial();
    host.enter('dev71', dev71.traits);
    host.step(19);
    host.step(0);
    expect(messages).toEqual([]);
    host.leave();
    host.step(200);
    expect(messages).toEqual([]);
    host.enter('dev71', dev71.traits);
    host.step(20);
    expect(messages).toHaveLength(1);
    host.enter('dev71', dev71.traits);
    host.step(19);
    expect(messages).toHaveLength(1);
    host.step(1);
    expect(messages).toHaveLength(2);
    host.step(99);
    expect(messages).toHaveLength(2);
    host.step(1);
    expect(messages).toHaveLength(3);
  });

  it('works in another room with different declarative event times', () => {
    const { host, messages } = trial();
    host.enter('dev0', [
      {
        trait: 'timed-events',
        config: {
          events: [
            { at: 2, type: 'phone-message', sender: 'Test', text: 'Hello' },
          ],
        },
      },
    ]);
    host.step(2);
    expect(messages).toEqual([
      { type: 'phone-message', sender: 'Test', text: 'Hello' },
    ]);
  });

  it('rejects invalid declarations before starting a visit', () => {
    const { host } = trial();
    expect(() => host.enter('dev0', [{ trait: 'timed-events' }])).toThrow(
      /events must be an array/,
    );
    expect(() =>
      host.enter('dev0', [
        { trait: 'timed-events', config: { events: [{ at: -1 }] } },
      ]),
    ).toThrow(/nonnegative time/);
  });
});
