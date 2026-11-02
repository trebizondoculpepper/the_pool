import { FAULTS } from '../../components/plant/logic/boiler-house';
import type {
  CascadeAlarm,
  CascadeBoilerState,
  CascadeEdit,
  CascadeManagerView,
} from '../../components/plant/logic/cascade-manager';
import type {
  BoilerHouseAction,
  BoilerHouseState,
} from '../../../game/plant/boiler-plant';
import type { SequencerAlarm } from '../../../game/plant/boiler-sequencer';

/**
 * The Hamwarmy CM6 bound to the boiler house (mission 122 stage 3): what
 * its display and LEDs are shown, read from the world's boilers and
 * their sequencer (mission 121, `game/plant/boiler-plant.ts`), and what
 * its menus, faults page and key switch ask of them, as the world's
 * `'boiler-house'` actions. Pure.
 */

/** The header's trend: a reading every 20 s of world time, 108 of them, 36 minutes. */
export const TREND_SAMPLE_S = 20;
export const TREND_SAMPLES = 108;

/**
 * The unit's own log of the header for its trend, as a real controller
 * keeps one: the world keeps no history of it, so the log starts when
 * the unit is first shown, filled with the reading then.
 */
export interface HeaderLog {
  samples: readonly number[];
  /** The world time of the last sample, s. */
  at: number;
}

/** The log brought up to `time`, a sample each `TREND_SAMPLE_S`; the same log if none is due. */
export function logHeader(
  log: HeaderLog | null,
  time: number,
  flow: number,
): HeaderLog {
  // Begun, or the world's time gone back (a new game) or far ahead.
  if (!log || time < log.at || time - log.at > TREND_SAMPLES * TREND_SAMPLE_S)
    return {
      samples: Array.from({ length: TREND_SAMPLES }, () => flow),
      at: time,
    };
  const due = Math.floor((time - log.at) / TREND_SAMPLE_S);
  if (due <= 0) return log;
  return {
    samples: [...log.samples, ...Array.from({ length: due }, () => flow)].slice(
      -TREND_SAMPLES,
    ),
    at: log.at + due * TREND_SAMPLE_S,
  };
}

const ALARM_TEXT: Record<SequencerAlarm, string> = {
  lockout: 'BOILER LOCKOUT',
  'header-low': 'HEADER LOW',
  'none-available': 'NO BOILER AVAILABLE',
};

/** A boiler's state as the CM6 hears it over its bus. */
function boilerState(house: BoilerHouseState, i: number): CascadeBoilerState {
  const b = house.boilers[i];
  if (b.lockout) return 'lockout';
  if (!b.on || b.code === 9) return 'off';
  switch (b.code) {
    case 1:
      return 'purge';
    case 2:
      return 'ignition';
    case 3:
      return 'firing';
    case 7:
      return 'overrun';
    default:
      return house.sequencer.called.includes(i) ? 'called' : 'standby';
  }
}

/** What the CM6 shows: the world's boiler house, its header and the time. */
export function cascadeViewOf(
  house: BoilerHouseState,
  {
    flow,
    time,
    log,
    powered = true,
  }: { flow: number; time: number; log: HeaderLog; powered?: boolean },
): CascadeManagerView {
  const s = house.sequencer;
  const alarms: CascadeAlarm[] = [];
  for (const [alarm, text] of Object.entries(ALARM_TEXT) as [
    SequencerAlarm,
    string,
  ][]) {
    const lamp = s.alarms[alarm];
    if (lamp !== 'off') alarms.push({ text, flashing: lamp === 'flashing' });
  }
  return {
    powered,
    enable: s.enable,
    running: s.run,
    headerC: flow,
    setpointC: s.setpoint,
    trend: log.samples,
    trendMinutes: (TREND_SAMPLES * TREND_SAMPLE_S) / 60,
    demand: s.demand,
    lead: s.lead,
    rotation: s.rotation,
    stageUpS: s.stageUp,
    stageDownS: s.stageDown,
    minRunS: s.minRun,
    boilers: house.boilers.map((b, i) => ({
      state: boilerState(house, i),
      rate: b.rate,
      flowC: b.flow,
      hours: s.hoursRun[i] ?? 0,
      starts: s.starts[i] ?? 0,
      code: b.lockout ? `E0${FAULTS[b.lockout]}` : String(b.code),
    })),
    alarms,
    clock: time,
  };
}

/** What a confirmed edit or command on the CM6 asks of the boiler house. */
export function cascadeAction(edit: CascadeEdit): BoilerHouseAction {
  if ('command' in edit) return { act: edit.command };
  switch (edit.setting) {
    case 'rotation':
      return { act: 'rotation', rotation: edit.value };
    case 'lead':
      return { act: 'lead', boiler: edit.value };
    default:
      return { act: 'setting', setting: edit.setting, value: edit.value };
  }
}
