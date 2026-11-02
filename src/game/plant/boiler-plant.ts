import {
  newBoiler,
  pressBoiler,
  setBoilerSetpoint,
  stepBoiler,
} from '../../toolkit/components/plant/logic/boiler-house';
import type {
  BoilerKey,
  BoilerState,
} from '../../toolkit/components/plant/logic/boiler-house';
import {
  boilersPermitted,
  flueTarget,
  newCombustion,
  resetCombustion,
  setFan,
  stepCombustion,
} from '../../toolkit/components/plant/logic/combustion';
import type { CombustionState } from '../../toolkit/components/plant/logic/combustion';
import {
  SEQUENCER,
  acceptSequencerAlarms,
  calledBoilers,
  newBoilerSequencer,
  plantEnabled,
  sequencerTargets,
  setPlantEnable,
  setPlantRun,
  setSequencerSetting,
  stepBoilerSequencer,
} from './boiler-sequencer';
import type {
  BoilerSequencerState,
  LeadRotation,
  PlantEnable,
  SequencerSetting,
} from './boiler-sequencer';
import { WATER_HEAT } from './heat-loop';
import { RING } from './lthw-ring';

/**
 * The boiler house in the world (mission 121): its six boilers' own
 * controllers (B-501 to B-506, `boiler-house.ts`, each with its codes,
 * purge, ignition, run-on and lockouts), its combustion air and flues
 * (`combustion.ts`), and the sequencer above them (`boiler-sequencer.ts`).
 * They run whichever room the player is in; the boiler house's panels,
 * its mimics and the control room's copies only show them and act on them.
 *
 * Each sub-step the sequencer reads the ring's flow header and calls the
 * boilers, each boiler's controller steps with its call and its firing-
 * rate target, and what the firing boilers give (rate × 300 kW) is the
 * ring's supply (`lthw-ring.ts`). The ring's flow passes through the
 * firing boilers, shared between them, so each sees the common return and
 * a rise of its output over its share of the flow. Pure.
 */

export const BOILER_TAGS = [
  'B-501',
  'B-502',
  'B-503',
  'B-504',
  'B-505',
  'B-506',
] as const;

/** How fouled each boiler's heat exchanger is, 0 to 1: B-502's is due a clean, so its flue runs hotter. */
export const FOULING = [0, 0.35, 0.1, 0.25, 0.15, 0.3] as const;

/** The system pressure the boilers see, bar (the pressurisation unit's). */
export const SYSTEM_PRESSURE = 2.4;

export interface BoilerHouseState {
  boilers: BoilerState[];
  combustion: CombustionState;
  sequencer: BoilerSequencerState;
}

/** What the boiler house has around it this step. */
export interface BoilerHouseConditions {
  /** Gas at the boilers: the street's, the ECV and the SSOV open. */
  gas: boolean;
  /** The boiler house's power. */
  powered: boolean;
  /** The ring's water moving: the boilers' flow switches made. */
  circulating: boolean;
  /** Outside, °C. */
  outside: number;
  /** Whether any load is calling for heat. */
  loadCalling: boolean;
}

/**
 * A new game's boiler house: the plant in AUTO and started, B-501 leading
 * at a quarter fire (a new game's pools start at temperature, so its load
 * starts at some 70 kW and climbs over the hour towards 424 kW, when
 * B-502 joins it), its flue warm; the others in standby, their hours run
 * spread so the lead rotates.
 */
export function newBoilerHouse(): BoilerHouseState {
  const load = 70;
  const seq = newBoilerSequencer();
  const demand = load / (SEQUENCER.boilers * RING.boilerKW);
  const sequencer: BoilerSequencerState = {
    ...seq,
    called: [0],
    demand,
    integral: demand,
    stageTimer: 600,
    sinceChange: seq.sinceChange.map((t, i) => (i < 1 ? 600 : t)),
    hoursRun: [4210, 4380, 4450, 4300, 4520, 4290],
    starts: [1310, 1295, 1342, 1288, 1361, 1302],
  };
  const targets = sequencerTargets(sequencer);
  const boilers = BOILER_TAGS.map((_, i) => {
    const b = newBoiler();
    if (i > 0) return { ...b, flow: 78, return: 78 };
    const rate = targets[i];
    return {
      ...b,
      code: 3 as const,
      timer: 600,
      rate,
      return: 79.2,
      flow: 80,
    };
  });
  const combustion = newCombustion(BOILER_TAGS.length);
  return {
    boilers,
    combustion: {
      ...combustion,
      flues: boilers.map((b, i) =>
        b.code === 3 ? flueTarget(b, FOULING[i]) : combustion.flues[i],
      ),
    },
    sequencer,
  };
}

/** A boiler's output into the ring, kW: its rate of 300 kW while its flame is proven. */
export const boilerOutput = (b: BoilerState) =>
  b.code === 3 ? Math.max(0, Math.min(1, b.rate)) * RING.boilerKW : 0;

/** The boiler house's output into the ring, kW. */
export const boilerHouseOutput = (house: BoilerHouseState) =>
  house.boilers.reduce((q, b) => q + boilerOutput(b), 0);

/** Whether boiler `i` can fire: on, not locked out or blocked, with gas, power, combustion air and flow. */
export function boilerAvailable(
  house: BoilerHouseState,
  i: number,
  c: Pick<BoilerHouseConditions, 'gas' | 'powered' | 'circulating'>,
): boolean {
  const b = house.boilers[i];
  return (
    c.gas &&
    c.powered &&
    c.circulating &&
    b.on &&
    b.lockout === null &&
    b.code !== 9 &&
    boilersPermitted(house.combustion)
  );
}

/** The boiler house one sub-step on, `h` seconds, the ring's header at `flow` and its return at `ret`. */
export function stepBoilerHouse(
  house: BoilerHouseState,
  c: BoilerHouseConditions,
  flow: number,
  ret: number,
  h: number,
): BoilerHouseState {
  const available = house.boilers.map((_, i) => boilerAvailable(house, i, c));
  const sequencer = stepBoilerSequencer(
    house.sequencer,
    {
      flow,
      outside: c.outside,
      loadCalling: c.loadCalling,
      available,
      firing: house.boilers.map((b) => b.code === 3),
      lockedOut: house.boilers.map((b) => b.lockout !== null),
    },
    h,
  );
  const called = calledBoilers(sequencer);
  const targets = sequencerTargets(sequencer);
  // The ring's flow shared between the firing boilers.
  const lit = Math.max(1, house.boilers.filter((b) => b.code === 3).length);
  const rise = RING.boilerKW / ((WATER_HEAT * RING.flow) / lit);
  const permitted = boilersPermitted(house.combustion);
  const boilers = house.boilers.map((b, i) =>
    stepBoiler(
      b,
      {
        demand: called[i] && permitted,
        gas: c.gas,
        systemReturn: c.circulating ? ret : b.return,
        pressure: SYSTEM_PRESSURE,
        powered: c.powered,
        modulation: targets[i],
        rise,
      },
      h,
    ),
  );
  return {
    boilers,
    combustion: stepCombustion(house.combustion, boilers, FOULING, h),
    sequencer,
  };
}

/** What can be done to the boiler house: its boilers' keys, its panel, its combustion panel. */
export type BoilerHouseAction =
  | { act: 'press'; boiler: number; key: BoilerKey }
  | { act: 'setpoint'; boiler: number; celsius: number }
  /** PLANT ENABLE, on the boiler house's panel. */
  | { act: 'enable'; enable: PlantEnable }
  /** START or STOP, from the control room or the panel (AUTO only). */
  | { act: 'run'; run: boolean }
  /** The panel's ACCEPT and RESET: its alarms accepted; every locked-out boiler reset. */
  | { act: 'accept' }
  | { act: 'reset' }
  /** One of the operator's settings: the set point, °C, or a delay or the minimum run, s. */
  | { act: 'setting'; setting: SequencerSetting; value: number }
  | { act: 'lead'; boiler: number }
  | { act: 'rotation'; rotation: LeadRotation }
  /** The combustion panel's fan selector (HAND · OFF · AUTO) and RESET. */
  | { act: 'fan'; hoa: number }
  | { act: 'combustion-reset' };

const withBoiler = (
  house: BoilerHouseState,
  i: number,
  f: (b: BoilerState) => BoilerState,
): BoilerHouseState => {
  if (!house.boilers[i]) return house;
  const boilers = [...house.boilers];
  boilers[i] = f(boilers[i]);
  return { ...house, boilers };
};

export function actOnBoilerHouse(
  house: BoilerHouseState,
  action: BoilerHouseAction,
): BoilerHouseState {
  switch (action.act) {
    case 'press':
      return withBoiler(house, action.boiler, (b) =>
        pressBoiler(b, action.key),
      );
    case 'setpoint':
      return withBoiler(house, action.boiler, (b) =>
        setBoilerSetpoint(b, action.celsius),
      );
    case 'enable': {
      const sequencer = setPlantEnable(house.sequencer, action.enable);
      return sequencer === house.sequencer ? house : { ...house, sequencer };
    }
    case 'run': {
      // The control room's START and STOP work only in AUTO.
      if (house.sequencer.enable !== 'auto') return house;
      const sequencer = setPlantRun(house.sequencer, action.run);
      return sequencer === house.sequencer ? house : { ...house, sequencer };
    }
    case 'accept':
      return {
        ...house,
        sequencer: acceptSequencerAlarms(house.sequencer),
      };
    case 'reset':
      if (!house.boilers.some((b) => b.lockout)) return house;
      return {
        ...house,
        boilers: house.boilers.map((b) =>
          b.lockout ? pressBoiler(b, 'reset') : b,
        ),
      };
    case 'setting': {
      const sequencer = setSequencerSetting(
        house.sequencer,
        action.setting,
        action.value,
      );
      return sequencer === house.sequencer ? house : { ...house, sequencer };
    }
    case 'lead':
      if (!house.boilers[action.boiler]) return house;
      return {
        ...house,
        sequencer: {
          ...house.sequencer,
          lead: action.boiler,
          sinceRotation: 0,
        },
      };
    case 'rotation':
      return {
        ...house,
        sequencer: { ...house.sequencer, rotation: action.rotation },
      };
    case 'fan':
      return { ...house, combustion: setFan(house.combustion, action.hoa) };
    case 'combustion-reset':
      return { ...house, combustion: resetCombustion(house.combustion) };
  }
}

/** What the boards show of the boiler house: each boiler's lamps, the lead, the demand. */
export interface BoilerHouseShown {
  called: boolean[];
  firing: boolean[];
  lockout: boolean[];
  lead: number;
  /** The plant's firing demand, %. */
  demand: number;
  /** The output into the ring, kW. */
  output: number;
  enabled: boolean;
}

export function boilerHouseShown(house: BoilerHouseState): BoilerHouseShown {
  return {
    called: calledBoilers(house.sequencer),
    firing: house.boilers.map((b) => b.code === 3),
    lockout: house.boilers.map((b) => b.lockout !== null),
    lead: house.sequencer.lead,
    demand: house.sequencer.demand * 100,
    output: boilerHouseOutput(house),
    enabled: plantEnabled(house.sequencer),
  };
}
