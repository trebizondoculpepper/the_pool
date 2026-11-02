import type { ObjectDescriptor } from '../../../../game/descriptors/descriptor';
import { ANNUNCIATOR_ALARMS } from '../control-room-demo';
import type { AlarmId } from '../control-room-demo';
import type { NodeId, Provenance } from './graph';
import { alarmNode } from './sources/alarms';

/**
 * The part data the forward graph needs (mission 138, plan section 4.6a;
 * the reverse links from objects' audits to nodes are deferred to a later
 * to-do, the owner, 2026-11-02). The annunciator windows' alarms, from the
 * alarm list each board is built from (127 records an annunciator's
 * buttons, not its windows), and the readings whose model target 131's
 * `Reading` cannot yet say (no `reads` field: offered to its owner). Pure.
 */

/** An annunciator's windows, each its alarm node, from the list it is built from. */
export function annunciatorWindows(): {
  alarm: AlarmId;
  node: NodeId;
  via: Provenance;
}[] {
  return ANNUNCIATOR_ALARMS.map((alarm) => ({
    alarm,
    node: alarmNode(alarm),
    via: {
      file: 'src/toolkit/gallery/logic/control-room-demo.ts',
      symbol: 'ANNUNCIATOR_ALARMS',
    },
  }));
}

/**
 * A reading's model target, where a declared rule gives one: a valve's
 * own position lamp or handle reads the one fitting its controls work; a
 * valve panel's lamp keyed by a valve's tag reads that valve. Returns the
 * model ref or tag it reads; none, unknown.
 */
export function readingTarget(
  d: ObjectDescriptor,
  key: string,
  tagged: (tag: string) => boolean,
): string | undefined {
  const fittings = [
    ...new Set(
      d.controls.flatMap((c) =>
        c.targets.filter((t) => t.startsWith('fitting:')),
      ),
    ),
  ];
  if (key === 'position' && fittings.length === 1) return fittings[0];
  if (d.kind === 'valve-panel' && tagged(key)) return key;
  return undefined;
}

export const READING_RULE: Provenance = {
  table: 'readingTarget',
  entry: 'valve position lamps',
  probe: 'relations.test.ts',
};
