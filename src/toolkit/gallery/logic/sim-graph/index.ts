import { buildGraph } from './graph';
import type { SimGraph } from './graph';
import { alarmSources } from './sources/alarms';
import { joinSources } from './sources/joins';
import { leafSources } from './sources/leaves';
import { partSources } from './sources/parts';
import { graphRelations } from './sources/relations';
import { schematicSources } from './sources/schematics';

/**
 * The whole simulation graph (mission 138): every room network, the
 * parts, the joins across rooms, the alarms and the leaves, with the
 * controls, readings and copies resolved against it. Built once on first
 * use and cached, as `schematicExpansion` caches. Pure.
 */
let cached: SimGraph | undefined;
export function simGraph(): SimGraph {
  cached ??= buildGraph(
    [
      ...schematicSources(),
      ...partSources(),
      ...joinSources(),
      ...alarmSources(),
      ...leafSources(),
    ],
    (g) => graphRelations(g),
  );
  return cached;
}
