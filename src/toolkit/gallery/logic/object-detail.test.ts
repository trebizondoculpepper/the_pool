import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../../../game/world';
import { kindCatalogue } from './kind-catalogue';
import { lookCatalogue } from './look-catalogue';
import { objectDetail, objectDetailLink } from './object-detail';
import { simGraph } from './sim-graph/index';

const entries = lookCatalogue('plant_pool_02', kindCatalogue());
const controller = entries.find((e) => e.ref === 'PL2-TC1')!;

describe('bench object detail (mission 145)', () => {
  it('links one installed instance by room and ref', () => {
    expect(objectDetailLink('plant_pool_02', 'PL2-TC1')).toBe(
      'bench.html?bench=object-detail&room=plant_pool_02&ref=PL2-TC1',
    );
    expect(controller.itemKey).toBe('pool-temperature-controller:digital');
  });

  it('shows the controller graph node, live condition and known behavior', () => {
    const world = newWorld();
    const detail = objectDetail(controller, entries, simGraph(), world);
    expect(detail.nodes.map((n) => n.id)).toContain(
      'plant_pool_02/node:temperature-controller',
    );
    expect(detail.nodes[0]?.href).toBe(
      'bench.html?bench=sim-node&node=plant_pool_02%2Fnode%3Atemperature-controller',
    );
    expect(
      detail.nodes[0]?.fields.some(
        (f) => f.name === 'setpoint' && f.unit === '°C',
      ),
    ).toBe(true);
    expect(detail.behavior?.functions).toContain('stepPoolTemperatureControl');
    expect(detail.time).toBe(world.time);
  });

  it('labels missing graph and condition coverage honestly', () => {
    const generic = {
      ...controller,
      model: undefined,
      tag: undefined,
      kind: 'unknown',
      ref: 'unmodelled',
    };
    const detail = objectDetail(generic, entries, simGraph(), newWorld());
    expect(detail.nodes).toEqual([]);
    expect(detail.modelFinding).toMatch(/No executing simulation-graph node/);
    expect(detail.status).toBeUndefined();
    expect(detail.behavior).toBeUndefined();
  });
});
