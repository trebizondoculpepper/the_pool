import {
  SETPOINTS,
  VIEWS,
  washVolume,
} from '../../../../game/plant/wash-o-tron';
import type {
  FilterMode,
  WashFilter,
  WashOTron,
} from '../../../../game/plant/wash-o-tron';

/**
 * What the Wash-O-Tron's console shows (prompt 072): its two-line
 * 14-segment VFD in each view (mission 143: times `mm-ss`, no colon), and
 * each state button's lamp. Pure.
 */

const fit = (s: string) => s.padEnd(20).slice(0, 20);
// Times with a dash, not a colon: its 14-segment VFD has none (mission
// 143, the owner, 2026-11-02).
const mmss = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}-${String(t % 60).padStart(2, '0')}`;
};
/** An event's time of day, logged `hh:mm`, shown `hh-mm`. */
const dashed = (event: string) => event.replace(/^(\d\d):(\d\d)/, '$1-$2');

export interface DisplayInputs {
  time: number;
  /** The pit's water as a share of its volume. */
  pitShare: number;
}

/** Its display's two lines, 20 characters each. */
export function washDisplay(s: WashOTron, i: DisplayInputs): [string, string] {
  // A refusal belongs to the operator's last button press, not to the
  // selected information page. Show it immediately wherever they are.
  if (s.waiting) return [fit('INTERLOCK'), fit(s.waiting)];
  const view = VIEWS[s.view];
  if (view === 'PROGRAMME') {
    const top = `${s.running ? (s.hold ? 'HOLD' : 'AUTO') : 'MANUAL'}`;
    if (s.washing !== null && s.step !== null) {
      const limit = s.setpoints[s.step];
      const t = Number.isFinite(s.stepTime) ? s.stepTime : limit;
      return [
        fit(`${top} F${s.washing + 1} ${s.step.toUpperCase()}`),
        fit(`${mmss(t)}/${mmss(limit)}`),
      ];
    }
    if (s.washing !== null)
      return [
        fit(`${top} F${s.washing + 1} TO FILTER`),
        fit('VALVES RETURNING'),
      ];
    return [fit(`${top} IDLE`), fit('')];
  }
  if (view === 'NEXT') {
    const due = s.filters
      .map((f, n) => ({
        n,
        at: f.lastWash + s.setpoints.interval * 3600 - i.time,
        f,
      }))
      .filter((x) => x.f.auto && !x.f.lockout)
      .sort((a, b) => a.at - b.at)[0];
    if (!due) return [fit('NEXT NONE'), fit('NO FILTERS IN AUTO')];
    const h = Math.max(0, due.at) / 3600;
    return [
      fit(`NEXT F${due.n + 1}`),
      fit(
        due.at <= 0
          ? 'DUE'
          : `IN ${Math.floor(h)}h${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`,
      ),
    ];
  }
  if (view === 'PIT')
    return [
      fit(`PIT ${Math.round(i.pitShare * 100)}%`),
      fit(`WASH NEEDS ${washVolume(s.setpoints).toFixed(0)} m3`),
    ];
  if (view === 'SETPOINTS') {
    const sp = SETPOINTS[s.setpoint];
    if (sp.fitted === false) return [fit(sp.name), fit('NOT FITTED')];
    const v = s.editing ?? s.setpoints[sp.key];
    return [
      fit(`${sp.name}${s.unlocked > 0 ? ' *' : ''}`),
      fit(
        `${v} ${sp.unit === 's' ? 'SEC' : 'HOURS'}${s.editing !== null ? ' ENTER?' : ''}`,
      ),
    ];
  }
  return [
    fit(dashed(s.events[0] ?? 'NO EVENTS')),
    fit(dashed(s.events[1] ?? '')),
  ];
}

/** A state button's lamp: lit in its state, flashing while going there. */
export function stateLamp(
  f: WashFilter,
  mode: FilterMode,
): 'off' | 'on' | 'flash' {
  if (f.phase === 'steady') return f.mode === mode ? 'on' : 'off';
  if (f.phase === 'fault') return f.target === mode ? 'flash' : 'off';
  return f.target === mode ? 'flash' : 'off';
}
