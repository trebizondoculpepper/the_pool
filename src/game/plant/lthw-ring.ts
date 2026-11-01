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
 * supply (`ringSupply`) stands in for the boiler cascade until mission
 * 121's sequencer: capacity-limited, modulating to hold the set point, none
 * without gas, power or flow. The losses are a small fixed UA to the
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
  /** How fast the supply closes a gap at the header, seconds (its proportional term's time constant). */
  response: 120,
  /** Below this supply, kW, the stand-in's boilers count as not firing. */
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
  /** Boilers in service, for the stand-in supply's capacity (mission 121 gives the boilers' own states). */
  boilers: number;
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
    boilers: RING.boilers,
    supply: 0,
    demand: 0,
    delivered: 0,
    losses: 0,
    firing: false,
    draws: {},
    areas: {},
  };
}

/** What the boiler house can give the ring now. */
export interface SupplyConditions {
  /** Gas at the boilers' own isolators: the ECV and SSOV open (`boilerGasOn`). */
  gas: boolean;
  /** The boiler house's power. */
  powered: boolean;
  /** Water through the boilers: their flow switches made. */
  circulating: boolean;
  /** Boilers in service. */
  boilers: number;
}

/** The supply's capacity, kW: its boilers in service at full fire, none without gas, power or flow. */
export function supplyCapacity(c: SupplyConditions): number {
  if (!c.gas || !c.powered || !c.circulating) return 0;
  return Math.max(0, Math.min(RING.boilers, c.boilers)) * RING.boilerKW;
}

/**
 * The supply now, kW: the stand-in for the boiler cascade (mission 121
 * swaps its sequencer in here). It gives the ring's load (`load`, the
 * consumers' draw and the losses) and closes the gap to its set point over
 * `RING.response`, between nothing and its capacity.
 */
export function ringSupply(flow: number, capacity: number, load: number) {
  const want = load + (RING_CAPACITY * (RING.setpoint - flow)) / RING.response;
  return Math.max(0, Math.min(capacity, want));
}

/** What the ring takes in a step. */
export interface RingInputs {
  /** The supply's capacity, kW (`supplyCapacity`). */
  capacity: number;
  /** Whether its pumps move its water. */
  circulating: boolean;
  /** The consumers' draws this step, kW, by id, and what they asked in all. */
  draws: Record<string, number>;
  demand: number;
  /** The heated areas' temperatures after the step. */
  areas?: Record<string, number>;
}

/**
 * The ring `dt` seconds on, in sub-steps of at most five seconds, the
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
  const n = Math.max(1, Math.ceil(dt / 5));
  const h = dt / n;
  let flow = s.flow;
  let supply = 0;
  let losses = 0;
  for (let i = 0; i < n; i++) {
    const lost = RING.lossUA * (flow - RING.roomAir);
    const given = ringSupply(flow, inputs.capacity, delivered + lost);
    flow += ((given - delivered - lost) * h) / RING_CAPACITY;
    supply += given / n;
    losses += lost / n;
  }
  return {
    ...s,
    flow,
    return: inputs.circulating
      ? flow - delivered / (WATER_HEAT * RING.flow)
      : flow,
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
