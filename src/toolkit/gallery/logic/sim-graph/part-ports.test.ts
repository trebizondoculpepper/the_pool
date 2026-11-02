import { describe, expect, it } from 'vite-plus/test';
import { jacuzziPumpCalled } from '../../../../game/plant/jacuzzi-cabinet';
import {
  applyAction,
  jacuzziCabinetInputs,
  newWorld,
} from '../../../../game/world';
import { neighbours, roomNet } from './graph';
import type { NodeId } from './graph';
import { simGraph } from './index';
import { PART_PORTS } from './part-ports';

const PUMP = 'plant_pool_03/part:cabinet/pump';
const CAB = 'plant_pool_03/node:cabinet';

/** Every node reachable along edges one way (a connectivity assertion, not the page). */
function reach(from: NodeId, dir: 'up' | 'down') {
  const g = simGraph();
  const seen = new Set<NodeId>([from]);
  const queue = [from];
  while (queue.length)
    for (const n of neighbours(g, queue.shift()!, dir))
      if (!seen.has(n.node)) {
        seen.add(n.node);
        queue.push(n.node);
      }
  return seen;
}

describe('the part-port table', () => {
  it('maps each pump port to a cabinet port in the schematic', () => {
    const net = roomNet('plant_pool_03')!;
    for (const parentPort of Object.values(PART_PORTS['cabinet/pump'].ports))
      expect(
        net.links.some(
          (l) =>
            (l.sourceId === 'cabinet' && l.sourcePort === parentPort) ||
            (l.targetId === 'cabinet' && l.targetPort === parentPort),
        ),
      ).toBe(true);
  });
  it('gives the three contains edges their directions', () => {
    const c = simGraph().edges.filter(
      (e) => e.kind === 'contains' && (e.from === PUMP || e.to === PUMP),
    );
    expect(
      c.map((e) => `${e.from}:${e.fromPort}>${e.to}:${e.toPort}`).sort(),
    ).toEqual(
      [
        `${CAB}:power>${PUMP}:power`,
        `${CAB}:suction>${PUMP}:suction`,
        `${PUMP}:discharge>${CAB}:to-filter`,
      ].sort(),
    );
  });
  it('reaches the switch-fuse and the feeder part upstream, the filter downstream', () => {
    const up = reach(PUMP, 'up');
    expect(up.has('plant_pool_03/node:switch-fuse')).toBe(true);
    expect(up.has('switch_room/part:rooms/plant_pool_03')).toBe(true);
    expect(up.has('switch_room/node:incoming')).toBe(true);
    expect(reach(PUMP, 'down').has('plant_pool_03/node:filter')).toBe(true);
  });
  it('POWER resolves to the cabinet, and turning it off stops the pump (the probe)', () => {
    const rel = simGraph().relations.controls.filter(
      (c) => c.target === CAB && c.control.key === 'power',
    );
    expect(rel.length).toBeGreaterThan(0);
    const w = newWorld();
    expect(jacuzziPumpCalled(w.jacuzziCabinet, jacuzziCabinetInputs(w))).toBe(
      true,
    );
    const off = applyAction(w, {
      type: 'jacuzzi/cabinet',
      action: { act: 'power', on: false },
    });
    expect(
      jacuzziPumpCalled(off.jacuzziCabinet, jacuzziCabinetInputs(off)),
    ).toBe(false);
  });
});
