import { nodeId } from '../graph';
import type { GraphSource } from '../graph';

/**
 * World state outside the four domains (mission 138, plan section 3, join
 * 9): leaves, joined only where the code reads plant state into them. So
 * far the CONTROL ROOM MODE knob's setting, which decides where the
 * control room doors lead (`control-room-mode.ts`). Pure.
 */

export const CONTROL_ROOM_MODE = nodeId('world', 'state', 'controlRoomMode');

export function leafSources(): GraphSource[] {
  return [
    {
      nodes: [
        {
          id: CONTROL_ROOM_MODE,
          room: 'world',
          sort: 'state',
          kind: 'control-room-mode',
          name: 'CONTROL ROOM MODE (old or new)',
          tier: 'active',
        },
      ],
    },
  ];
}
