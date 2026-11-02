import { describe, expect, it } from 'vite-plus/test';
import {
  ANNUNCIATOR_BLEEP_HZ,
  ANNUNCIATOR_BLEEP_SD_HZ,
  annunciatorBleeper,
} from './annunciator-bleeper';

describe('annunciator bleeper tuning', () => {
  it('keeps each physical board stable, with separate timing', () => {
    const keys = [
      'control_room:central',
      'control_room:pool_01',
      'control_room:pool_02',
      'control_room:wet_hall',
    ];
    const voices = keys.map(annunciatorBleeper);
    expect(annunciatorBleeper(keys[0])).toEqual(voices[0]);
    expect(new Set(voices.map((voice) => voice.hz)).size).toBe(keys.length);
    expect(new Set(voices.map((voice) => voice.startDelay)).size).toBe(
      keys.length,
    );
    for (const voice of voices) {
      expect(voice.pulseHz).toBeGreaterThan(1.9);
      expect(voice.pulseHz).toBeLessThan(2.1);
      expect(voice.startDelay).toBeGreaterThanOrEqual(0);
      expect(voice.startDelay).toBeLessThan(0.5);
    }
  });

  it('has a 10 Hz pitch standard deviation across installation keys', () => {
    const pitches = Array.from(
      { length: 10_000 },
      (_, i) => annunciatorBleeper(`installation-${i}`).hz,
    );
    const mean =
      pitches.reduce((sum, pitch) => sum + pitch, 0) / pitches.length;
    const variance =
      pitches.reduce((sum, pitch) => sum + (pitch - mean) ** 2, 0) /
      pitches.length;
    expect(mean).toBeCloseTo(ANNUNCIATOR_BLEEP_HZ, 0);
    expect(Math.sqrt(variance)).toBeCloseTo(ANNUNCIATOR_BLEEP_SD_HZ, 0);
  });
});
