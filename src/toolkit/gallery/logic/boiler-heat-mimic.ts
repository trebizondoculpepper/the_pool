import type { BoilerState } from '../../components/plant/logic/boiler-house';
import { calledBoilers } from '../../../game/plant/boiler-sequencer';
import type {
  BoilerHouseAction,
  BoilerHouseState,
} from '../../../game/plant/boiler-plant';
import type {
  MimicSpec,
  MimicState,
  Reading,
} from '../../components/industrial-control/logic/mimic';

export const BOILER_RATING_KW = 300;

/**
 * What the sequencer shows on the board (mission 121): each boiler called,
 * the lead, the plant's demand, the header's flow, return and set point,
 * and its alarms lit. Left out, the board shows the boilers alone.
 */
export interface CascadeShown {
  called: readonly boolean[];
  lead: number;
  /** The plant's firing demand, %. */
  demand: number;
  flow: number;
  return: number;
  setpoint: number;
  alarms: { lockout: boolean; headerLow: boolean; noneAvailable: boolean };
  /** PLANT ENABLE's position, and whether the plant is started (AUTO's START). */
  enable: 'off' | 'auto' | 'hand';
  run: boolean;
}

/** What the board shows of the world's sequencer and the ring's header. */
export function cascadeOf(
  house: BoilerHouseState,
  header: { flow: number; return: number },
): CascadeShown {
  const s = house.sequencer;
  return {
    called: calledBoilers(s),
    lead: s.lead,
    demand: s.demand * 100,
    flow: header.flow,
    return: header.return,
    setpoint: s.setpoint,
    enable: s.enable,
    run: s.run,
    alarms: {
      lockout: s.alarms.lockout !== 'off',
      headerLow: s.alarms['header-low'] !== 'off',
      noneAvailable: s.alarms['none-available'] !== 'off',
    },
  };
}

export const BOILER_COUNT = 6;

const positions = Array.from({ length: BOILER_COUNT }, (_, i) => ({
  id: `b${i + 1}`,
  label: `B-${501 + i}`,
  x: i % 2 ? 0.6 : -0.6,
  y: 0.46 - Math.floor(i / 2) * 0.39,
}));

export const BOILER_HEAT_MIMIC: MimicSpec = {
  title: 'BOILER HOUSE — HEAT OUTPUT',
  width: 2.4,
  height: 1.8,
  lines: [
    {
      colour: '#b9372d',
      points: [
        [0, 0.68],
        [0, -0.44],
      ],
    },
    ...positions.map(({ x, y }) => ({
      colour: '#b9372d',
      points: [
        [x < 0 ? x - 0.18 : x + 0.18, y + 0.04],
        [0, y + 0.04],
      ] as const,
    })),
  ],
  shapes: positions.map(({ x, y, label }) => ({
    symbol: 'boiler' as const,
    at: [x - 0.2, y] as const,
    size: 0.1,
    label,
  })),
  labels: [
    { text: 'LTHW FLOW', at: [0, 0.72] },
    // Printed over the header's readouts, legible from a step back
    // (mission 122; their LCD legends are small).
    ...(
      [
        ['FLOW °C', -0.88],
        ['RETURN °C', -0.44],
        ['TOTAL', 0],
        ['SET °C', 0.44],
        ['DEMAND %', 0.88],
      ] as const
    ).map(([text, x]) => ({ text, at: [x, -0.575] as const, size: 0.75 })),
  ],
  lamps: [
    ...positions.flatMap(({ id, x, y }) => [
      {
        id: `${id}-called`,
        at: [x - 0.4, y + 0.13] as const,
        colour: 'white' as const,
        label: 'CALLED',
      },
      {
        id: `${id}-ready`,
        at: [x - 0.3, y + 0.13] as const,
        colour: 'green' as const,
        label: 'READY',
      },
      {
        id: `${id}-fire`,
        at: [x - 0.2, y + 0.13] as const,
        colour: 'amber' as const,
        label: 'FIRE',
      },
      {
        id: `${id}-fault`,
        at: [x - 0.1, y + 0.13] as const,
        colour: 'red' as const,
        label: 'LOCKOUT',
      },
      {
        id: `${id}-lead`,
        at: [x, y + 0.13] as const,
        colour: 'blue' as const,
        label: 'LEAD',
      },
    ]),
    // The sequencer's alarms (mission 121).
    {
      id: 'alarm-lockout',
      at: [-0.5, -0.83],
      colour: 'red',
      label: 'BOILER LOCKOUT',
    },
    {
      id: 'alarm-header-low',
      at: [0, -0.83],
      colour: 'red',
      label: 'HEADER LOW',
    },
    {
      id: 'alarm-none',
      at: [0.5, -0.83],
      colour: 'red',
      label: 'NO BOILER AVAILABLE',
    },
    // PLANT ENABLE's position (the CM6's key switch) and the plant
    // started, in the bottom row beside the alarms, clear of the title
    // (mission 122).
    { id: 'enable-off', at: [0.76, -0.83], colour: 'white', label: 'OFF' },
    { id: 'enable-auto', at: [0.86, -0.83], colour: 'green', label: 'AUTO' },
    { id: 'enable-hand', at: [0.96, -0.83], colour: 'amber', label: 'HAND' },
    { id: 'plant-run', at: [1.08, -0.83], colour: 'green', label: 'RUN' },
  ],
  readouts: [
    ...positions.map(({ id, x, y }) => ({ id, at: [x + 0.21, y] as const })),
    { id: 'flow', at: [-0.88, -0.66] },
    { id: 'return', at: [-0.44, -0.66] },
    { id: 'total', at: [0, -0.66] },
    { id: 'setpoint', at: [0.44, -0.66] },
    { id: 'demand', at: [0.88, -0.66] },
  ],
  modes: [
    { id: 'output', legend: 'kW' },
    { id: 'rate', legend: 'RATE' },
    { id: 'temperature', legend: 'TEMP' },
  ],
};

/**
 * The boiler house's own board shows the sequencer and works nothing:
 * mission 121's rough panel had PLANT ENABLE, ACCEPT and RESET on it,
 * which the Hamwarmy CM6 cascade manager beside the low-loss header has
 * taken over (mission 122): its key switch, and its faults page.
 */
export const BOILER_HEAT_PANEL: MimicSpec = BOILER_HEAT_MIMIC;

/** The control room's copy (CR-MP7): the same, and only START and STOP of the plant in AUTO. */
export const BOILER_HEAT_COPY: MimicSpec = {
  ...BOILER_HEAT_MIMIC,
  buttons: [
    { id: 'start', at: [0.93, 0.72], colour: 'green', legend: 'START' },
    { id: 'stop', at: [1.08, 0.72], colour: 'red', legend: 'STOP' },
  ],
};

/** What a press of one of the boards' buttons asks of the boiler house. */
export function boilerHeatPress(id: string): BoilerHouseAction | null {
  switch (id) {
    case 'start':
      return { act: 'run', run: true };
    case 'stop':
      return { act: 'run', run: false };
  }
  return null;
}

const reading = (
  value: number,
  unit: string,
  name: string,
  places = 0,
): Reading => ({
  value,
  unit,
  name,
  places,
});

/** Estimated useful heat from the six live 300 kW firing fractions, and the sequencer's indications. */
export function boilerHeatState(
  boilers: readonly BoilerState[],
  cascade?: CascadeShown,
): MimicState {
  const output = boilers.map((boiler) =>
    boiler.code === 3 && boiler.on && !boiler.lockout
      ? BOILER_RATING_KW * Math.max(0, Math.min(1, boiler.rate))
      : 0,
  );
  const total = output.reduce((sum, kw) => sum + kw, 0);
  const lamps = Object.fromEntries(
    boilers.flatMap((boiler, i) => [
      [
        `b${i + 1}-ready`,
        boiler.on && boiler.lockout === null && boiler.code !== 3,
      ],
      [`b${i + 1}-fire`, output[i] > 0],
      [`b${i + 1}-fault`, boiler.lockout !== null || boiler.code === 9],
      [`b${i + 1}-called`, cascade?.called[i] ?? false],
      [`b${i + 1}-lead`, cascade?.lead === i],
    ]),
  );
  lamps['alarm-lockout'] = cascade?.alarms.lockout ?? false;
  lamps['alarm-header-low'] = cascade?.alarms.headerLow ?? false;
  lamps['alarm-none'] = cascade?.alarms.noneAvailable ?? false;
  lamps['enable-off'] = cascade?.enable === 'off';
  lamps['enable-auto'] = (cascade?.enable ?? 'auto') === 'auto';
  lamps['enable-hand'] = cascade?.enable === 'hand';
  lamps['plant-run'] =
    cascade === undefined ||
    cascade.enable === 'hand' ||
    (cascade.enable === 'auto' && cascade.run);
  const readouts = Object.fromEntries(
    boilers.map((boiler, i) => [
      `b${i + 1}`,
      {
        output: reading(output[i], 'kW', `B-${501 + i}`),
        rate: reading(output[i] / 3, '%', `B-${501 + i}`),
        temperature: reading(boiler.flow, 'C', `B-${501 + i}`, 1),
      },
    ]),
  );
  readouts.total = {
    output: reading(total, 'kW', 'TOTAL'),
    rate: reading(
      (total / (BOILER_COUNT * BOILER_RATING_KW)) * 100,
      '%',
      'CASCADE',
    ),
    temperature: reading(
      total > 0
        ? boilers.reduce((sum, boiler, i) => sum + boiler.flow * output[i], 0) /
            total
        : Math.max(...boilers.map((boiler) => boiler.flow)),
      'C',
      'HEADER',
      1,
    ),
  };
  // The header and the demand, the same in every mode.
  const every = (r: Reading) => ({ output: r, rate: r, temperature: r });
  // Without the sequencer: the boilers' own flow and return, their output's share.
  const header = readouts.total.temperature!.value;
  const back = Math.min(...boilers.map((b) => b.return));
  readouts.flow = every(reading(cascade?.flow ?? header, 'C', 'FLOW', 1));
  readouts.return = every(reading(cascade?.return ?? back, 'C', 'RETURN', 1));
  readouts.setpoint = every(
    reading(cascade?.setpoint ?? boilers[0]?.setpoint ?? 80, 'C', 'SET', 0),
  );
  readouts.demand = every(
    reading(
      cascade?.demand ?? (total / (BOILER_COUNT * BOILER_RATING_KW)) * 100,
      '%',
      'DEMAND',
      0,
    ),
  );
  return { lamps, readouts };
}
