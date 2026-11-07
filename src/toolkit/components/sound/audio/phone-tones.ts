import type { SoundRecipe } from '../../core/audio/part-audio';

/**
 * Original three-pulse message cue for Pool Plant's early handset.
 * Uneven intervals and a falling final pitch keep it distinct from the
 * familiar Nokia tune and the Morse-code SMS alert. The square-wave voice
 * suggests a tiny period piezo speaker; the shared audio bus sets volume.
 */
export const PHONE_MESSAGE_ALERT = {
  tones: [
    { at: 0, hz: 880, seconds: 0.065, level: 0.045, type: 'square' },
    { at: 0.115, hz: 1175, seconds: 0.075, level: 0.04, type: 'square' },
    { at: 0.275, hz: 698, seconds: 0.14, level: 0.035, type: 'square' },
  ],
} satisfies SoundRecipe;
