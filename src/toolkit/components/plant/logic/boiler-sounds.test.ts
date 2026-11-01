import { describe, expect, it } from 'vite-plus/test';
import { newBoiler } from './boiler-house';
import type { BoilerState } from './boiler-house';
import { SILENT, boilerSound, boilerSoundEvents } from './boiler-sounds';

const at = (b: Partial<BoilerState>): BoilerState => ({
  ...newBoiler(),
  ...b,
});

describe('a boiler’s sounds, from its controller', () => {
  it('is silent standing by, blocked, locked out or switched off', () => {
    expect(boilerSound(at({ code: 0 }))).toEqual(SILENT);
    expect(boilerSound(at({ code: 9 }))).toEqual(SILENT);
    expect(boilerSound(at({ code: 3, on: false }))).toEqual(SILENT);
    expect(boilerSound(at({ code: 3, lockout: 'ignition-failure' }))).toEqual(
      SILENT,
    );
  });

  it('runs its pump and fan to purge, ticks its igniter, then roars as it fires', () => {
    expect(boilerSound(at({ code: 1 }))).toEqual({
      pump: true,
      fan: true,
      spark: false,
      burner: 0,
    });
    expect(boilerSound(at({ code: 2, timer: 1 })).spark).toBe(true);
    const low = boilerSound(at({ code: 3, rate: 0.1 }));
    const high = boilerSound(at({ code: 3, rate: 1 }));
    expect(low).toMatchObject({ pump: true, fan: true, spark: false });
    expect(low.burner).toBe(1);
    expect(high.burner).toBe(4);
  });

  it('keeps its pump running on alone after the burner stops', () => {
    expect(boilerSound(at({ code: 7 }))).toEqual({
      pump: true,
      fan: false,
      spark: false,
      burner: 0,
    });
  });

  it('hears the flame light and go out once each', () => {
    expect(boilerSoundEvents(at({ code: 2 }), at({ code: 3 }))).toEqual([
      'ignite',
    ]);
    expect(boilerSoundEvents(at({ code: 3 }), at({ code: 3 }))).toEqual([]);
    expect(boilerSoundEvents(at({ code: 3 }), at({ code: 7 }))).toEqual([
      'flame-out',
    ]);
  });
});
