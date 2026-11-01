import { describe, expect, it } from 'vite-plus/test';
import {
  RING,
  RING_CAPACITY,
  consumerK,
  newLthwRing,
  ringDraw,
  ringSupply,
  stepRing,
  supplyCapacity,
} from './lthw-ring';
import { WATER_HEAT } from './heat-loop';

const ON = { gas: true, powered: true, circulating: true, boilers: 6 };

describe('the LTHW ring', () => {
  it('starts at its set point, its pumps running and its six boilers in service', () => {
    const r = newLthwRing();
    expect(r.flow).toBe(RING.setpoint);
    expect(r.pumps).toBe(true);
    expect(r.boilers).toBe(6);
  });

  it('has a time constant of minutes: its water against a full plant', () => {
    const minutes = RING_CAPACITY / (RING.boilers * RING.boilerKW) / 60;
    expect(minutes).toBeGreaterThan(0.1);
    // Against the pools' usual 300 kW, about a degree a minute.
    expect((300 / RING_CAPACITY) * 60).toBeGreaterThan(0.5);
    expect((300 / RING_CAPACITY) * 60).toBeLessThan(2);
  });

  it('can give up to its boilers in service, and nothing without gas, power or flow', () => {
    expect(supplyCapacity(ON)).toBe(1800);
    expect(supplyCapacity({ ...ON, boilers: 2 })).toBe(600);
    expect(supplyCapacity({ ...ON, gas: false })).toBe(0);
    expect(supplyCapacity({ ...ON, powered: false })).toBe(0);
    expect(supplyCapacity({ ...ON, circulating: false })).toBe(0);
  });

  it('modulates to its load at its set point, and to its capacity when cold', () => {
    expect(ringSupply(RING.setpoint, 1800, 300)).toBeCloseTo(300, 9);
    expect(ringSupply(40, 1800, 300)).toBe(1800);
    expect(ringSupply(90, 1800, 300)).toBe(0);
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
          capacity: 1800,
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
      { capacity: 0, circulating: true, draws: { a: 300 }, demand: 300 },
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
          capacity: i < 100 ? 600 : 0,
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
