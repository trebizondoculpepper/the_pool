import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import {
  LOUNGE_VALVES,
  loungeFlowsOf,
  loungeMeterReadings,
  loungeValveFlows,
  LOUNGE_WASTE_TAGS,
  closeLoungeWaste,
} from './lounge-valves';

describe('lounge pool solenoid valves', () => {
  it('models every installed valve', () => {
    // Their OPEN and SHUT are the filter mimic's (`lounge-filter-mimic.test.ts`).
    expect(LOUNGE_VALVES).toHaveLength(11);
  });

  it('travels to shut, blocks its filter path, and springs shut without power, not air', () => {
    let w = newWorld();
    expect(loungeValveFlows(w.loungeValvePositions, true).toPool).toBeCloseTo(
      90,
      0,
    );
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0003', open: false });
    w = stepWorld(w, 2);
    expect(w.loungeValvePositions['valve-0003']).toBeCloseTo(0.5);
    w = stepWorld(w, 2);
    expect(w.loungeValvePositions['valve-0003']).toBe(0);
    // One filter's path shut: the other takes more than its half, along
    // the pump's curve, but not the whole (#59).
    const one = loungeValveFlows(w.loungeValvePositions, true).toPool;
    expect(one).toBeGreaterThan(55);
    expect(one).toBeLessThan(75);
    // Electric actuators: losing the compressed air leaves them be.
    w = applyAction(w, { type: 'plant/source', utility: 'air', on: false });
    w = stepWorld(w, 4);
    expect(w.loungeValvePositions['valve-0001']).toBe(1);
    // Losing their room's power, their springs shut them.
    w = applyAction(w, {
      type: 'plant/feeder',
      room: 'plant_pool_01',
      on: false,
    });
    w = stepWorld(w, 4);
    expect(w.loungeValvePositions['valve-0001']).toBe(0);
    expect(loungeValveFlows(w.loungeValvePositions, true).toPool).toBe(0);
  });

  it('reports the tank drain’s own flow for its gully, separate from filter waste', () => {
    const positions = newWorld().loungeValvePositions;
    expect(loungeValveFlows(positions, true).tankDrain).toBe(0);
    positions['valve-0009'] = 0.5;
    expect(loungeValveFlows(positions, true).tankDrain).toBe(2.5);
    expect(loungeValveFlows(positions, false).tankDrain).toBe(0);
  });
  it('needs at least one pump discharge valve open to return water', () => {
    let w = newWorld();
    // Both pumps running: either's discharge valve open returns water.
    const both = { p1: true, p2: true };
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0097', open: false });
    w = stepWorld(w, 4);
    expect(
      loungeValveFlows(w.loungeValvePositions, true, both).toPool,
    ).toBeCloseTo(90, 0);
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0098', open: false });
    w = stepWorld(w, 4);
    expect(loungeValveFlows(w.loungeValvePositions, true, both).toPool).toBe(0);
    for (let i = 0; i < 10; i++) w = stepWorld(w, 10);
    expect(w.pools.pool_01.flow).toBeLessThan(1);
  });

  it('backwashes a filter with the other’s filtered water, down its outlet and out to waste (prompt 066)', () => {
    const positions = newWorld().loungeValvePositions;
    const tag = (t: string) => LOUNGE_VALVES.find((v) => v.tag === t)!.assetId;
    const set = (t: string, open: number) => (positions[tag(t)] = open);
    const service = loungeValveFlows(positions, true).filters;
    expect(service[0]).toBeCloseTo(45, 0);
    expect(service[1]).toBeCloseTo(45, 0);
    // F1 backwashed: inlet shut, outlet and backwash open.
    set('PL1-F1-IV1', 0);
    set('PL1-F1-BV1', 1);
    const washing = loungeValveFlows(positions, true);
    // At its wash rate (30 m/h over its 1.13 m²), up its outlet; F2, the
    // only filter now taking the pumps' water, carries more (#59).
    expect(washing.filters[0]).toBeCloseTo(-34, 0);
    expect(washing.backwash[0]).toBeCloseTo(34, 0);
    expect(washing.backwash[1]).toBe(0);
    expect(washing.filters[1]).toBeGreaterThan(55);
    // What F2 filters goes to the pool or back down F1 to waste.
    expect(washing.toPool + washing.backwash[0]).toBeCloseTo(
      washing.filters[1],
      0,
    );
    // Both backwashing: no filtered water to wash either.
    set('PL1-F2-IV1', 0);
    set('PL1-F2-BV1', 1);
    const both = loungeValveFlows(positions, true);
    expect(both.filters).toEqual([0, 0]);
    expect(both.toPool).toBe(0);
    // Pumps stopped: everything still.
    expect(loungeValveFlows(positions, false).filters).toEqual([0, 0]);
  });

  it('rinses a filter down through its bed to drain, inlet and drain open, outlet shut', () => {
    const positions = newWorld().loungeValvePositions;
    const tag = (t: string) => LOUNGE_VALVES.find((v) => v.tag === t)!.assetId;
    const set = (t: string, open: number) => (positions[tag(t)] = open);
    set('PL1-F2-IV2', 0);
    set('PL1-F2-DV1', 1);
    const rinsing = loungeValveFlows(positions, true);
    // Down through its bed, but nothing up its shut outlet, so its
    // flowmeter on the outlet reads none (as the Olympic's riser does).
    // Its rinse at about its service flow; F1 then takes the pumps' water
    // alone, a little more than its half (#59).
    expect(rinsing.beds[1]).toBeCloseTo(45, 0);
    expect(rinsing.filters[1]).toBe(0);
    expect(rinsing.drains[1]).toBeCloseTo(45, 0);
    expect(rinsing.filters[0]).toBeGreaterThan(45);
    expect(rinsing.toPool).toBeCloseTo(rinsing.filters[0], 0);
    // Its inlet shut too: only drained down, standing.
    set('PL1-F2-IV1', 0);
    const draining = loungeValveFlows(positions, true);
    expect(draining.filters[1]).toBe(0);
    expect(draining.beds[1]).toBe(0);
    expect(draining.drains[1]).toBe(3);
  });

  it('gives the lounge’s two flowmeters each filter’s signed flow, as the world runs', () => {
    let w = stepWorld(newWorld(), 5);
    const meters = loungeMeterReadings(loungeFlowsOf(w));
    expect(meters['filter-1']).toBeCloseTo(45, 0);
    expect(meters['filter-2']).toBeCloseTo(45, 0);
    for (const [id, open] of [
      [LOUNGE_VALVES.find((v) => v.tag === 'PL1-F1-IV1')!.assetId, false],
      [LOUNGE_VALVES.find((v) => v.tag === 'PL1-F1-BV1')!.assetId, true],
    ] as const)
      w = applyAction(w, { type: 'plant/valve', id, open });
    w = stepWorld(w, 5);
    // Backwashed: about its wash rate, up its outlet (#59).
    expect(loungeMeterReadings(loungeFlowsOf(w))['filter-1']).toBeCloseTo(
      -34,
      -0.5,
    );
  });
});

describe('PL1-CP1, its backwash pit interlock', () => {
  const inhibited = (w: ReturnType<typeof newWorld>, inhibit = true) => ({
    ...w,
    wetHall: { ...w.wetHall, inhibit },
  });

  it('shuts every valve to waste while the pit inhibits, and keeps them shut after', () => {
    let w = applyAction(newWorld(), {
      type: 'plant/valve',
      id: 'PL1-F2-BV1',
      open: true,
    });
    w = applyAction(w, { type: 'plant/valve', id: 'PL1-F2-IV1', open: false });
    expect(w.installedValves['valve-0006']).toBe(true);
    w = stepWorld(inhibited(w), 1);
    expect(w.installedValves['valve-0006']).toBe(false);
    // Its inlet, not a valve to waste, is left as it was.
    expect(w.installedValves['valve-0005']).toBe(false);
    // Cleared, it stays shut until opened again.
    w = stepWorld(inhibited(w, false), 1);
    expect(w.installedValves['valve-0006']).toBe(false);
  });

  it('refuses to open a valve to waste while the pit inhibits', () => {
    const w = inhibited(newWorld());
    for (const tag of LOUNGE_WASTE_TAGS)
      expect(
        applyAction(w, { type: 'plant/valve', id: tag, open: true })
          .installedValves,
      ).toBe(w.installedValves);
    // Other valves still work.
    expect(
      applyAction(w, { type: 'plant/valve', id: 'PL1-F1-IV1', open: false })
        .installedValves['valve-0001'],
    ).toBe(false);
  });

  it('leaves the commands alone when nothing is open to waste, or the pit is clear', () => {
    const commands = { 'valve-0006': true };
    expect(closeLoungeWaste(commands, false)).toBe(commands);
    const shut = { 'valve-0006': false };
    expect(closeLoungeWaste(shut, true)).toBe(shut);
    expect(closeLoungeWaste(commands, true)).toEqual({ 'valve-0006': false });
  });
});
