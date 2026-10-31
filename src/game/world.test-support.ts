import type { World } from './world';
import type { Chemical } from './plant/chemicals';
import { newWaterTreatment } from './plant/water-treatment';
import { triosFor } from './plant/aqualis-world';
import { OLYMPIC_DIRT_REF } from './plant/olympic-battery';
import { LOUNGE_DIRT_REF } from './plant/lounge-filters';

/** A chemical run out everywhere: its store and every day tank (plan 085). */
export const runOut = (w: World, c: Chemical, store = 0): World => ({
  ...w,
  chemicals: { ...w.chemicals, [c]: store },
  distribution: {
    ...w.distribution,
    [c]: {
      ...w.distribution[c],
      tanks: w.distribution[c].tanks.map((t) => ({ ...t, litres: 0 })),
    },
  },
});

/**
 * A world's pools on their settled water (`water-treatment.ts` `SETTLED`):
 * months of acid dosing with no bicarbonate added, the alkalinity below
 * its band, as a new game began before 2026-10-31 and a migrated save
 * still does; the Trios taken on afresh.
 */
export function onSettledWater(w: World): World {
  const treatment = newWaterTreatment(w.pools);
  return { ...w, treatment, aqualis: triosFor(treatment, w.pools) };
}

/**
 * A world's lounge and Olympic filter beds mid-season, as a new game began
 * before 2026-10-31 (a new game's are clean): the Olympic's each at 1.6
 * times its dirt reference, its pool's design flow through them; the
 * lounge's at 0.6, 0.54 bar.
 */
export const MID_SEASON = { olympic: 1.6, lounge: 0.6 } as const;
export const midSeasonFilters = (w: World): World => ({
  ...w,
  olympic: {
    ...w.olympic,
    dirt: w.olympic.dirt.map(() => MID_SEASON.olympic * OLYMPIC_DIRT_REF),
  },
  loungeFilters: {
    ...w.loungeFilters,
    dirt: [
      MID_SEASON.lounge * LOUNGE_DIRT_REF,
      MID_SEASON.lounge * LOUNGE_DIRT_REF,
    ],
  },
});
