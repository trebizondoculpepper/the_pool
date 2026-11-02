import { describe, expect, it } from 'vite-plus/test';
import { serviceAvailable } from '../../../../game/plant/services';
import { newWorld } from '../../../../game/world';
import { simGraph } from './index';
import { FEEDERS_NODE, SERVICE_ROOMS, feederPart } from './sources/parts';
import { roomNet } from './graph';

describe('joins across rooms', () => {
  const g = simGraph();
  it('joins each service room’s feeder part to its own switch-fuse', () => {
    for (const room of SERVICE_ROOMS) {
      if (!roomNet(room)?.nodes.has('switch-fuse')) continue;
      const e = g.edges.filter(
        (x) => x.kind === 'feeds' && x.from === feederPart(room),
      );
      expect(e.map((x) => x.to)).toEqual([`${room}/node:switch-fuse`]);
      expect(e[0].toPort).toBe('in');
    }
  });
  it('contains every feeder part in the switch room’s rooms node', () => {
    for (const room of SERVICE_ROOMS) {
      const e = g.edges.find(
        (x) =>
          x.kind === 'contains' &&
          x.from === FEEDERS_NODE &&
          x.to === feederPart(room),
      );
      expect(e?.direction).toBe('forward');
      expect([e?.fromPort, e?.toPort]).toEqual([null, null]);
    }
  });
  it('the feeder gates the room (serviceAvailable), the evidence of join 2', () => {
    const w = newWorld();
    expect(serviceAvailable(w.plant, 'plant_pool_03', 'power')).toBe(true);
    const off = {
      ...w.plant,
      feeders: { ...w.plant.feeders, plant_pool_03: false },
    };
    expect(serviceAvailable(off, 'plant_pool_03', 'power')).toBe(false);
  });
  it('joins the heating main and the corridor water on known pairs', () => {
    expect(
      g.edges.some(
        (e) =>
          e.kind === 'feeds' &&
          e.from === 'boiler_house/node:building' &&
          e.to === 'plant_pool_03/node:heating',
      ),
    ).toBe(true);
    expect(
      g.edges.some(
        (e) =>
          e.kind === 'feeds' &&
          e.from === 'plant_pool_03/node:corridor-waste' &&
          e.to === 'main_corridor/node:pool_03-waste',
      ),
    ).toBe(true);
  });
});
