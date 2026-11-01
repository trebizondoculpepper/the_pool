import { describe, expect, it } from 'vite-plus/test';
import { advance, newWorld } from './world';
import type { World } from './world';
import { POOL_IDS } from './plant/pools';
import { TRIO_POOLS } from './plant/aqualis-world';
import { newWaterTreatment } from './plant/water-treatment';
import { triosFor } from './plant/aqualis-world';
import { OLYMPIC_DIRT_REF } from './plant/olympic-battery';
import { abnormalities, kitOf } from './new-game-normal.test-support';

/**
 * A new game starts perfectly normal and stays so (the owner, 2026-10-31,
 * `doc/plans/new-game-normal.md`): clean, balanced water in every pool,
 * clean filters, every balance tank at its working level, the backwash pit
 * empty, every machine in its normal duty, no alarm; and after an hour of
 * the world run as the game runs it (`advance`, its 0.1 s step), the test
 * kit still reads every pool normal, Dr Aqualis still agrees, and nothing
 * has been raised. Checked every minute of the hour, so a transient fault
 * between the ends cannot hide.
 */
describe('a new game is normal', () => {
  it('at its first frame', () => {
    expect(abnormalities(newWorld())).toEqual([]);
  });

  it('once each Trio has made its first reading', () => {
    const start = newWorld();
    const w = advance(start, 10);
    expect(abnormalities(w, start)).toEqual([]);
    for (const id of TRIO_POOLS) {
      expect(w.aqualis[id].channels.hypochlorite.status.kind, id).toBe(
        'online',
      );
      expect(w.aqualis[id].channels.acid.status.kind, id).toBe('online');
    }
  });

  it('through its first hour, and the test kit reads every pool normal at its end', () => {
    const start = newWorld();
    let w: World = start;
    const found: string[] = [];
    for (let minute = 1; minute <= 60; minute++) {
      w = advance(w, 60);
      found.push(...abnormalities(w, start));
    }
    expect(found).toEqual([]);
    expect(w.time).toBeCloseTo(3600, 6);
    for (const id of POOL_IDS) {
      const kit = kitOf(w, id);
      // Plainly clean water: chlorine on, little combined.
      expect(kit.readings.freeChlorine.value, id).toBeGreaterThanOrEqual(1);
      expect(kit.combined, id).toBeLessThanOrEqual(0.3);
    }
  }, 60_000);

  it('finds what it is for: the start a new game had before 2026-10-31', () => {
    const w = newWorld();
    // The settled, unmaintained water; the Olympic's beds mid-season; a day tank below low.
    const treatment = newWaterTreatment(w.pools);
    const old: World = {
      ...w,
      treatment,
      aqualis: triosFor(treatment, w.pools),
      olympic: {
        ...w.olympic,
        dirt: w.olympic.dirt.map(() => 1.6 * OLYMPIC_DIRT_REF),
      },
      distribution: {
        ...w.distribution,
        acid: {
          ...w.distribution.acid,
          tanks: w.distribution.acid.tanks.map((t, i) =>
            i === 0 ? { ...t, litres: t.lowL * 0.9 } : t,
          ),
        },
      },
    };
    const found = abnormalities(old).join('\n');
    expect(found).toContain('pool_01 Trio alkalinity');
    expect(found).toContain('pool_02 Dr Aqualis warning: Alkalinity low');
    expect(found).toContain('pool_01 Dr Aqualis asks for a hand dose');
    expect(found).toContain('PL2-F1 dirt');
    expect(found).toContain('acid day tank 0 at or below low');
  });
});
