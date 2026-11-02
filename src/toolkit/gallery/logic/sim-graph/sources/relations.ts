import { objectDescriptors } from '../../../../../game/descriptors/registry';
import type { ObjectDescriptor } from '../../../../../game/descriptors/descriptor';
import { boardCopies } from '../../room-audit';
import { annunciatorControls } from '../annunciator-controls';
import { resolveRef } from '../graph';
import type {
  ControlRelation,
  CopyRelation,
  NodeId,
  ReadingRelation,
  Relations,
  SimGraph,
} from '../graph';
import { READING_RULE, readingTarget } from '../part-bindings';

/**
 * Controls, readings and copies as typed relations, not edges (mission
 * 138, plan sections 2 and 3, joins 6 and 7): one end is a world object's
 * control or reading (131's descriptors), the other a node, resolved
 * through `resolveRef` (a model ref, in the descriptor's room) or the
 * derived tag index; a target neither resolves is `unresolved`. Pure.
 */

/** A target named by a descriptor in `room`: every node it resolves to. */
export function resolveTarget(
  graph: SimGraph,
  room: string,
  target: string,
): NodeId[] {
  if (/^(node|fitting|link):/.test(target))
    return [...new Set(resolveRef(room, target).map((t) => t.page))];
  const lower = target.toLowerCase();
  return [...graph.nodes.values()]
    .filter((n) => n.tag?.toLowerCase() === lower)
    .map((n) => n.id);
}

export function graphRelations(
  graph: SimGraph,
  descriptors: readonly ObjectDescriptor[] = objectDescriptors(),
): Relations {
  const controls: ControlRelation[] = [];
  const readings: ReadingRelation[] = [];
  for (const d of descriptors) {
    for (const c of d.controls)
      for (const t of c.targets) {
        const found = resolveTarget(graph, d.room, t);
        const control = {
          room: d.room,
          ref: c.ref,
          key: c.key,
          label: c.label,
        };
        const via = {
          file: 'src/game/descriptors/registry.ts',
          symbol: `${c.ref} targets`,
        };
        if (!found.length)
          controls.push({ control, target: 'unresolved', named: t, via });
        for (const target of found)
          controls.push({ control, target, named: t, via });
      }
    for (const r of d.readings) {
      const t = readingTarget(
        d,
        r.key,
        (tag) => resolveTarget(graph, d.room, tag).length > 0,
      );
      const found = t ? resolveTarget(graph, d.room, t) : [];
      const reading = { room: d.room, ref: d.ref, key: r.key, label: r.label };
      if (!found.length)
        readings.push({ reading, target: 'unknown', via: READING_RULE });
      for (const target of found)
        readings.push({ reading, target, via: READING_RULE });
    }
  }
  controls.push(...annunciatorControls());
  const copies: CopyRelation[] = boardCopies().map((c) => ({
    board: `${c.board.room}/node:${c.board.node}`,
    copy: `${c.copy.room}/node:${c.copy.node}`,
    via: {
      file: 'src/toolkit/gallery/logic/room-audit.ts',
      symbol: 'boardCopies',
    },
  }));
  return { controls, readings, copies };
}
