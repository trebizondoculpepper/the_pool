import {
  box,
  dotFrame,
  fillBox,
  setDot,
  text,
  textWidth,
} from '../../industrial-control/logic/dot-matrix';
import type { DotFrame } from '../../industrial-control/logic/dot-matrix';

/**
 * The Water Margin TC-1 pool temperature controller's display and menus
 * (2026-11-03): a late-2010s microprocessor pool-water temperature
 * regulator, its interface designed like the Hamwarmy CM6 cascade
 * manager's (mission 122): a 320 × 200 TFT matrix display, light blue on
 * dark blue, worked by one turn-and-push jog dial and HOME and BACK keys.
 *
 * Pure. What it shows comes in as a `WatershedView` (the pool's
 * temperature control state as an adapter reads it from the world); the
 * dial and keys drive its menus (`watershedInput`); a confirmed edit
 * comes out as a `WatershedEdit` for its owner to dispatch. The screen is
 * described first (`watershedScreen`, cheap, compared as `screenKey`) and
 * drawn into dots (`drawWatershedScreen`) only when that description
 * changes.
 */

// ---- What it is shown ---------------------------------------------------------

/** Everything the unit shows, from the world's temperature control state. */
export interface WatershedView {
  /** Mains to the unit. */
  powered: boolean;
  /** The pool's water, measured, °C. */
  actualC: number;
  /** The local set point, °C. */
  setpointC: number;
  mode: 'auto' | 'hand';
  /** Manual output, 0 to 1; ignored in AUTO. */
  manualOutput: number;
  /** The valve's actual opening, 0 to 1. */
  valvePosition: number;
  /** The heat demand, 0 to 1. */
  demand: number;
  /** The valve opening asked for, 0 to 1. */
  commanded: number;
  /** Why the valve is held shut, if it is. */
  interlock: 'none' | 'no-circulation' | 'primary-isolated';
  /** An actuator fault: the valve stuck at its last position. */
  valveStuck: boolean;
  /** The probe's fault, if any. */
  sensorFault: 'none' | 'low' | 'high';
  /** The LTHW flow and return isolators. */
  flowIsolatorOpen: boolean;
  returnIsolatorOpen: boolean;
  /** The recent pool temperature, oldest first, for the trend. */
  trend: readonly number[];
  /** The time of day, seconds since midnight. */
  clock: number;
}

// ---- What it can change -------------------------------------------------------

/** The set point's range and step, °C. */
export const WATERSHED_LIMITS = {
  setpoint: { min: 20, max: 40, step: 0.5 },
} as const;

export type WatershedEdit =
  | { setting: 'setpoint'; value: number }
  | { setting: 'mode'; mode: 'auto' | 'hand' }
  | { setting: 'manual-output'; output: number }
  | { command: 'fault-reset' };

// ---- Its menus ---------------------------------------------------------------

export type WatershedPage =
  | 'home'
  | 'menu'
  | 'set'
  | 'valve'
  | 'alarms'
  | 'status';

/** The main menu, in order. */
export const WATERSHED_MENU: readonly { label: string; page: WatershedPage }[] =
  [
    { label: 'SET POINT', page: 'set' },
    { label: 'VALVE', page: 'valve' },
    { label: 'ALARMS', page: 'alarms' },
    { label: 'UNIT STATUS', page: 'status' },
  ];

/** The menus' state: which page, which row, and a value being edited. */
export interface WatershedUi {
  page: WatershedPage;
  /** The row selected on a list page. */
  cursor: number;
  /** The main menu's row, kept while a page under it is open. */
  menuCursor: number;
  /** The value being edited (set point in tenths of a degree), or null. */
  editing: number | null;
  /** Seconds since the last key or turn. */
  quiet: number;
}

export const newWatershedUi = (): WatershedUi => ({
  page: 'home',
  cursor: 0,
  menuCursor: 0,
  editing: null,
  quiet: 0,
});

/** After this long untouched the unit returns to its home page. */
export const WATERSHED_HOME_AFTER_S = 240;

export type WatershedKey = 'home' | 'back';
export type WatershedInput =
  | { kind: 'turn'; direction: -1 | 1 }
  | { kind: 'push' }
  | { kind: 'key'; key: WatershedKey };

const setpointTenths = (v: number) => Math.round(v * 10);
const setpointValue = (t: number) => t / 10;

/** The edit's next set point one detent `direction` on, or null at its end. */
function steppedSetpoint(at: number, direction: -1 | 1) {
  const { min, max, step } = WATERSHED_LIMITS.setpoint;
  const next = at / 10 + direction * step;
  return next < min - 1e-9 || next > max + 1e-9 ? null : setpointTenths(next);
}

/** Whether the dial turned `direction` would do anything now. */
export function canTurn(
  ui: WatershedUi,
  view: WatershedView,
  direction: -1 | 1,
) {
  if (!view.powered) return false;
  if (ui.page === 'home') return false;
  if (ui.editing !== null)
    return steppedSetpoint(ui.editing, direction) !== null;
  if (ui.page === 'menu') {
    const next = ui.cursor + direction;
    return next >= 0 && next < WATERSHED_MENU.length;
  }
  return false;
}

/** Whether a push would do anything now. */
export function canPush(ui: WatershedUi, view: WatershedView) {
  if (!view.powered) return false;
  if (ui.page === 'home' || ui.page === 'menu') return true;
  return ui.page === 'set' && (ui.editing !== null || ui.cursor === 0);
}

/**
 * What a turn, push or key does to the menus: the new state, and an edit
 * for the controller when a push confirms one. Unpowered, nothing happens.
 */
export function watershedInput(
  ui: WatershedUi,
  view: WatershedView,
  input: WatershedInput,
): { ui: WatershedUi; edit?: WatershedEdit } {
  if (!view.powered) return { ui };
  const next: WatershedUi = { ...ui, quiet: 0 };
  if (input.kind === 'key') {
    if (input.key === 'home')
      return { ui: { ...next, page: 'home', cursor: 0, editing: null } };
    if (ui.editing !== null) return { ui: { ...next, editing: null } };
    const up: WatershedPage =
      ui.page === 'menu' || ui.page === 'home' ? 'home' : 'menu';
    return { ui: { ...next, page: up, cursor: ui.menuCursor } };
  }
  if (input.kind === 'turn') {
    if (!canTurn(ui, view, input.direction)) return { ui: next };
    if (ui.editing !== null)
      return {
        ui: {
          ...next,
          editing: steppedSetpoint(ui.editing, input.direction),
        },
      };
    if (ui.page === 'menu')
      return {
        ui: {
          ...next,
          cursor: ui.cursor + input.direction,
          menuCursor: ui.cursor + input.direction,
        },
      };
    return { ui: next };
  }
  // A push.
  if (ui.page === 'home')
    return { ui: { ...next, page: 'menu', cursor: ui.menuCursor } };
  if (ui.page === 'menu')
    return {
      ui: {
        ...next,
        page: WATERSHED_MENU[ui.cursor].page,
        menuCursor: ui.cursor,
        cursor: 0,
      },
    };
  if (ui.page === 'set') {
    if (ui.editing === null)
      return { ui: { ...next, editing: setpointTenths(view.setpointC) } };
    return {
      ui: { ...next, editing: null },
      edit: { setting: 'setpoint', value: setpointValue(ui.editing) },
    };
  }
  if (ui.page === 'alarms')
    return { ui: next, edit: { command: 'fault-reset' } };
  return { ui: next };
}

/** Time passing: untouched long enough, the unit goes home. */
export function watershedTick(ui: WatershedUi, seconds: number): WatershedUi {
  const quiet = ui.quiet + seconds;
  if (quiet >= WATERSHED_HOME_AFTER_S && ui.page !== 'home')
    return { ...newWatershedUi(), menuCursor: ui.menuCursor, quiet };
  return { ...ui, quiet };
}

// ---- What the screen shows ------------------------------------------------------

/** The display's size in dots: a 320 × 200 TFT matrix. */
export const SCREEN_W = 320;
export const SCREEN_H = 200;

export type WatershedScreen =
  | { kind: 'off' }
  | {
      kind: 'home';
      status: string;
      clock: string;
      actual: string;
      setpoint: string;
      mode: string;
      valve: number;
      commanded: number;
      demand: number;
      interlock: string;
      trend: number[];
      setRow: number;
      span: string;
      banner: string;
      alarm: boolean;
      valveStuck: boolean;
      sensorFault: string;
    }
  | {
      kind: 'list';
      title: string;
      where: string;
      rows: { label: string; value: string; on: boolean; editing: boolean }[];
      hint: string;
    };

/** The trend box on the home page, in dots. */
const TREND = { x: 4, y: 118, w: 180, h: 42 };

const clockText = (s: number) => {
  const m = Math.floor((((s % 86400) + 86400) % 86400) / 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** The trend's range: the set point 8 °C down to 4 °C up. */
const trendRange = (set: number) => ({ lo: set - 8, hi: set + 4 });

const rowOf = (v: number, set: number) => {
  const { lo, hi } = trendRange(set);
  const inner = TREND.h - 3;
  const r = Math.round(((hi - v) / (hi - lo)) * inner);
  return Math.max(0, Math.min(inner, r));
};

/** What the screen shows now, described cheaply (`screenKey` compares it). */
export function watershedScreen(
  view: WatershedView,
  ui: WatershedUi,
): WatershedScreen {
  if (!view.powered) return { kind: 'off' };
  if (ui.page === 'home') {
    const faults: string[] = [];
    if (view.valveStuck) faults.push('VALVE STUCK');
    if (view.sensorFault !== 'none') faults.push('PROBE FAULT');
    if (view.interlock !== 'none') faults.push('INTERLOCK');
    const banner =
      faults.length > 0
        ? faults.join(' · ')
        : view.mode === 'hand'
          ? 'HAND'
          : 'AUTO';
    const samples = view.trend.slice(-(TREND.w - 4));
    return {
      kind: 'home',
      status: view.mode === 'auto' ? 'AUTO' : 'HAND',
      clock: clockText(view.clock),
      actual: view.actualC.toFixed(1),
      setpoint: view.setpointC.toFixed(1),
      mode: view.mode.toUpperCase(),
      valve: view.valvePosition,
      commanded: view.commanded,
      demand: view.demand,
      interlock: view.interlock,
      trend: samples.map((v) => rowOf(v, view.setpointC)),
      setRow: rowOf(view.setpointC, view.setpointC),
      span: '-60 MIN',
      banner,
      alarm: faults.length > 0,
      valveStuck: view.valveStuck,
      sensorFault: view.sensorFault,
    };
  }
  // A list page: its rows from the view.
  const rows: {
    label: string;
    value: string;
    on: boolean;
    editing: boolean;
  }[] = [];
  let hint: string;
  let title: string;
  if (ui.page === 'menu') {
    title = 'MAIN MENU';
    WATERSHED_MENU.forEach((m, i) =>
      rows.push({
        label: m.label,
        value: '>',
        on: i === ui.cursor,
        editing: false,
      }),
    );
    hint = 'TURN: SELECT  PUSH: OPEN';
  } else if (ui.page === 'set') {
    title = 'SET POINT';
    const editing = ui.editing !== null;
    const shown = editing
      ? setpointValue(ui.editing as number).toFixed(1)
      : view.setpointC.toFixed(1);
    rows.push({
      label: 'SET POINT, °C',
      value: shown,
      on: ui.cursor === 0 && !editing,
      editing,
    });
    rows.push({
      label: 'POOL NOW',
      value: view.actualC.toFixed(1),
      on: false,
      editing: false,
    });
    rows.push({
      label: 'MODE',
      value: view.mode.toUpperCase(),
      on: false,
      editing: false,
    });
    hint = editing ? 'TURN: CHANGE  PUSH: SAVE' : 'TURN: SELECT  PUSH: EDIT';
  } else if (ui.page === 'valve') {
    title = 'CONTROL VALVE';
    rows.push({
      label: 'COMMANDED',
      value: `${Math.round(view.commanded * 100)}%`,
      on: false,
      editing: false,
    });
    rows.push({
      label: 'ACTUAL',
      value: `${Math.round(view.valvePosition * 100)}%`,
      on: false,
      editing: false,
    });
    rows.push({
      label: 'DEMAND',
      value: `${Math.round(view.demand * 100)}%`,
      on: false,
      editing: false,
    });
    rows.push({
      label: 'LTHW FLOW ISO',
      value: view.flowIsolatorOpen ? 'OPEN' : 'SHUT',
      on: false,
      editing: false,
    });
    rows.push({
      label: 'LTHW RETURN ISO',
      value: view.returnIsolatorOpen ? 'OPEN' : 'SHUT',
      on: false,
      editing: false,
    });
    hint = 'BACK: RETURN';
  } else if (ui.page === 'alarms') {
    title = 'ALARMS';
    const list: [string, string][] = [];
    if (view.valveStuck) list.push(['VALVE STUCK', 'ACTIVE']);
    if (view.sensorFault !== 'none')
      list.push(['PROBE FAULT', view.sensorFault.toUpperCase()]);
    if (view.interlock === 'no-circulation')
      list.push(['NO CIRCULATION', 'HOLD']);
    if (view.interlock === 'primary-isolated')
      list.push(['PRIMARY ISOLATED', 'HOLD']);
    if (!list.length) list.push(['NO ALARMS', '']);
    list.forEach(([label, value]) =>
      rows.push({ label, value, on: false, editing: false }),
    );
    rows.push({ label: 'RESET FAULTS', value: '>', on: true, editing: false });
    hint = 'TURN: SELECT  PUSH: RESET';
  } else {
    title = 'UNIT STATUS';
    [
      ['WATER MARGIN TC-1', ''],
      ['POOL WATER CONTROLLER', ''],
      ['SOFTWARE', '1.4'],
      ['PROBE', 'PT100'],
      ['VALVE', '0-10 V DC'],
      ['BUS', 'MODBUS RTU'],
    ].forEach(([label, value]) =>
      rows.push({ label, value, on: false, editing: false }),
    );
    hint = 'BACK: RETURN';
  }
  const where =
    ui.page === 'menu' ? `${ui.cursor + 1}/${WATERSHED_MENU.length}` : '';
  return { kind: 'list', title, where, rows, hint };
}

/** A screen's identity: equal keys draw the same dots. */
export const screenKey = (screen: WatershedScreen) => JSON.stringify(screen);

// ---- Drawing it in dots --------------------------------------------------------

/** The home page's schematic: the exchanger, its valve and isolators. */
const PLANT = { x: 200, w: 100, top: 28, h: 40, flowY: 34, retY: 60 };

function line(f: DotFrame, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++)
    setDot(f, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
}

function valveGlyph(
  f: DotFrame,
  cx: number,
  cy: number,
  open: number,
  stuck: boolean,
) {
  // A butterfly valve: a disc across its pipe, tilted by its opening.
  const a = (1 - open) * (Math.PI / 2);
  line(f, cx - 6, cy, cx + 6, cy);
  line(
    f,
    cx - Math.cos(a) * 6,
    cy - Math.sin(a) * 6,
    cx + Math.cos(a) * 6,
    cy + Math.sin(a) * 6,
  );
  if (stuck) {
    line(f, cx - 4, cy - 5, cx + 4, cy + 5);
    line(f, cx - 4, cy + 5, cx + 4, cy - 5);
  }
}

/** The screen drawn in dots: lit dots are the TFT's light-blue pixels. */
export function drawWatershedScreen(screen: WatershedScreen): DotFrame {
  const f = dotFrame(SCREEN_W, SCREEN_H);
  if (screen.kind === 'off') return f;
  if (screen.kind === 'home') {
    // The title bar.
    fillBox(f, 0, 0, SCREEN_W, 12);
    text(f, 2, 2, 'WATER MARGIN TC-1', 1, false);
    const right = `${screen.status}  ${screen.clock}`;
    text(f, SCREEN_W - 2 - textWidth(right), 2, right, 1, false);
    // Set vs actual, large.
    text(f, 8, 20, 'ACTUAL', 1);
    text(f, 8, 32, screen.actual, 4);
    const ax = 8 + textWidth(screen.actual, 4) + 4;
    text(f, ax, 36, '°', 2);
    text(f, ax + 8, 36, 'C', 3);
    text(f, 8, 78, 'SET', 2);
    text(f, 8 + textWidth('SET', 2) + 10, 78, `${screen.setpoint}°C`, 2);
    // The valve's position as a bar.
    text(f, 8, 96, 'VALVE', 1);
    box(f, 60, 94, 120, 12);
    fillBox(f, 62, 96, Math.round(116 * screen.valve), 8);
    text(
      f,
      SCREEN_W - 60 - textWidth(`${Math.round(screen.valve * 100)}%`),
      96,
      `${Math.round(screen.valve * 100)}%`,
      1,
    );
    // Its trend.
    text(f, TREND.x, TREND.y - 10, 'POOL TEMP TREND', 1);
    box(f, TREND.x, TREND.y, TREND.w, TREND.h);
    for (let i = 2; i < TREND.w - 2; i += 4)
      setDot(f, TREND.x + i, TREND.y + 1 + screen.setRow);
    const n = screen.trend.length;
    let prev: number | null = null;
    screen.trend.forEach((r, k) => {
      const x =
        TREND.x + 2 + Math.round((k * (TREND.w - 5)) / Math.max(1, n - 1));
      const y = TREND.y + 1 + r;
      if (prev !== null) line(f, x - 1, prev, x, y);
      else setDot(f, x, y);
      prev = y;
    });
    text(f, TREND.x, TREND.y + TREND.h + 2, screen.span);
    // The exchanger schematic on the right.
    const { x: px, w: pw, top, h, flowY, retY } = PLANT;
    line(f, px, flowY, px + pw, flowY);
    line(f, px, retY, px + pw, retY);
    // Its LTHW flow: the valve, then the exchanger.
    line(f, px, flowY, px + 22, flowY);
    valveGlyph(f, px + 26, flowY, screen.valve, screen.valveStuck);
    line(f, px + 32, flowY, px + pw - 14, flowY);
    box(f, px + pw - 14, top, 14, h);
    text(f, px + pw - 24, top + h + 4, 'EXCH', 1);
    line(f, px + pw - 7, top + h, px + pw - 7, retY);
    line(f, px + pw - 7, retY, px, retY);
    // The demand as a bar under the schematic.
    text(f, px, 100, 'DEMAND', 1);
    box(f, px + 56, 98, 60, 12);
    fillBox(f, px + 58, 100, Math.round(56 * screen.demand), 8);
    text(f, px + 120, 100, `${Math.round(screen.demand * 100)}%`, 1);
    // The status line, inverted on a fault.
    if (screen.alarm) fillBox(f, 0, SCREEN_H - 13, SCREEN_W, 13);
    text(f, 2, SCREEN_H - 11, screen.banner.slice(0, 50), 1, !screen.alarm);
    return f;
  }
  fillBox(f, 0, 0, SCREEN_W, 12);
  text(f, 2, 2, screen.title, 1, false);
  if (screen.where)
    text(f, SCREEN_W - 2 - textWidth(screen.where), 2, screen.where, 1, false);
  screen.rows.slice(0, 10).forEach((row, k) => {
    const y = 16 + k * 16;
    if (row.on) fillBox(f, 0, y - 2, SCREEN_W, 16);
    text(f, 3, y, row.label.slice(0, 30), 1, !row.on);
    if (!row.value) return;
    const vx = SCREEN_W - (row.editing ? 14 : 4) - textWidth(row.value);
    if (row.editing) {
      fillBox(f, vx - 10, y - 2, SCREEN_W - vx + 10, 16);
      text(f, vx - 8, y, '<', 1, false);
      text(f, vx, y, row.value, 1, false);
      text(f, SCREEN_W - 10, y, '>', 1, false);
    } else text(f, vx, y, row.value, 1, !row.on);
  });
  line(f, 0, SCREEN_H - 14, SCREEN_W - 1, SCREEN_H - 14);
  text(f, 2, SCREEN_H - 12, screen.hint);
  return f;
}
