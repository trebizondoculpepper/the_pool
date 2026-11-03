import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../../game/world';
import { buildGraph, nodeId, roomNet } from './graph';
import { schematicSources } from './sources/schematics';
import { stateAdapter } from './state-adapters';

describe('pool exchanger temperature control topology', () => {
  for (const [room, fittingId, inletPort] of [
    [
      'plant_pool_01',
      'plant_pool_01.exchanger.primary-flow.temperature-control',
      'pool-in',
    ],
    ['plant_pool_02', 'exchanger.primaryFlow.temperature-control', 'poolIn'],
  ] as const) {
    it(`${room} has one in-line control valve driven by its controller`, () => {
      const net = roomNet(room)!;
      expect(net.nodes.has('temperature-control-valve')).toBe(false);
      const valve = net.fittings.get(fittingId)!;
      expect(valve.kind).toBe('regulating-valve');
      expect(valve.operator).toBe('motor');
      expect(valve.controlledBy).toEqual({
        node: 'temperature-controller',
        port: 'output',
      });
      const edges = schematicSources([room])[0]!.edges!;
      expect(
        edges.filter(
          (edge) =>
            edge.from === `${room}/node:temperature-controller` &&
            edge.to === `${room}/fitting:${fittingId}` &&
            edge.medium === 'signal',
        ),
      ).toHaveLength(1);
      const graph = buildGraph(schematicSources([room]));
      const fittingNode = graph.nodes.get(nodeId(room, 'fitting', fittingId))!;
      const pool = room === 'plant_pool_01' ? 'pool_01' : 'pool_02';
      const off = applyAction(newWorld(), {
        type: 'pool/temperature-control',
        pool,
        act: 'mode',
        mode: 'off',
      });
      expect(stateAdapter(fittingNode, off)!.read(off)).toMatchObject({
        commandedPosition: 0,
        actualPosition: 0,
      });
    });

    it(`${room} samples the exchanger's pool return inlet`, () => {
      const sample = roomNet(room)!.links.find(
        (link) => link.targetId === 'temperature-probe',
      )!;
      expect([sample.sourceId, sample.sourcePort]).toEqual([
        'exchanger',
        inletPort,
      ]);
    });
  }
});
