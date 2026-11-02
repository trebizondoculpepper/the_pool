import type { GraphNode } from './graph';

/**
 * Section 4.7, is anything wrong with it (mission 138): each flag `yes`,
 * `no` or `unknown`, computed from the other sections; `unknown` where its
 * inputs are not yet described, never a finding. Pure.
 */

export type FlagValue = 'yes' | 'no' | 'unknown';
export type SimFlag =
  | 'invisible'
  | 'uncontrollable'
  | 'no-effect'
  | 'no-source'
  | 'alarm-not-both'
  | 'missing-tag'
  | 'duplicate-tag'
  | 'no-state';

export const SIM_FLAGS: readonly SimFlag[] = [
  'invisible',
  'uncontrollable',
  'no-effect',
  'no-source',
  'alarm-not-both',
  'missing-tag',
  'duplicate-tag',
  'no-state',
];

export const SIM_FLAG_WORDS: Record<SimFlag, string> = {
  invisible: 'invisible: simulated, nothing in the world shows it',
  uncontrollable: 'uncontrollable: workable, nothing acts on it',
  'no-effect': 'no effect: nothing downstream',
  'no-source': 'no source: nothing upstream',
  'alarm-not-both': 'an alarm not on both control rooms',
  'missing-tag': 'missing tag',
  'duplicate-tag': 'duplicate tag',
  'no-state': 'state not found in the world',
};

/** Kinds a person or a controller works: a valve, isolator, switch, starter. */
const WORKABLE = new Set([
  'isolating-valve',
  'power-isolator',
  'main-switch',
  'changeover-switch',
  'switch-fuse',
  'room-feeder',
  'circulation-pump',
  'annunciator-window',
]);
/** Sinks: nothing downstream expected. */
const SINKS = new Set([
  'gully',
  'deck-gully',
  'annunciator-window',
  'speaker-pair',
  'fibre-wall',
  'water-quality-display',
  'hall-lights',
  'plant-room-lights',
  'lighting-zones',
  'earthing-terminal',
  'control-room-mode',
]);
/** Supplies: nothing upstream expected. */
const SUPPLIES = new Set([
  'incoming-supply',
  'water-service',
  'gas-supply',
  'generator-cable',
  'control-room-mode',
]);

export interface FlagInputs {
  node: GraphNode;
  hasState: boolean;
  upstream: number;
  downstream: number;
  /** Controls acting on it or on its parent. */
  controls: number;
  /** Whether its home room is described (131). */
  described: boolean;
  representations: number;
  /** Rooms it could be shown in whose coverage is incomplete. */
  unknownIn: readonly string[];
  /** For each alarm it raises (or itself, an alarm): does it reach both control rooms? */
  alarms: readonly boolean[];
  /** Whether its sources of alarms are declared at all. */
  alarmsDeclared: boolean;
  /** Its kind should carry a tag. */
  tagExpected: boolean;
  duplicateTag: boolean;
}

export function simFlags(i: FlagInputs): Record<SimFlag, FlagValue> {
  const yn = (b: boolean): FlagValue => (b ? 'yes' : 'no');
  return {
    invisible:
      !i.hasState || i.representations
        ? 'no'
        : i.unknownIn.length
          ? 'unknown'
          : 'yes',
    uncontrollable: !WORKABLE.has(i.node.kind)
      ? 'no'
      : i.controls
        ? 'no'
        : i.described
          ? 'yes'
          : 'unknown',
    'no-effect': SINKS.has(i.node.kind) ? 'no' : yn(i.downstream === 0),
    'no-source': SUPPLIES.has(i.node.kind) ? 'no' : yn(i.upstream === 0),
    'alarm-not-both': i.alarms.some((b) => !b)
      ? 'yes'
      : i.alarms.length || i.alarmsDeclared
        ? 'no'
        : 'unknown',
    'missing-tag': yn(i.tagExpected && !i.node.tag),
    'duplicate-tag': yn(i.duplicateTag),
    'no-state': yn(!i.hasState),
  };
}
