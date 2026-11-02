import { GAS_ENERGY, WATER_HEAT } from './heat-loop';

/**
 * The low temperature hot water (LTHW) ring (mission 120): one lumped
 * circuit, the boilers' flow header out to every heat load and back. Its
 * water (the boilers', the low-loss header's, the pipework's and the
 * exchangers' primaries) is one body at its flow temperature, `T_flow`:
 *
 *   M·c·dT_flow/dt = Q_supply − ΣQ_consumers − Q_losses
 *
 * The consumers (each pool's heat exchanger and hall coils, the museum,
 * reception, changing and its hot water: `heat-consumers.ts`) each draw
 * `min(demand, k·max(0, T_flow − T_secondary))`: what its own thermostat
 * and control valve ask, as far as the ring is hot enough to give it. The
 * supply is the boiler house's (mission 121, `boiler-plant.ts`): its six
 * boilers' outputs, as their sequencer fires them, stepped with the ring
 * in each sub-step. The losses are a small fixed UA to the
 * boiler house's air. The return is the flow less what the loads took
 * from the ring's circulation.
 *
 * kW are kJ/s: the model works in kW, kJ/K and seconds throughout. Pure.
 */
export const RING = {
  /** The flow header's set point, °C: fixed, as a pool plant's primary runs (research §2.2). */
  setpoint: 80,
  /** The ring's water, m³: six boilers' (about 60 l each), the low-loss header's (0.5), about 300 m of DN100–150 pipe (3.2) and the exchangers' primaries (0.9). */
  volume: 5,
  /** Its pumps' flow, m³/h: the plant's full output at a 20 K drop (1800 / (1.163 × 20) ≈ 77). */
  flow: 80,
  /** Its losses, kW/K: insulated pipework and the boilers' casings, about 18 kW at 80 °C. */
  lossUA: 0.3,
  /** The boiler house's air, °C, its losses' sink (not modelled; warm, as boiler houses are). */
  roomAir: 20,
  /** The boilers (B-501 to B-506) and each one's rated output, kW (`condensingBoilerModel`, HW 300). */
  boilers: 6,
  boilerKW: 300,
  /** Below this supply, kW, the boilers count as not firing. */
  firing: 0.5,
} as const;

/** The ring's water's heat capacity, kJ/K (water 4.19 MJ/m³·K). */
export const RING_CAPACITY = RING.volume * 4190;

/** A consumer's conductance, kW/K: its full `output` at the design flow temperature, its secondary at `secondary` °C. */
export const consumerK = (output: number, secondary: number) =>
  output / Math.max(1, RING.setpoint - secondary);

/** What a consumer draws, kW: what it asks, as far as the ring can give it. */
export const ringDraw = (
  demand: number,
  k: number,
  flow: number,
  secondary: number,
) => Math.max(0, Math.min(demand, k * Math.max(0, flow - secondary)));

export interface LthwRingState {
  /** The flow header's temperature, °C. */
  flow: number;
  /** The common return's, °C. */
  return: number;
  /** Its circulating pumps switched to run (they run while the boiler house has power). */
  pumps: boolean;
  /** The last step's mean flows, kW: supplied by the boilers, asked by the loads, delivered to them, lost. */
  supply: number;
  demand: number;
  delivered: number;
  losses: number;
  /** Whether the supply is firing. */
  firing: boolean;
  /** Each consumer's draw, kW, by its id (`heat-consumers.ts`). */
  draws: Record<string, number>;
  /** Each heated area's temperature, °C, by its id (`AREAS`); an area missing starts at its set point. */
  areas: Record<string, number>;
}

export function newLthwRing(): LthwRingState {
  return {
    flow: RING.setpoint,
    return: RING.setpoint,
    pumps: true,
    supply: 0,
    demand: 0,
    delivered: 0,
    losses: 0,
    firing: false,
    draws: {},
    areas: {},
  };
}

/** What the ring takes in a step. */
export interface RingInputs {
  /**
   * The supply through a sub-step, kW, given the flow and return at its
   * start and its length, s: the boiler house stepped with the ring
   * (`boiler-plant.ts`), or a fixed figure.
   */
  supply: (flow: number, ret: number, h: number) => number;
  /** Whether its pumps move its water. */
  circulating: boolean;
  /** The consumers' draws this step, kW, by id, and what they asked in all. */
  draws: Record<string, number>;
  demand: number;
  /** The heated areas' temperatures after the step. */
  areas?: Record<string, number>;
  /** Its longest sub-step, s (by default five). */
  maxStep?: number;
}

/**
 * The ring `dt` seconds on, in sub-steps of at most five seconds (or
 * `maxStep`), the supply worked out in each, the
 * consumers' draws held through the step (they were worked out at its
 * start's flow temperature). Its flows are the step's means, so that over
 * any run supplied = delivered + lost + the water's stored change.
 */
export function stepRing(
  s: LthwRingState,
  inputs: RingInputs,
  dt: number,
): LthwRingState {
  const delivered = Object.values(inputs.draws).reduce((t, q) => t + q, 0);
  const n = Math.max(1, Math.ceil(dt / (inputs.maxStep ?? 5)));
  const h = dt / n;
  const drop = inputs.circulating ? delivered / (WATER_HEAT * RING.flow) : 0;
  let flow = s.flow;
  let supply = 0;
  let losses = 0;
  for (let i = 0; i < n; i++) {
    const lost = RING.lossUA * (flow - RING.roomAir);
    const given = Math.max(0, inputs.supply(flow, flow - drop, h));
    flow += ((given - delivered - lost) * h) / RING_CAPACITY;
    supply += given / n;
    losses += lost / n;
  }
  return {
    ...s,
    flow,
    return: flow - drop,
    supply,
    demand: inputs.demand,
    delivered,
    losses,
    firing: supply > RING.firing,
    draws: inputs.draws,
    areas: inputs.areas ?? s.areas,
  };
}

/** The boilers' seasonal efficiency, as the gas meter has always counted it (`site-intake.ts`). */
export const RING_EFFICIENCY = 0.9;

/** The boilers' gas, m³/h, for the supply's kW. */
export const ringGasM3h = (supply: number) =>
  Math.max(0, supply) / (GAS_ENERGY * RING_EFFICIENCY);
