import { ANNUNCIATOR_ALARMS } from '../control-room-demo';
import type { ControlRelation } from './graph';
import { alarmNode, annunciatorDisplays } from './sources/alarms';

/**
 * The annunciators' ACCEPT and RESET (mission 138, plan section 9,
 * example 4): 131 does not yet describe the annunciators, so their two
 * controls come from this small sourced adapter, offered to 131's owner as
 * descriptors. Each works every window of the one `AnnunciatorState`,
 * through `world.ts`'s `alarms/accept` and `alarms/reset`. Pure.
 */

export const ANNUNCIATOR_KEYS = [
  { key: 'accept', label: 'ACCEPT', action: 'alarms/accept' },
  { key: 'reset', label: 'RESET', action: 'alarms/reset' },
] as const;

export function annunciatorControls(): ControlRelation[] {
  return annunciatorDisplays()
    .filter((d) => d.controls)
    .flatMap((d) =>
      ANNUNCIATOR_KEYS.flatMap((k) =>
        ANNUNCIATOR_ALARMS.map((id) => ({
          control: {
            room: d.room,
            ref: `${d.ref}/${k.key}`,
            key: k.key,
            label: k.label,
          },
          target: alarmNode(id),
          named: `alarm:${id}`,
          via: { file: 'src/game/world.ts', symbol: `'${k.action}' action` },
        })),
      ),
    );
}
