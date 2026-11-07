import { pruneNetwork, solveNetwork } from '../sim/hydraulics';
import type { NetLink, NetNode, NetSolution } from '../sim/hydraulics';
import {
  FILTER_PHYSICS,
  LOUNGE_SIZE,
  bedResistanceFactor,
  bedSizing,
} from './ideal-filter';
import type { IdealFilterState } from './ideal-filter';

/**
 * The Lounge plant room's circulation as one water network (#59): its
 * duty and standby pumps on their curves, each through its own discharge
 * valve, into a common discharge; the two filters in parallel, each an
 * inlet valve (IV1), its bed, and an outlet valve (IV2) to the filtered
 * water header; the header's return to the pool; and the waste paths, a
 * filter's backwash valve (BV1) from its top and its drain (DV1) from its
 * bottom. Solved together (`solveNetwork`), so every flow and every
 * pressure difference follows from the valves, the pumps and each bed's
 * own resistance: a fouled bed takes less, its partner more, and the total
 * falls along the pump's curve; a backwash, a rinse and a dump are just
 * valves set so. Pure; heads in metres of water, flows in m³/h.
 *
 * Calibrated to the room's design: one pump, clean beds, every valve open,
 * 45 m³/h through each filter (90 to the pool), 0.34 bar across each clean
 * bed; a backwash about its 30 m/h wash rate, a rinse about its service
 * flow.
 */

/** A filter's valves, 0 shut to 1 open. */
export interface LoungeFilterValves {
  inlet: number;
  outlet: number;
  backwash: number;
  drain: number;
}

/** What the network is asked with. */
export interface LoungeNetworkInput {
  /** Each running pump's discharge valve opening (0 for a pump not running). */
  pumps: readonly [number, number];
  filters: readonly [LoungeFilterValves, LoungeFilterValves];
  beds: readonly [IdealFilterState, IdealFilterState];
  /** The waste main open to the backwash pit. */
  wasteOpen: boolean;
}

/** Each filter's solved flows, m³/h, signed as the links run. */
export interface LoungeBranch {
  /** In at its inlet (IV1), down from the discharge. */
  inlet: number;
  /** Out of its outlet (IV2) to the header: + in service, − backwashed. */
  outlet: number;
  /** Down through its bed: + filtering or rinsing, − backwashed up through it. */
  bed: number;
  /** Out of its backwash valve (BV1) to waste. */
  backwash: number;
  /** Out of its drain (DV1) to waste. */
  drain: number;
  /** Its bed's pressure difference, bar, as its gauges read it. */
  dp: number;
}

export interface LoungeNetwork {
  toPool: number;
  branches: readonly [LoungeBranch, LoungeBranch];
  converged: boolean;
}

/** Metres of water per bar. */
const M_PER_BAR = 10.2;
/** The design point: each filter's service flow, and the room's. */
const BRANCH = 45;
const TOTAL = 2 * BRANCH;
/** An open valve's loss at its design flow, m. */
const VALVE_HEAD = 0.3;
/** A clean, sound bed's loss at 45 m³/h, m (0.34 bar, the room's gauges). */
const CLEAN_BED_HEAD = 0.34 * M_PER_BAR;
/** The return to the pool (heater, UV, pipework, inlets) at 90 m³/h, m. */
const RETURN_HEAD = 4;
/** The backwash pit's level against the pool's, m: the waste falls to it. */
const WASTE_HEAD = -3;
/** The pump's shut-off head against its duty head: a fixed-speed centrifugal pump. */
const SHUTOFF_RATIO = 1.35;

const r = (head: number, flow: number) => head / (flow * flow);
const CLEAN_BED_R = r(CLEAN_BED_HEAD, BRANCH);
const BRANCH_VALVE_R = r(VALVE_HEAD, BRANCH);
const PUMP_VALVE_R = r(VALVE_HEAD, TOTAL);
const RETURN_R = r(RETURN_HEAD, TOTAL);
/** The duty head at 90 m³/h: everything between the tank and the pool. */
const DUTY_HEAD =
  VALVE_HEAD + (VALVE_HEAD + CLEAN_BED_HEAD + VALVE_HEAD) + RETURN_HEAD;
export const LOUNGE_PUMP = {
  shutoff: SHUTOFF_RATIO * DUTY_HEAD,
  k: ((SHUTOFF_RATIO - 1) * DUTY_HEAD) / (TOTAL * TOTAL),
} as const;
/** A lifted bed's resistance: about its depth of head at its wash flow. */
const z = bedSizing(LOUNGE_SIZE, { dirt: 0, fissuring: 0, unsettled: 0 });
const LIFTED_R = r(z.bedDepth, z.washFlow);

/** A valve's link: shut below 2 % open, else its open loss over its opening squared. */
const valve = (
  id: string,
  from: string,
  to: string,
  opening: number,
  openR: number,
): NetLink =>
  opening < 0.02
    ? { id, kind: 'closed', from, to }
    : { id, kind: 'resistance', from, to, r: openR / (opening * opening) };

/** The network for these valves, beds and run resistances. */
function build(
  input: LoungeNetworkInput,
  lifted: readonly [boolean, boolean],
  runs: { backwash: number; drain: number },
  returnShut = false,
) {
  const nodes: NetNode[] = [
    { id: 'tank', head: 0 },
    { id: 'pool', head: 0 },
    { id: 'waste', head: WASTE_HEAD },
    { id: 'discharge' },
    { id: 'header' },
  ];
  const links: NetLink[] = [];
  input.pumps.forEach((opening, i) => {
    if (opening < 0.02) return;
    nodes.push({ id: `p${i}` });
    links.push(
      {
        id: `pump${i}`,
        kind: 'pump',
        from: 'tank',
        to: `p${i}`,
        ...LOUNGE_PUMP,
      },
      valve(`pumpValve${i}`, `p${i}`, 'discharge', opening, PUMP_VALVE_R),
    );
  });
  input.filters.forEach((v, i) => {
    // A filter with neither its inlet nor its outlet open takes no pumped
    // water: it is out of the circuit (its drain only drains it down, by
    // gravity, `loungeValveFlows`).
    if (Math.max(v.inlet, v.outlet) < 0.02) return;
    const top = `f${i}.top`;
    const bottom = `f${i}.bottom`;
    nodes.push({ id: top }, { id: bottom });
    const bedR = lifted[i]
      ? LIFTED_R
      : CLEAN_BED_R * bedResistanceFactor(LOUNGE_SIZE, input.beds[i]);
    const waste = input.wasteOpen ? 1 : 0;
    links.push(
      valve(`inlet${i}`, 'discharge', top, v.inlet, BRANCH_VALVE_R),
      { id: `bed${i}`, kind: 'resistance', from: top, to: bottom, r: bedR },
      valve(`outlet${i}`, bottom, 'header', v.outlet, BRANCH_VALVE_R),
      valve(`backwash${i}`, top, 'waste', v.backwash * waste, runs.backwash),
      valve(`drain${i}`, bottom, 'waste', v.drain * waste, runs.drain),
    );
  });
  // The return to the pool, through its non-return valve: pool water
  // never runs back down it to waste (shut when it would, `solveWith`).
  links.push(
    returnShut
      ? { id: 'return', kind: 'closed', from: 'header', to: 'pool' }
      : {
          id: 'return',
          kind: 'resistance',
          from: 'header',
          to: 'pool',
          r: RETURN_R,
        },
  );
  return pruneNetwork(nodes, links);
}

/** Solve, lifting any bed washed up at its lift share of its wash flow, and solve again. */
function solveWith(
  input: LoungeNetworkInput,
  runs: { backwash: number; drain: number },
): NetSolution {
  let lifted: [boolean, boolean] = [false, false];
  let returnShut = false;
  const solve = () => {
    const { nodes, links } = build(input, lifted, runs, returnShut);
    const out = solveNetwork(nodes, links);
    // Its non-return valve: water would run back from the pool, so it shuts.
    if (!returnShut && (out.flows.return ?? 0) < -0.05) {
      returnShut = true;
      const shut = build(input, lifted, runs, true);
      return solveNetwork(shut.nodes, shut.links);
    }
    return out;
  };
  let sol = solve();
  const up = [0, 1].map((i) => -(sol.flows[`bed${i}`] ?? 0));
  const lift = up.map((u) => u >= FILTER_PHYSICS.liftShare * z.washFlow);
  if (lift[0] || lift[1]) {
    lifted = [lift[0], lift[1]];
    sol = solve();
  }
  return sol;
}

/** Find a run's resistance that gives `target` m³/h through `link` in `input`, by bisection on its log. */
function calibrate(
  target: number,
  input: LoungeNetworkInput,
  link: string,
  which: 'backwash' | 'drain',
): number {
  let lo = Math.log(1e-6);
  let hi = Math.log(10);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const runs = { backwash: 1e-3, drain: 1e-3, [which]: Math.exp(mid) };
    const q = Math.abs(solveWith(input, runs).flows[link] ?? 0);
    // More resistance, less flow.
    if (q > target) lo = mid;
    else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

const CLEAN: IdealFilterState = { dirt: 0, fissuring: 0, unsettled: 0 };
const SERVICE: LoungeFilterValves = {
  inlet: 1,
  outlet: 1,
  backwash: 0,
  drain: 0,
};
/**
 * The waste runs, calibrated once against the design: F1 backwashed (inlet
 * shut, outlet and backwash open) while F2 filters gives its wash rate; F1
 * rinsed (inlet and drain open, outlet shut) while F2 filters gives about
 * its service flow.
 */
const RUNS = (() => {
  const backwash = calibrate(
    z.washFlow,
    {
      pumps: [1, 0],
      filters: [{ inlet: 0, outlet: 1, backwash: 1, drain: 0 }, SERVICE],
      beds: [CLEAN, CLEAN],
      wasteOpen: true,
    },
    'backwash0',
    'backwash',
  );
  const drain = calibrate(
    BRANCH,
    {
      pumps: [1, 0],
      filters: [{ inlet: 1, outlet: 0, backwash: 0, drain: 1 }, SERVICE],
      beds: [CLEAN, CLEAN],
      wasteOpen: true,
    },
    'drain0',
    'drain',
  );
  return { backwash, drain };
})();

/**
 * Recent answers, kept while nothing that sets them has changed: valves to
 * the hundredth of their travel, pumps, waste and each bed's resistance to
 * the hundredth (a 1 % change moves the flow by about half that). Several
 * are kept, since one world step asks with more than one set of inputs
 * (its pool's turnover, its gauges, its alarms); the oldest goes first.
 */
const CACHE_SIZE = 16;
const cache = new Map<string, LoungeNetwork>();
const keyOf = (input: LoungeNetworkInput) =>
  [
    input.wasteOpen ? 1 : 0,
    ...input.pumps.map((p) => p.toFixed(2)),
    ...input.filters.flatMap((v) =>
      [v.inlet, v.outlet, v.backwash, v.drain].map((x) => x.toFixed(2)),
    ),
    ...input.beds.map((b) => bedResistanceFactor(LOUNGE_SIZE, b).toFixed(2)),
  ].join(',');

/** The Lounge's circulation, solved (#59). */
export function solveLounge(input: LoungeNetworkInput): LoungeNetwork {
  const key = keyOf(input);
  const known = cache.get(key);
  if (known) return known;
  const network = solveUncached(input);
  cache.set(key, network);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return network;
}

function solveUncached(input: LoungeNetworkInput): LoungeNetwork {
  const sol = solveWith(input, RUNS);
  const f = (id: string) => {
    const v = sol.flows[id] ?? 0;
    return Math.abs(v) < 0.05 ? 0 : v;
  };
  const branch = (i: number): LoungeBranch => ({
    inlet: f(`inlet${i}`),
    outlet: f(`outlet${i}`),
    bed: f(`bed${i}`),
    backwash: f(`backwash${i}`),
    drain: f(`drain${i}`),
    dp:
      Math.abs(
        (sol.heads[`f${i}.top`] ?? 0) - (sol.heads[`f${i}.bottom`] ?? 0),
      ) / M_PER_BAR,
  });
  return {
    toPool: Math.max(0, f('return')),
    branches: [branch(0), branch(1)],
    converged: sol.converged,
  };
}
