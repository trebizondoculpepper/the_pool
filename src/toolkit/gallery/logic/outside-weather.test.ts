import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../game/world';
import { estimatedReading } from '../../../game/weather';
import { outsideView } from './outside-weather';

describe('the bridge’s OUTSIDE CONDITIONS', () => {
  it('says NO DATA with no reading, and shows the world’s outside temperature', () => {
    const v = outsideView(newWorld());
    expect(v.estimated).toBe(true);
    expect(v.conditions).toBe('NO DATA');
    expect(v.ambient).toBe('12.0');
  });

  it('shows a live reading with its credit, and flags an estimate', () => {
    const base = estimatedReading(Date.UTC(2026, 10, 2, 1));
    let w = applyAction(newWorld(), {
      type: 'weather/reading',
      reading: { ...base, source: 'open-meteo', code: 0, windDirection: 348 },
    });
    const v = outsideView(w);
    expect(v.conditions).toBe('CLEAR SKY');
    expect(v.wind).toMatch(/NNW$/);
    expect(v.source).toMatch(/OPEN-METEO\.COM/);
    w = applyAction(w, {
      type: 'weather/reading',
      reading: { ...base, takenAt: base.takenAt + 1 },
    });
    expect(outsideView(w).conditions).toBe('NO DATA, ESTIMATED');
  });
});
