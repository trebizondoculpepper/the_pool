import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../../../../game/world';
import { plantReadingOf } from '../world-reading';
import { ALARM_SOURCES } from './sources/alarms';

describe('ALARM_SOURCES, probed', () => {
  it('mains-fail comes in from the incoming supply, and its window goes through ISA sequence M', () => {
    expect(ALARM_SOURCES['mains-fail']).toEqual(['switch_room/node:incoming']);
    let w = newWorld();
    w = stepWorld(w, 1);
    expect(w.annunciator.windows['mains-fail']).toBe('off');
    w = stepWorld(
      applyAction(w, { type: 'plant/source', utility: 'power', on: false }),
      1,
    );
    expect(plantReadingOf(w, 'pool_03').alarms).toContain('mains-fail');
    expect(w.annunciator.windows['mains-fail']).toBe('flashing');
    w = applyAction(w, { type: 'alarms/accept' });
    expect(w.annunciator.windows['mains-fail']).toBe('steady');
    w = stepWorld(
      applyAction(w, { type: 'plant/source', utility: 'power', on: true }),
      1,
    );
    w = applyAction(w, { type: 'alarms/reset' });
    expect(w.annunciator.windows['mains-fail']).toBe('off');
  });
});
