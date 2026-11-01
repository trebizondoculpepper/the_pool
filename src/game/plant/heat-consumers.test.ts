import { describe, expect, it } from 'vite-plus/test';
import {
  AREAS,
  DESIGN_OUTSIDE,
  MUSEUM_FLOOR,
  areaParams,
  stepAreas,
} from './heat-consumers';
import { RING } from './lthw-ring';

const HOT = { flow: RING.setpoint, circulating: true };
const museum = AREAS.find((a) => a.id === 'museum')!;

describe('the ring’s other consumers', () => {
  it('lists the museum, reception, changing and its hot water, each once', () => {
    expect(AREAS.map((a) => a.id)).toEqual([
      'museum',
      'reception',
      'changing',
      'dhw',
    ]);
  });

  it('sizes the museum’s heating to its ten halls’ floor at 60 W/m²', () => {
    expect(MUSEUM_FLOOR).toBeGreaterThan(2500);
    expect(MUSEUM_FLOOR).toBeLessThan(3500);
    const p = areaParams(museum);
    expect(p.design).toBeCloseTo((MUSEUM_FLOOR * 60) / 1000, 9);
    // Its UA holds its set point at the design outside on its design load.
    expect(p.ua * (museum.setpoint - DESIGN_OUTSIDE)).toBeCloseTo(p.design, 9);
  });

  it('holds the museum at its set point on the ring, asking its loss', () => {
    let r = stepAreas({}, HOT, 12, 3600);
    for (let h = 0; h < 5; h++) r = stepAreas(r.temps, HOT, 12, 3600);
    expect(r.temps.museum).toBeCloseTo(20, 0);
    const p = areaParams(museum);
    expect(r.draws.museum).toBeCloseTo(p.ua * (20 - 12), -1);
  });

  it('asks nothing for the areas not yet built', () => {
    const r = stepAreas({}, HOT, -5, 3600);
    for (const id of ['reception', 'changing', 'dhw']) {
      expect(r.asked[id], id).toBe(0);
      expect(r.draws[id], id).toBe(0);
    }
  });

  it('cools the museum over hours without the ring', () => {
    let temps: Record<string, number> = {};
    let draws = 0;
    for (let h = 0; h < 6; h++) {
      const r = stepAreas(temps, { flow: 80, circulating: false }, 0, 3600);
      temps = r.temps;
      draws += r.draws.museum!;
    }
    expect(draws).toBe(0);
    expect(temps.museum).toBeLessThan(18);
    expect(temps.museum).toBeGreaterThan(10);
  });

  it('gives it less from a cool ring', () => {
    const cold = stepAreas(
      { museum: 15 },
      { flow: 25, circulating: true },
      0,
      60,
    );
    const hot = stepAreas({ museum: 15 }, HOT, 0, 60);
    expect(cold.draws.museum).toBeLessThan(hot.draws.museum!);
    expect(cold.asked.museum).toBeCloseTo(hot.asked.museum!, 6);
  });
});
