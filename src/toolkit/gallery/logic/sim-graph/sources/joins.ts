import { POOL_IDS } from '../../../../../game/plant/pools';
import type { PoolId } from '../../../../../game/plant/pools';
import { poolConsumer } from '../../../../../game/plant/heat-consumers';
import { ROOM_SWITCH_FUSES } from '../../../../../game/plant/installed-feeders';
import { nodeId, roomNet } from '../graph';
import type { GraphEdge, GraphSource } from '../graph';
import { SERVICE_ROOMS, feederPart } from './parts';

/**
 * How the domains join across rooms (mission 138, plan section 3): only
 * joins the code states, each an explicit, tested mapping, never a join
 * by room name alone. Pure.
 *
 * - Join 2, power: each service room's feeder part in the switch room
 *   feeds that room's own switch-fuse (`ROOM_SWITCH_FUSES`; the evidence
 *   that the feeder and the switchboard gate it is `serviceAvailable`).
 * - Join 3, heat: the boiler house's building heating (the LTHW ring's
 *   consumers, `heat-consumers.ts`, keyed by use) feeds each pool plant
 *   room's heating main.
 * - Join 4, water: the corridor's make-up inlet for a pool feeds its plant
 *   room's water service, and its plant room's pit-waste boundary runs to
 *   the corridor's outlet for that pool (`corridor-water-schematic.ts`).
 * - Join 5, chemical: not yet declared (a later to-do in `TODO.md`).
 */

/** The pool a plant room serves, from its id (`plant_pool_03` → `pool_03`). */
export const poolOfPlantRoom = (room: string): PoolId | undefined =>
  POOL_IDS.find((p) => `plant_${p}` === room);

const has = (room: string, id: string) => !!roomNet(room)?.nodes.has(id);

/** Join 2: feeder part → each service room's switch-fuse `in`. */
export function powerJoins(): GraphEdge[] {
  return SERVICE_ROOMS.filter((room) => has(room, 'switch-fuse')).map(
    (room) => ({
      from: feederPart(room),
      fromPort: null,
      to: nodeId(room, 'node', 'switch-fuse'),
      toPort: 'in',
      kind: 'feeds' as const,
      direction: 'forward' as const,
      medium: 'power' as const,
      via: {
        file: 'src/game/plant/installed-feeders.ts',
        symbol: `ROOM_SWITCH_FUSES.${room} (${ROOM_SWITCH_FUSES[room].tag}); services.ts serviceAvailable`,
      },
    }),
  );
}

/** Join 3: the boiler house's building heating → each pool plant room's heating main. */
export function heatJoins(): GraphEdge[] {
  return POOL_IDS.flatMap((pool) => {
    const room = `plant_${pool}`;
    const main = [...(roomNet(room)?.nodes.values() ?? [])].find(
      (n) => n.kind === 'heating-main',
    );
    if (!main || !has('boiler_house', 'building')) return [];
    return [
      {
        from: nodeId('boiler_house', 'node', 'building'),
        fromPort: 'flow',
        to: nodeId(room, 'node', main.id),
        toPort: null,
        kind: 'feeds' as const,
        direction: 'forward' as const,
        medium: 'water' as const,
        via: {
          file: 'src/game/plant/heat-consumers.ts',
          symbol: `poolConsumer → ${poolConsumer(pool, 'water')}`,
        },
      },
    ];
  });
}

/** Join 4: the corridor's make-up and waste boundaries ↔ each plant room's. */
export function waterJoins(): GraphEdge[] {
  const corridor = 'main_corridor';
  const via = {
    file: 'src/game/plant/corridor-water-schematic.ts',
    symbol: 'CORRIDOR_WATER_SCHEMATIC (POOL_IDS make-up and waste)',
  };
  return POOL_IDS.flatMap((pool) => {
    const room = `plant_${pool}`;
    const out: GraphEdge[] = [];
    if (has(corridor, `${pool}-make-up`) && has(room, 'water'))
      out.push({
        from: nodeId(corridor, 'node', `${pool}-make-up`),
        fromPort: null,
        to: nodeId(room, 'node', 'water'),
        toPort: null,
        kind: 'feeds',
        direction: 'forward',
        medium: 'water',
        via,
      });
    if (has(corridor, `${pool}-waste`) && has(room, 'corridor-waste'))
      out.push({
        from: nodeId(room, 'node', 'corridor-waste'),
        fromPort: null,
        to: nodeId(corridor, 'node', `${pool}-waste`),
        toPort: null,
        kind: 'feeds',
        direction: 'forward',
        medium: 'water',
        via,
      });
    return out;
  });
}

export function joinSources(): GraphSource[] {
  return [{ edges: [...powerJoins(), ...heatJoins(), ...waterJoins()] }];
}
