import { describe, expect, it } from 'vite-plus/test';
import { advance, newWorld } from './world';
import type { World } from './world';
import { DEFAULT_TARGETS } from './plant/aqualis-types';
import { CHANNELS } from './plant/aqualis-types';
import { poolVolume } from './plant/pools';
import type { Co2PortId } from './plant/co2-distribution';

/**
 * Mission 118, step 5, the owner's experiment (2026-10-31: "we want to see
 * if that improves the situation now that the system has a milder acid to
 * work with"): the new game run for two days twice, once as built (each
 * Trio sharing its pH demand CO₂ first, acid trimming) and once with the
 * CO₂ panels' control cables unplugged (acid alone, as before mission
 * 118), on both Trio pools, measuring pH against its set point, time in
 * band, acid and CO₂ used, the TDS and chloride the acid adds, and the
 * alkalinity's drift. The table is written to
 * `doc/plans/co2-system.md` by hand from what this prints
 * (`CO2_EXPERIMENT_OUT`, a JSON file, when set).
 */

const HOURS = 48;
const SAMPLE = 600;
const POOLS = [
  { pool: 'pool_01', room: 'plant_pool_01', name: 'Lounge' },
  { pool: 'pool_02', room: 'plant_pool_02', name: 'Olympic' },
] as const;

/** Chloride from hydrochloric acid, g a gram of HCl. */
const CL_PER_HCL = 35.45 / 36.46;

export interface Run {
  ph: { mean: number; meanAbsDev: number; maxAbsDev: number };
  inBand: number;
  acidL: number;
  co2Kg: number;
  tdsRise: number;
  chlorideFromAcid: number;
  alkalinityDrift: number;
}

function run(co2: boolean): Record<'pool_01' | 'pool_02', Run> {
  let w: World = newWorld();
  if (!co2)
    w = {
      ...w,
      co2: {
        ...w.co2,
        connected: { plant_pool_01: false, plant_pool_02: false },
      },
    };
  const start = w;
  const phs: Record<string, number[]> = { pool_01: [], pool_02: [] };
  const grams: Record<string, number> = { pool_01: 0, pool_02: 0 };
  const { set, low, high } = DEFAULT_TARGETS.ph;
  for (let t = 0; t < HOURS * 3600; t += SAMPLE) {
    w = advance(w, SAMPLE, 10, (_before, after) => {
      for (const p of POOLS)
        grams[p.pool] +=
          (after.co2.dosers[p.room as Co2PortId].delivering * 10) / 3600;
    });
    for (const p of POOLS)
      phs[p.pool].push(w.treatment.circuits[p.pool].pool[0].ph);
  }
  const out = {} as Record<'pool_01' | 'pool_02', Run>;
  for (const p of POOLS) {
    const ph = phs[p.pool];
    const dev = ph.map((v) => Math.abs(v - set));
    const a = start.treatment.circuits[p.pool].pool[0];
    const b = w.treatment.circuits[p.pool].pool[0];
    const acidL =
      w.dosingPumps[p.pool].acid.deliveredL -
      start.dosingPumps[p.pool].acid.deliveredL;
    out[p.pool] = {
      ph: {
        mean: ph.reduce((s, v) => s + v, 0) / ph.length,
        meanAbsDev: dev.reduce((s, v) => s + v, 0) / dev.length,
        maxAbsDev: Math.max(...dev),
      },
      inBand: ph.filter((v) => v >= low && v <= high).length / ph.length,
      acidL,
      co2Kg: grams[p.pool] / 1000,
      tdsRise: b.tds - a.tds,
      chlorideFromAcid:
        (acidL * CHANNELS.acid.gramsPerUnit * CL_PER_HCL * 1000) /
        (poolVolume(p.pool) * 1000),
      alkalinityDrift: b.alkalinity - a.alkalinity,
    };
  }
  return out;
}

describe('mission 118’s experiment: CO₂ first, acid trimming, against acid alone', () => {
  it(`runs both pools ${HOURS} hours each way`, async () => {
    const withCo2 = run(true);
    const acidAlone = run(false);
    const result = { hours: HOURS, withCo2, acidAlone };
    // Written out for the plan's table when asked (node only).
    const env = (
      globalThis as { process?: { env: Record<string, string | undefined> } }
    ).process?.env;
    const out = env?.CO2_EXPERIMENT_OUT;
    if (out) {
      const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as {
        writeFileSync(path: string, text: string): void;
      };
      fs.writeFileSync(out, JSON.stringify(result, null, 2));
    }
    for (const p of POOLS) {
      // CO₂ takes the pH load acid carried alone: less acid, CO₂ used.
      expect(withCo2[p.pool].co2Kg, p.name).toBeGreaterThan(0);
      expect(acidAlone[p.pool].co2Kg, p.name).toBe(0);
      expect(withCo2[p.pool].acidL, p.name).toBeLessThan(
        acidAlone[p.pool].acidL,
      );
      // And the pH is still held in its band most of the time either way.
      expect(withCo2[p.pool].inBand, p.name).toBeGreaterThan(0.5);
    }
  }, 3_600_000);
});
