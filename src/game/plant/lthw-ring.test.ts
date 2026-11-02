import { describe, expect, it } from 'vite-plus/test';
import {
  RING,
  RING_CAPACITY,
  consumerK,
  newLthwRing,
  ringDraw,
  stepRing,
} from './lthw-ring';
import { WATER_HEAT } from './heat-loop';

/** A supply that holds the set point against `load`, within `capacity` (a stand-in for the boilers). */
const holding = (capacity: number, load: number) => (flow: number) =>
  Math.max(
    0,
    Math.min(capacity, load + (RING_CAPACITY * (RING.setpoint - flow)) / 120),
  );

describe('the LTHW ring', () => {
  it('starts at its set point, its pumps running', () => {
    const r = newLthwRing();
    expect(r.flow).toBe(RING.setpoint);
    expect(r.pumps).toBe(true);
  });

  it('has a time constant of minutes: its water against a full plant', () => {
    const minutes = RING_CAPACITY / (RING.boilers * RING.boilerKW) / 60;
    expect(minutes).toBeGreaterThan(0.1);
    // Against the pools' usual 300 kW, about a degree a minute.
    expect((300 / RING_CAPACITY) * 60).toBeGreaterThan(0.5);
    expect((300 / RING_CAPACITY) * 60).toBeLessThan(2);
  });

  it('takes its supply in each sub-step, given its flow, return and the sub-step', () => {
    const seen: [number, number, number][] = [];
    stepRing(
      newLthwRing(),
      {
        supply: (flow, ret, h) => (seen.push([flow, ret, h]), 0),
        circulating: true,
        draws: { a: 93.04 },
        demand: 93.04,
        maxStep: 1,
      },
      3,
    );
    expect(seen).toHaveLength(3);
    expect(seen[0][0]).toBe(RING.setpoint);
    expect(seen[0][0] - seen[0][1]).toBeCloseTo(1, 6);
    expect(seen[0][2]).toBe(1);
  });

  it('gives each consumer what it asks while hot, and less as it cools', () => {
    const k = consumerK(250, 30);
    expect(k).toBeCloseTo(5, 9);
    expect(ringDraw(200, k, 80, 30)).toBe(200);
    expect(ringDraw(200, k, 60, 30)).toBeCloseTo(150, 9);
    expect(ringDraw(200, k, 25, 30)).toBe(0);
  });

  it('holds its set point under a steady load, the return below by the load over its flow', () => {
    let r = newLthwRing();
    for (let i = 0; i < 60; i++)
      r = stepRing(
        r,
        {
          supply: holding(1800, 300 + RING.lossUA * (80 - RING.roomAir)),
          circulating: true,
          draws: { a: 200, b: 100 },
          demand: 300,
        },
        10,
      );
    expect(r.flow).toBeCloseTo(RING.setpoint, 6);
    expect(r.supply).toBeCloseTo(300 + r.losses, 6);
    expect(r.losses).toBeCloseTo(RING.lossUA * (80 - RING.roomAir), 6);
    expect(r.return).toBeCloseTo(80 - 300 / (WATER_HEAT * RING.flow), 6);
    expect(r.firing).toBe(true);
  });

  it('falls without supply, about a degree a minute under 300 kW', () => {
    const r = stepRing(
      newLthwRing(),
      { supply: () => 0, circulating: true, draws: { a: 300 }, demand: 300 },
      60,
    );
    expect(r.supply).toBe(0);
    expect(r.firing).toBe(false);
    expect(80 - r.flow).toBeGreaterThan(0.5);
    expect(80 - r.flow).toBeLessThan(1.5);
  });

  it('balances its energy: supplied = delivered + lost + stored', () => {
    let r = { ...newLthwRing(), flow: 50 };
    let supplied = 0;
    let delivered = 0;
    let lost = 0;
    for (let i = 0; i < 200; i++) {
      const before = r.flow;
      const dt = 7 + (i % 5);
      const draw = 150 + 100 * Math.sin(i / 10);
      r = stepRing(
        r,
        {
          supply: i < 100 ? holding(600, draw) : () => 0,
          circulating: true,
          draws: { a: draw },
          demand: draw,
        },
        dt,
      );
      supplied += r.supply * dt;
      delivered += r.delivered * dt;
      lost += r.losses * dt;
      expect(r.supply * dt).toBeCloseTo(
        r.delivered * dt + r.losses * dt + RING_CAPACITY * (r.flow - before),
        6,
      );
    }
    expect(supplied).toBeGreaterThan(0);
    expect(delivered + lost).toBeGreaterThan(0);
  });
});
