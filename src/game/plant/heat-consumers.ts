import { HALL_PLACES } from '../../toolkit/gallery/logic/museum-layout';
import { consumerK, ringDraw } from './lthw-ring';
import type { PoolId } from './pools';

/**
 * The LTHW ring's consumers (mission 120), as one list: each pool's heat
 * exchanger and its hall's coils (their thermostats and heat are
 * `thermal.ts`'s), and the other areas the boiler house heats, each a
 * space with a design load, a thermostat and a heat loss (`AREAS`). A new
 * area is one more entry in `AREAS`; nothing else names the set.
 *
 * An area is one body (its air and its fabric) at its temperature, losing
 * heat to the outside through its fabric and ventilation in one UA, set so
 * that at the design outside temperature its design load holds it at its
 * set point; its heaters give up to `headroom` times that, by a
 * proportional thermostat, as far as the ring is hot enough
 * (`ringDraw`). An area not yet built has no load: it asks nothing. Pure;
 * kW, kJ/K, °C, seconds.
 */

/** One heated area on the ring. */
export interface AreaHeating {
  id: string;
  /** Its name, as the energy mimic labels its row. */
  name: string;
  /** Its heated floor, m². */
  area: number;
  /** Its design heat loss, W per m² of floor, at the design outside temperature. */
  wPerM2: number;
  /** Its thermostat's setting, °C. */
  setpoint: number;
  /** Its fabric's and contents' heat capacity, kJ/K per m² of floor. */
  massPerM2: number;
}

/** The design outside temperature, °C (CIBSE Guide A, southern England, about −3 °C). */
export const DESIGN_OUTSIDE = -3;
/** Each area's heaters' output over its design load, for warming up. */
export const AREA_HEADROOM = 1.2;
/** An area thermostat's proportional band, K. */
export const AREA_BAND = 0.5;

/** The museum's heated floor, m²: its ten halls (`museum-layout.ts`). */
export const MUSEUM_FLOOR = HALL_PLACES.reduce((t, p) => t + p.w * p.d, 0);

/**
 * The areas the ring heats, besides the pools. The museum: 50 W/m² at
 * −3 °C (a well-insulated building of about 2000, the low end of the
 * usual 50–80 W/m² rule of thumb), held at 20 °C, a heavy building's
 * 100 kJ/K per m² (about thirteen hours to cool by a factor e).
 * Reception, changing and its showers' hot water (DHW): not built yet,
 * so no load until they are.
 */
export const AREAS: readonly AreaHeating[] = [
  {
    id: 'museum',
    name: 'MUSEUM',
    area: MUSEUM_FLOOR,
    wPerM2: 50,
    setpoint: 20,
    massPerM2: 100,
  },
  {
    id: 'reception',
    name: 'RECEPTION',
    area: 0,
    wPerM2: 0,
    setpoint: 21,
    massPerM2: 100,
  },
  {
    id: 'changing',
    name: 'CHANGING',
    area: 0,
    wPerM2: 0,
    setpoint: 24,
    massPerM2: 100,
  },
  {
    id: 'dhw',
    name: 'DHW',
    area: 0,
    wPerM2: 0,
    setpoint: 60,
    massPerM2: 100,
  },
];

/** An area's figures: design load, kW; UA, kW/K; heaters' output, kW; capacity, kJ/K; conductance, kW/K. */
export function areaParams(a: AreaHeating) {
  const design = (a.area * a.wPerM2) / 1000;
  const output = AREA_HEADROOM * design;
  return {
    design,
    ua: design / (a.setpoint - DESIGN_OUTSIDE),
    output,
    capacity: a.area * a.massPerM2,
    k: consumerK(output, a.setpoint),
  };
}

/** Each pool's two consumers' ids: its water's heat exchanger and its hall's coils. */
export const poolConsumer = (id: PoolId, which: 'water' | 'air') =>
  `${id}/${which}`;

/** The areas `dt` seconds on: their temperatures, and what each asked and drew, kW. */
export function stepAreas(
  temps: Record<string, number>,
  ring: { flow: number; circulating: boolean },
  ambient: number,
  dt: number,
): {
  temps: Record<string, number>;
  asked: Record<string, number>;
  draws: Record<string, number>;
} {
  const out: Record<string, number> = {};
  const asked: Record<string, number> = {};
  const draws: Record<string, number> = {};
  for (const a of AREAS) {
    const p = areaParams(a);
    let t = temps[a.id] ?? a.setpoint;
    let ask = 0;
    let draw = 0;
    if (p.capacity > 0 && p.output > 0) {
      const n = Math.max(1, Math.ceil(dt / 30));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const want =
          p.output * Math.min(1, Math.max(0, (a.setpoint - t) / AREA_BAND));
        const q = ring.circulating ? ringDraw(want, p.k, ring.flow, t) : 0;
        t += ((q - p.ua * (t - ambient)) * h) / p.capacity;
        ask += want / n;
        draw += q / n;
      }
    }
    out[a.id] = t;
    asked[a.id] = ask;
    draws[a.id] = draw;
  }
  return { temps: out, asked, draws };
}
