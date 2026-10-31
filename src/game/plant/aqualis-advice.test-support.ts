import { readings as chemistryReadings } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import { DEFAULT_TARGETS } from './aqualis-types';
import type {
  AqualisReadings,
  AqualisSettings,
  ChannelId,
  ChannelStatus,
  ChannelView,
} from './aqualis-types';

/**
 * Shared setup for the advice verification suite
 * (`doc/plans/aqualis-advice-verification.md`): an ideal analyser's
 * readings of a water, channel views, and settings at a given volume.
 */

/** The readings an ideal analyser gives of a water. */
export function readingsOf(w: PoolChemistry, T: number): AqualisReadings {
  const r = chemistryReadings(w, T);
  return {
    freeChlorine: w.freeChlorine,
    combinedChlorine: r.combinedChlorine,
    totalChlorine: r.totalChlorine,
    ph: w.ph,
    alkalinity: w.alkalinity,
    calciumHardness: w.hardness,
    lsi: r.langelier,
    tds: w.tds,
    sulphate: w.sulphate,
    temperature: T,
  };
}

export const channelView = (
  id: ChannelId,
  status: ChannelStatus,
): ChannelView => ({ id, status, demand: 0, demandRate: 0, delivering: 0 });

/** Hypochlorite and acid online, CO₂ unconnected: the world's Trios. */
export const TRIO_CHANNELS: ChannelView[] = [
  channelView('hypochlorite', { kind: 'online' }),
  channelView('acid', { kind: 'online' }),
  channelView('co2', { kind: 'unconnected' }),
];

/** Settings at `volumeM3` with the default targets. */
export const settingsAt = (volumeM3: number): AqualisSettings => ({
  dynamics: { volumeM3, flowM3h: volumeM3 / 4 },
  targets: DEFAULT_TARGETS,
});

/** Relative error of `got` against `want`. */
export const rel = (got: number, want: number) => Math.abs(got / want - 1);
