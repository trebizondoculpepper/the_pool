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
 * The Hamwarmy CM6 boiler cascade manager's display and menus (mission
 * 122, `doc/plans/122-cascade-manager.md`): a 2010s wall-mounted sequence
 * controller, after Hamworthy's Merley, Siemens' Albatros cascade
 * controllers and Viessmann's Vitotronic 300-K, with a 240 × 128 dot
 * FSTN graphic display worked by one turn-and-push knob and HOME, BACK
 * and INFO keys (and a SERVICE key behind its terminal flap).
 *
 * Pure. It holds none of the plant: what it shows comes in as a
 * `CascadeManagerView` (the sequencer's state, as an adapter reads it from
 * the world), what the knob and keys do to its menus is `cascadeInput`,
 * and what a confirmed edit asks of the sequencer comes out as a
 * `CascadeEdit` for its owner to dispatch. The screen is described first
 * (`cascadeScreen`, cheap, compared as `screenKey`) and drawn into dots
 * (`drawCascadeScreen`) only when that description changes.
 */

// ---- What it is shown ---------------------------------------------------------

/** What one boiler is doing, as the cascade manager hears it over its bus. */
export type CascadeBoilerState =
  /** Isolated, switched off or out of the rota. */
  | 'off'
  /** Available, not asked for heat. */
  | 'standby'
  /** Asked for heat, its pump starting and flow being proved. */
  | 'called'
  /** Pre-purging. */
  | 'purge'
  /** Trial for ignition. */
  | 'ignition'
  /** Flame proved, modulating. */
  | 'firing'
  /** Burner off, pump running on. */
  | 'overrun'
  /** Locked out, waiting for a reset at the boiler. */
  | 'lockout';

export interface CascadeBoilerView {
  state: CascadeBoilerState;
  /** Its firing rate, 0 to 1 of its maximum, while firing. */
  rate: number;
  /** Its own flow temperature, °C. */
  flowC: number;
  /** Hours run and burner starts, from its own counters. */
  hours: number;
  starts: number;
  /** Its controller's code or fault, as it shows it ("3", "E02"), if any. */
  code?: string;
}

/**
 * How the lead is chosen: by hours run (fewest hours leads), or fixed by
 * hand. The boiler house runs its boilers in series (lead first, each
 * filled before the next), which the unit shows but cannot change.
 */
export type CascadeRotation = 'hours' | 'fixed';
/** The PLANT ENABLE key switch beside the unit. */
export type PlantEnable = 'off' | 'auto' | 'hand';

/**
 * Everything the unit shows: the sequencer's state, in the sequencer's
 * own terms. The game's adapter builds one from the world each step; the
 * development rooms build one from a trial.
 */
export interface CascadeManagerView {
  /** Mains to the unit. */
  powered: boolean;
  enable: PlantEnable;
  /** The plant started (in AUTO, the control room's START and STOP). */
  running: boolean;
  /** The common flow header's sensor, and the set point it is held to, °C. */
  headerC: number;
  setpointC: number;
  /** The header's recent readings, oldest first, evenly spaced. */
  trend: readonly number[];
  /** How many minutes `trend` spans. */
  trendMinutes: number;
  /** The total firing demand, 0 to 1 of the plant. */
  demand: number;
  /** The lead boiler, 0-based. */
  lead: number;
  rotation: CascadeRotation;
  /** Staging delays and minimum run time, seconds. */
  stageUpS: number;
  stageDownS: number;
  minRunS: number;
  boilers: readonly CascadeBoilerView[];
  /**
   * The plant's own alarms in words ("HEADER LOW"), each flashing until
   * accepted, then steady until it clears.
   */
  alarms: readonly CascadeAlarm[];
  /** The time of day, seconds since midnight. */
  clock: number;
}

// ---- What it can change -------------------------------------------------------

/** The numeric settings, their ranges and steps (the unit's own limits). */
export const CASCADE_LIMITS = {
  setpoint: { min: 50, max: 85, step: 1 },
  stageUp: { min: 30, max: 900, step: 30 },
  stageDown: { min: 30, max: 900, step: 30 },
  minRun: { min: 60, max: 1200, step: 30 },
} as const;

export type NumberSetting = keyof typeof CASCADE_LIMITS;

/** A confirmed edit: what the unit asks of the sequencer. */
/** One of the plant's alarms, as the unit shows it. */
export interface CascadeAlarm {
  text: string;
  /** New: not yet accepted. */
  flashing: boolean;
}

/**
 * What the unit asks of the sequencer: a confirmed edit, or one of the
 * faults page's commands, ACCEPT (its alarms accepted) and RESET (every
 * locked-out boiler reset), which the boiler house's own panel had.
 */
export type CascadeEdit =
  | { command: 'accept' | 'reset' }
  | { setting: NumberSetting; value: number }
  | { setting: 'rotation'; value: CascadeRotation }
  | { setting: 'lead'; value: number };

const ROTATIONS: readonly CascadeRotation[] = ['hours', 'fixed'];
const ROTATION_NAMES = ['BY HOURS', 'FIXED'];

// ---- Its menus ---------------------------------------------------------------

export type CascadePage =
  | 'home'
  | 'menu'
  | 'setpoint'
  | 'staging'
  | 'rotation'
  | 'boilers'
  | 'boiler'
  | 'faults'
  | 'about'
  | 'service';

/** The main menu, in order: each item and the page it opens. */
export const MAIN_MENU: readonly { label: string; page: CascadePage }[] = [
  { label: 'FLOW SET POINT', page: 'setpoint' },
  { label: 'STAGING', page: 'staging' },
  { label: 'MODE AND ROTATION', page: 'rotation' },
  { label: 'BOILER HOURS', page: 'boilers' },
  { label: 'FAULTS', page: 'faults' },
  { label: 'UNIT INFORMATION', page: 'about' },
];

/** The menus' state: which page, which row, and a value being edited. */
export interface CascadeUi {
  page: CascadePage;
  /** The row selected on a list page. */
  cursor: number;
  /** The main menu's row, kept while a page under it is open. */
  menuCursor: number;
  /** The value being edited (a number, or a choice's index), or null. */
  editing: number | null;
  /** The boiler a boiler page shows. */
  boiler: number;
  /** The INFO key's help showing. */
  info: boolean;
  /** Seconds since the last key or turn. */
  quiet: number;
}

export const newCascadeUi = (): CascadeUi => ({
  page: 'home',
  cursor: 0,
  menuCursor: 0,
  editing: null,
  boiler: 0,
  info: false,
  quiet: 0,
});

/** After this long untouched the unit goes back to its home page, dropping an edit. */
export const HOME_AFTER_S = 240;

export type CascadeKey = 'home' | 'back' | 'info' | 'service';
export type CascadeInput =
  | { kind: 'turn'; direction: -1 | 1 }
  | { kind: 'push' }
  | { kind: 'key'; key: CascadeKey };

type Editable =
  | {
      kind: 'number';
      setting: NumberSetting;
      value: number;
      format: (v: number) => string;
    }
  | {
      kind: 'choice';
      setting: 'rotation' | 'lead';
      index: number;
      names: readonly string[];
    };

interface Row {
  label: string;
  value: string;
  edit?: Editable;
  /** A boilers-page row: push opens this boiler. */
  opens?: number;
  /** A faults-page command row: push does it. */
  does?: 'accept' | 'reset';
}

const minutes = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} MIN`;
const degrees = (v: number) => `${v.toFixed(0)}°C`;
const thousands = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const boilerName = (i: number) => `B${i + 1}`;

const STATE_NAMES: Record<CascadeBoilerState, string> = {
  off: 'OFF',
  standby: 'STANDBY',
  called: 'CALLED',
  purge: 'PURGING',
  ignition: 'IGNITION',
  firing: 'FIRING',
  overrun: 'PUMP OVERRUN',
  lockout: 'LOCKOUT',
};

const numberRow = (
  label: string,
  setting: NumberSetting,
  value: number,
  format: (v: number) => string,
): Row => ({
  label,
  value: format(value),
  edit: { kind: 'number', setting, value, format },
});

/** A page's rows, from what it is shown. */
function rows(
  page: CascadePage,
  view: CascadeManagerView,
  ui: CascadeUi,
): Row[] {
  const n = view.boilers.length;
  switch (page) {
    case 'menu':
      return MAIN_MENU.map((m) => ({ label: m.label, value: '>' }));
    case 'setpoint':
      return [
        numberRow('FLOW SET POINT', 'setpoint', view.setpointC, degrees),
        { label: 'HEADER NOW', value: `${view.headerC.toFixed(1)}°C` },
      ];
    case 'staging':
      return [
        numberRow('STAGE UP DELAY', 'stageUp', view.stageUpS, minutes),
        numberRow('STAGE DOWN DELAY', 'stageDown', view.stageDownS, minutes),
        numberRow('MIN RUN TIME', 'minRun', view.minRunS, minutes),
      ];
    case 'rotation':
      return [
        // Series only: shown, not changed.
        { label: 'MODE', value: 'SERIES' },
        {
          label: 'LEAD ROTATION',
          value: ROTATION_NAMES[ROTATIONS.indexOf(view.rotation)],
          edit: {
            kind: 'choice',
            setting: 'rotation',
            index: ROTATIONS.indexOf(view.rotation),
            names: ROTATION_NAMES,
          },
        },
        {
          label: view.rotation === 'fixed' ? 'FIXED LEAD' : 'LEAD NOW',
          value: boilerName(view.lead),
          edit:
            view.rotation === 'fixed'
              ? {
                  kind: 'choice',
                  setting: 'lead',
                  index: view.lead,
                  names: view.boilers.map((_, i) => boilerName(i)),
                }
              : undefined,
        },
      ] satisfies Row[];
    case 'boilers':
      return view.boilers.map((b, i) => ({
        label: `${boilerName(i)} ${thousands(b.hours).padStart(7)} H`,
        value: `${thousands(b.starts)} ST`,
        opens: i,
      }));
    case 'boiler': {
      const b = view.boilers[Math.min(ui.boiler, n - 1)];
      if (!b) return [];
      return [
        { label: 'STATE', value: STATE_NAMES[b.state] },
        {
          label: 'FIRING RATE',
          value: b.state === 'firing' ? `${Math.round(b.rate * 100)}%` : '--',
        },
        { label: 'FLOW TEMP', value: `${b.flowC.toFixed(1)}°C` },
        { label: 'HOURS RUN', value: thousands(b.hours) },
        { label: 'STARTS', value: thousands(b.starts) },
        { label: 'CODE', value: b.code ?? '--' },
        { label: 'LEAD', value: ui.boiler === view.lead ? 'YES' : 'NO' },
      ];
    }
    case 'faults': {
      const faults: Row[] = view.alarms.map((a) => ({
        label: a.text,
        value: a.flashing ? 'NEW' : 'ACK',
      }));
      view.boilers.forEach((b, i) => {
        if (b.state === 'lockout')
          faults.push({
            label: `${boilerName(i)} LOCKOUT`,
            value: b.code ?? '',
          });
      });
      if (view.enable === 'off')
        faults.push({ label: 'PLANT ENABLE OFF', value: '' });
      return [
        ...(faults.length ? faults : [{ label: 'NO FAULTS', value: '' }]),
        { label: 'ACCEPT ALARMS', value: '>', does: 'accept' },
        { label: 'RESET LOCKOUTS', value: '>', does: 'reset' },
      ];
    }
    case 'about':
      return [
        { label: 'HAMWARMY CM6', value: '' },
        { label: 'CASCADE MANAGER', value: '' },
        { label: 'SOFTWARE', value: '2.14' },
        { label: 'BOILERS', value: String(n) },
        { label: 'BUS', value: 'MODBUS RTU' },
      ];
    case 'service':
      return [
        { label: 'MODBUS ADDRESS', value: '1' },
        { label: 'MODBUS LINE', value: '19200 8E1' },
        { label: 'BACNET MS/TP MAC', value: '12' },
        { label: 'USB SERVICE', value: 'NO DEVICE' },
        { label: 'BOILER BUS', value: `${n}/${n} OK` },
      ];
    default:
      return [];
  }
}

const parentOf = (page: CascadePage): CascadePage =>
  page === 'boiler'
    ? 'boilers'
    : page === 'menu' || page === 'service' || page === 'home'
      ? 'home'
      : 'menu';

/** The edit's next value one detent `direction` on, or null at its end. */
function stepped(e: Editable, at: number, direction: -1 | 1) {
  if (e.kind === 'number') {
    const { min, max, step } = CASCADE_LIMITS[e.setting];
    const next = at + direction * step;
    return next < min - 1e-9 || next > max + 1e-9 ? null : next;
  }
  const next = at + direction;
  return next < 0 || next >= e.names.length ? null : next;
}

const editOf = (e: Editable, at: number): CascadeEdit =>
  e.kind === 'number'
    ? { setting: e.setting, value: at }
    : e.setting === 'rotation'
      ? { setting: 'rotation', value: ROTATIONS[at] }
      : { setting: 'lead', value: at };

/** The row the cursor is on, if a list page. */
function selected(ui: CascadeUi, view: CascadeManagerView): Row | undefined {
  return rows(ui.page, view, ui)[ui.cursor];
}

/**
 * Whether the knob turned `direction` would do anything now, for its
 * crosshair cue: a value at its limit, or a list at its end, would not.
 */
export function canTurn(
  ui: CascadeUi,
  view: CascadeManagerView,
  direction: -1 | 1,
) {
  if (!view.powered) return false;
  if (ui.info) return true;
  if (ui.page === 'home') return false;
  if (ui.page === 'boiler') {
    const next = ui.boiler + direction;
    return next >= 0 && next < view.boilers.length;
  }
  const row = selected(ui, view);
  if (ui.editing !== null && row?.edit)
    return stepped(row.edit, ui.editing, direction) !== null;
  const next = ui.cursor + direction;
  return next >= 0 && next < rows(ui.page, view, ui).length;
}

/** Whether a push would do anything now. */
export function canPush(ui: CascadeUi, view: CascadeManagerView) {
  if (!view.powered) return false;
  if (ui.info || ui.page === 'home' || ui.page === 'menu') return true;
  const row = selected(ui, view);
  return (
    !!row && (!!row.edit || row.opens !== undefined || row.does !== undefined)
  );
}

/**
 * What a turn, push or key does to the menus: the new state, and an edit
 * for the sequencer when a push confirms one. Unpowered, nothing happens.
 */
export function cascadeInput(
  ui: CascadeUi,
  view: CascadeManagerView,
  input: CascadeInput,
): { ui: CascadeUi; edit?: CascadeEdit } {
  if (!view.powered) return { ui };
  const next: CascadeUi = { ...ui, quiet: 0 };
  // The help shows until the next key or turn, which only closes it.
  if (ui.info) {
    next.info = false;
    return { ui: next };
  }
  if (input.kind === 'key') {
    switch (input.key) {
      case 'info':
        next.info = true;
        return { ui: next };
      case 'home':
        return { ui: { ...next, page: 'home', cursor: 0, editing: null } };
      case 'service':
        return { ui: { ...next, page: 'service', cursor: 0, editing: null } };
      case 'back': {
        if (ui.editing !== null) return { ui: { ...next, editing: null } };
        const up = parentOf(ui.page);
        return {
          ui: {
            ...next,
            page: up,
            cursor:
              up === 'menu' ? ui.menuCursor : up === 'boilers' ? ui.boiler : 0,
          },
        };
      }
    }
  }
  if (input.kind === 'turn') {
    if (!canTurn(ui, view, input.direction)) return { ui: next };
    if (ui.page === 'boiler')
      return { ui: { ...next, boiler: ui.boiler + input.direction } };
    const row = selected(ui, view);
    if (ui.editing !== null && row?.edit)
      return {
        ui: {
          ...next,
          editing: stepped(row.edit, ui.editing, input.direction),
        },
      };
    const cursor = ui.cursor + input.direction;
    return {
      ui: {
        ...next,
        cursor,
        menuCursor: ui.page === 'menu' ? cursor : ui.menuCursor,
      },
    };
  }
  // A push.
  if (ui.page === 'home')
    return { ui: { ...next, page: 'menu', cursor: ui.menuCursor } };
  if (ui.page === 'menu')
    return {
      ui: {
        ...next,
        page: MAIN_MENU[ui.cursor].page,
        menuCursor: ui.cursor,
        cursor: 0,
      },
    };
  const row = selected(ui, view);
  if (row?.opens !== undefined)
    return { ui: { ...next, page: 'boiler', boiler: row.opens, cursor: 0 } };
  if (row?.does) return { ui: next, edit: { command: row.does } };
  if (!row?.edit) return { ui: next };
  if (ui.editing === null)
    return {
      ui: {
        ...next,
        editing: row.edit.kind === 'number' ? row.edit.value : row.edit.index,
      },
    };
  return { ui: { ...next, editing: null }, edit: editOf(row.edit, ui.editing) };
}

/** Time passing: untouched long enough, the unit goes home. */
export function cascadeTick(ui: CascadeUi, seconds: number): CascadeUi {
  const quiet = ui.quiet + seconds;
  if (quiet >= HOME_AFTER_S && (ui.page !== 'home' || ui.info))
    return { ...newCascadeUi(), menuCursor: ui.menuCursor, quiet };
  return { ...ui, quiet };
}

// ---- What the screen shows ------------------------------------------------------

/** The display's size in dots: a 240 × 128 FSTN graphic module. */
export const SCREEN_W = 240;
export const SCREEN_H = 128;

/** How a boiler is drawn on the home page's schematic. */
export type BoilerGlyph =
  | 'off'
  | 'standby'
  | 'called'
  | 'purge'
  | 'fire'
  | 'overrun'
  | 'lock';

const GLYPHS: Record<CascadeBoilerState, BoilerGlyph> = {
  off: 'off',
  standby: 'standby',
  called: 'called',
  purge: 'purge',
  ignition: 'purge',
  firing: 'fire',
  overrun: 'overrun',
  lockout: 'lock',
};

/** The trend box on the home page, in dots. */
const TREND = { x: 2, y: 57, w: 112, h: 34 };

export type CascadeScreen =
  | { kind: 'off' }
  | {
      kind: 'home';
      status: string;
      clock: string;
      header: string;
      set: string;
      /** The trend's dot rows inside its box, and the set point's. */
      trend: number[];
      setRow: number;
      span: string;
      demand: number;
      boilers: { glyph: BoilerGlyph; size: number }[];
      lead: number;
      lines: [string, string];
      banner: string;
      alarm: boolean;
      /** The flames' frame, 0 to 3; 0 when nothing fires. */
      flame: number;
      info: string[] | null;
    }
  | {
      kind: 'list';
      title: string;
      where: string;
      rows: { label: string; value: string; on: boolean; editing: boolean }[];
      hint: string;
      info: string[] | null;
    };

/** How many list rows fit under the title and above the hint. */
const ROWS_SHOWN = 9;

/** The flames' frame rate: four frames of flicker, five a second. */
export const FLAME_HZ = 5;

const INFO: Record<CascadePage, string[]> = {
  home: [
    'FLOW HEADER TEMPERATURE',
    'AGAINST ITS SET POINT,',
    'THE PLANT DEMAND AND',
    'EACH BOILER. PUSH THE',
    'KNOB FOR THE MENU.',
  ],
  menu: ['TURN TO CHOOSE A PAGE,', 'PUSH TO OPEN IT.', 'BACK RETURNS HOME.'],
  setpoint: [
    'THE COMMON FLOW HEADER',
    'IS HELD AT THIS SET',
    'POINT. PUSH TO EDIT,',
    'TURN, PUSH TO SAVE.',
  ],
  staging: [
    'A BOILER IS ADDED AFTER',
    'THE STAGE UP DELAY AT',
    'HIGH FIRE, SHED AFTER',
    'THE STAGE DOWN DELAY.',
    'EACH RUNS AT LEAST ITS',
    'MINIMUM RUN TIME.',
  ],
  rotation: [
    'SERIES: THE LEAD TAKES',
    'THE LOAD, THE NEXT ONLY',
    'WHEN IT IS AT FULL FIRE.',
    'THE LEAD ROTATES BY',
    'HOURS RUN, OR IS FIXED.',
  ],
  boilers: ['HOURS RUN AND BURNER', 'STARTS. PUSH FOR A', "BOILER'S DETAILS."],
  boiler: ['TURN FOR THE NEXT', 'BOILER. BACK TO LIST.'],
  faults: [
    'ACTIVE FAULTS. A LOCKED',
    'OUT BOILER IS RESET AT',
    'THE BOILER ITSELF.',
  ],
  about: ['HAMWARMY HEATING LTD', 'SERVICE 0345 000 1914'],
  service: ['SERVICE PAGE: BUS AND', 'COMMS SETTINGS. HOME', 'TO LEAVE.'],
};

const TITLES: Record<CascadePage, string> = {
  home: '',
  menu: 'MAIN MENU',
  setpoint: 'FLOW SET POINT',
  staging: 'STAGING',
  rotation: 'MODE AND ROTATION',
  boilers: 'BOILER HOURS',
  boiler: 'BOILER',
  faults: 'FAULTS',
  about: 'UNIT INFORMATION',
  service: 'SERVICE',
};

const clockText = (s: number) => {
  const m = Math.floor((((s % 86400) + 86400) % 86400) / 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** The trend's range: the set point 20 °C down to 5 °C up, so its line keeps still. */
const trendRange = (set: number) => ({ lo: set - 20, hi: set + 5 });

const rowOf = (v: number, set: number) => {
  const { lo, hi } = trendRange(set);
  const inner = TREND.h - 3;
  const r = Math.round(((hi - v) / (hi - lo)) * inner);
  return Math.max(0, Math.min(inner, r));
};

/**
 * What the screen shows now, described: cheap, and the same description
 * whenever nothing it shows has changed (`screenKey`), so the display
 * draws only on a change. `seconds` drives the flames' flicker, which
 * counts only while a boiler fires.
 */
export function cascadeScreen(
  view: CascadeManagerView,
  ui: CascadeUi,
  seconds: number,
): CascadeScreen {
  if (!view.powered) return { kind: 'off' };
  const info = ui.info ? INFO[ui.page] : null;
  if (ui.page === 'home') {
    const firing = view.boilers.filter((b) => b.state === 'firing').length;
    const locked = view.boilers.findIndex((b) => b.state === 'lockout');
    const status =
      view.enable === 'off'
        ? 'OFF'
        : view.enable === 'hand'
          ? 'HAND'
          : view.running
            ? 'AUTO RUN'
            : 'AUTO STOP';
    const banner =
      locked >= 0
        ? `${boilerName(locked)} LOCKOUT ${view.boilers[locked].code ?? ''}`.trim()
        : view.alarms.length
          ? view.alarms[0].text
          : view.enable === 'off'
            ? 'PLANT DISABLED'
            : view.enable === 'hand'
              ? 'HAND: PLANT RUNS REGARDLESS'
              : !view.running
                ? 'STOPPED: START IN CONTROL RM'
                : 'PUSH KNOB FOR MENU';
    const samples = view.trend.slice(-(TREND.w - 4));
    return {
      kind: 'home',
      status,
      clock: clockText(view.clock),
      header: view.headerC.toFixed(1),
      set: `SET ${view.setpointC.toFixed(1)}°C`,
      trend: samples.map((v) => rowOf(v, view.setpointC)),
      setRow: rowOf(view.setpointC, view.setpointC),
      span: `-${Math.round(view.trendMinutes)}MIN`,
      demand: Math.round(Math.max(0, Math.min(1, view.demand)) * 100),
      boilers: view.boilers.map((b) => ({
        glyph: GLYPHS[b.state],
        // A flame's size, by its rate, in three steps.
        size:
          b.state === 'firing' ? 1 + Math.min(2, Math.floor(b.rate * 3)) : 0,
      })),
      lead: view.lead,
      lines: [
        `LEAD ${boilerName(view.lead)} SERIES`,
        `${firing}/${view.boilers.length} FIRING`,
      ],
      banner,
      alarm: view.alarms.length > 0 || locked >= 0,
      flame: firing ? Math.floor(seconds * FLAME_HZ) % 4 : 0,
      info,
    };
  }
  const all = rows(ui.page, view, ui);
  const top = Math.max(
    0,
    Math.min(ui.cursor - ROWS_SHOWN + 1, all.length - ROWS_SHOWN),
  );
  const shown = all.slice(top, top + ROWS_SHOWN).map((row, k) => {
    const at = top + k;
    const editing = ui.editing !== null && at === ui.cursor && !!row.edit;
    let value = row.value;
    if (editing && row.edit)
      value =
        row.edit.kind === 'number'
          ? row.edit.format(ui.editing!)
          : row.edit.names[ui.editing!];
    const listed =
      ui.page !== 'boiler' && ui.page !== 'about' && ui.page !== 'service';
    return {
      label: row.label,
      value,
      on: listed && at === ui.cursor && !editing,
      editing,
    };
  });
  const row = all[ui.cursor];
  const hint =
    ui.editing !== null
      ? 'TURN: CHANGE  PUSH: SAVE'
      : ui.page === 'boiler'
        ? 'TURN: NEXT BOILER'
        : row?.edit
          ? 'TURN: SELECT  PUSH: EDIT'
          : row?.opens !== undefined || ui.page === 'menu'
            ? 'TURN: SELECT  PUSH: OPEN'
            : row?.does === 'accept'
              ? 'TURN: SELECT  PUSH: ACCEPT'
              : row?.does === 'reset'
                ? 'TURN: SELECT  PUSH: RESET'
                : ui.page === 'faults'
                  ? 'TURN: SELECT  BACK: RETURN'
                  : 'BACK: RETURN';
  return {
    kind: 'list',
    title:
      ui.page === 'boiler'
        ? `${TITLES.boiler} ${boilerName(ui.boiler)}`
        : TITLES[ui.page],
    where:
      ui.page === 'boiler'
        ? `${ui.boiler + 1}/${view.boilers.length}`
        : all.length > 1
          ? `${Math.min(ui.cursor, all.length - 1) + 1}/${all.length}`
          : '',
    rows: shown,
    hint,
    info,
  };
}

/** A screen's identity: equal keys draw the same dots. */
export const screenKey = (screen: CascadeScreen) => JSON.stringify(screen);

// ---- Drawing it in dots --------------------------------------------------------

/** The schematic's geometry: six boilers under the flow header. */
const PLANT = { x: 122, w: 16, gap: 3, top: 28, h: 32, header: 20, ret: 66 };

/**
 * A flame, its base at (cx, base), `size` 1 to 3, in flicker frame
 * `frame`: a teardrop leaning one way and the other, hollow at its heart
 * when large.
 */
function flame(
  f: DotFrame,
  cx: number,
  base: number,
  size: number,
  frame: number,
) {
  const h = 8 + size * 5;
  const half = 2 + size * 1.4;
  const lean = [0, 1, 0, -1][frame];
  const lick = [0, 1, 2, 1][frame];
  for (let r = 0; r < h + lick; r++) {
    const u = r / (h + lick);
    // Round at the base, tapering to a point.
    const w =
      half * Math.sqrt(Math.max(0, 1 - u)) * Math.min(1, (u + 0.15) * 2.2);
    const x0 = cx + lean * u * u * 2;
    for (let dx = -Math.round(w); dx <= Math.round(w); dx++) {
      const hollow = size > 1 && u < 0.55 && Math.abs(dx) < w - 1.6 && r > 1;
      setDot(f, x0 + dx, base - r, !hollow);
    }
  }
}

/** A box drawn every other dot: a boiler out of the rota. */
function dotted(f: DotFrame, x: number, y: number, w: number, h: number) {
  for (let i = 0; i < w; i += 2) {
    setDot(f, x + i, y);
    setDot(f, x + i, y + h - 1);
  }
  for (let j = 0; j < h; j += 2) {
    setDot(f, x, y + j);
    setDot(f, x + w - 1, y + j);
  }
}

function line(f: DotFrame, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++)
    setDot(f, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
}

function drawBoiler(
  f: DotFrame,
  i: number,
  b: { glyph: BoilerGlyph; size: number },
  lead: boolean,
  frame: number,
) {
  const x = PLANT.x + i * (PLANT.w + PLANT.gap);
  const cx = x + PLANT.w / 2;
  const { top, h } = PLANT;
  // Its flow riser to the header and its return below.
  line(f, Math.floor(cx), PLANT.header, Math.floor(cx), top);
  line(f, Math.floor(cx), top + h, Math.floor(cx), PLANT.ret);
  if (b.glyph === 'off') dotted(f, x, top, PLANT.w, h);
  else box(f, x, top, PLANT.w, h);
  // Its burner's port at the foot of its chamber.
  if (b.glyph !== 'off')
    line(f, x + 3, top + h - 4, x + PLANT.w - 4, top + h - 4);
  const base = top + h - 6;
  switch (b.glyph) {
    case 'fire':
      flame(f, Math.floor(cx), base, b.size, (frame + i) % 4);
      break;
    case 'purge':
      // Air going through: three dashes.
      for (let k = 0; k < 3; k++)
        line(f, x + 4, top + 8 + k * 6, x + PLANT.w - 5, top + 8 + k * 6);
      break;
    case 'called':
      fillBox(f, Math.floor(cx) - 1, base - 2, 3, 3);
      break;
    case 'overrun':
      // Its pump running on: a small rotor on the return.
      box(f, Math.floor(cx) - 2, top + h + 1, 5, 4);
      break;
    case 'lock':
      line(f, x + 2, top + 2, x + PLANT.w - 3, top + h - 3);
      line(f, x + PLANT.w - 3, top + 2, x + 2, top + h - 3);
      break;
    default:
      break;
  }
  // Its number below, inverted for the lead.
  const label = String(i + 1);
  const lx = Math.floor(cx) - 2;
  if (lead) {
    fillBox(f, lx - 2, 69, 9, 10);
    text(f, lx, 70, label, 1, false);
  } else text(f, lx, 70, label);
}

/** The INFO key's help, in a box over whatever the page shows. */
function drawInfo(f: DotFrame, lines: string[]) {
  const w = 4 + Math.max(...lines.map((l) => textWidth(l))) + 6;
  const h = 14 + lines.length * 9;
  const x = Math.floor((SCREEN_W - w) / 2);
  const y = Math.floor((SCREEN_H - h) / 2);
  fillBox(f, x - 1, y - 1, w + 2, h + 2, false);
  box(f, x, y, w, h);
  box(f, x + 1, y + 1, w - 2, h - 2);
  fillBox(f, x + 2, y + 2, w - 4, 9);
  text(f, x + 4, y + 3, 'INFO', 1, false);
  lines.forEach((l, k) => text(f, x + 5, y + 14 + k * 9, l));
}

/** The screen drawn in dots: lit dots are the FSTN's dark pixels. */
export function drawCascadeScreen(screen: CascadeScreen): DotFrame {
  const f = dotFrame(SCREEN_W, SCREEN_H);
  if (screen.kind === 'off') return f;
  if (screen.kind === 'home') {
    // The title bar.
    fillBox(f, 0, 0, SCREEN_W, 10);
    text(f, 2, 1, 'HAMWARMY CM6', 1, false);
    const right = `${screen.status}  ${screen.clock}`;
    text(f, SCREEN_W - 2 - textWidth(right), 1, right, 1, false);
    // The header temperature, large, and its set point.
    text(f, 2, 13, 'FLOW HEADER');
    text(f, 2, 23, screen.header, 3);
    const hx = 2 + textWidth(screen.header, 3) + 3;
    text(f, hx, 23, '°');
    text(f, hx + 6, 23, 'C', 2);
    text(f, 2, 47, screen.set);
    // Its trend: a box, the set point dotted across, the readings joined.
    box(f, TREND.x, TREND.y, TREND.w, TREND.h);
    for (let i = 2; i < TREND.w - 2; i += 3)
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
    text(f, TREND.x + TREND.w - textWidth('NOW'), TREND.y + TREND.h + 2, 'NOW');
    // The plant: the flow header across the top, the return below.
    const span = screen.boilers.length * (PLANT.w + PLANT.gap) - PLANT.gap;
    line(f, PLANT.x - 2, PLANT.header, PLANT.x + span + 1, PLANT.header);
    line(f, PLANT.x - 2, PLANT.ret, PLANT.x + span + 1, PLANT.ret);
    text(f, PLANT.x, 12, 'FLOW');
    text(f, PLANT.x + span - textWidth('HEADER'), 12, 'HEADER');
    screen.boilers.forEach((b, i) =>
      drawBoiler(f, i, b, i === screen.lead, screen.flame),
    );
    text(f, PLANT.x, 84, screen.lines[0]);
    text(f, PLANT.x, 94, screen.lines[1]);
    // The firing demand as a bar.
    text(f, 2, 105, 'DEMAND');
    const bx = 42;
    const bw = 160;
    box(f, bx, 103, bw, 11);
    fillBox(f, bx + 2, 105, Math.round(((bw - 4) * screen.demand) / 100), 7);
    for (let q = 1; q < 4; q++) setDot(f, bx + (bw * q) / 4, 102);
    const pct = `${screen.demand}%`;
    text(f, SCREEN_W - 2 - textWidth(pct), 105, pct);
    // The status line, inverted on a fault.
    if (screen.alarm) fillBox(f, 0, 117, SCREEN_W, 11);
    text(f, 2, 119, screen.banner.slice(0, 39), 1, !screen.alarm);
    if (screen.info) drawInfo(f, screen.info);
    return f;
  }
  fillBox(f, 0, 0, SCREEN_W, 10);
  text(f, 2, 1, screen.title, 1, false);
  if (screen.where)
    text(f, SCREEN_W - 2 - textWidth(screen.where), 1, screen.where, 1, false);
  screen.rows.forEach((row, k) => {
    const y = 13 + k * 11;
    if (row.on) fillBox(f, 0, y - 2, SCREEN_W, 11);
    text(f, 3, y, row.label.slice(0, 26), 1, !row.on);
    if (!row.value) return;
    const vx = SCREEN_W - (row.editing ? 11 : 3) - textWidth(row.value);
    if (row.editing) {
      fillBox(f, vx - 9, y - 2, SCREEN_W - vx + 9, 11);
      text(f, vx - 7, y, '<', 1, false);
      text(f, vx, y, row.value, 1, false);
      text(f, SCREEN_W - 7, y, '>', 1, false);
    } else text(f, vx, y, row.value, 1, !row.on);
  });
  line(f, 0, 116, SCREEN_W - 1, 116);
  text(f, 2, 119, screen.hint);
  if (screen.info) drawInfo(f, screen.info);
  return f;
}

// ---- Its LEDs ----------------------------------------------------------------

export type LedColour = 'off' | 'green' | 'amber' | 'red';

/**
 * A boiler's LED on the fascia: green firing, amber called, purging or
 * igniting, red locked out (flashing, `flash` its phase), off otherwise.
 */
export function boilerLed(b: CascadeBoilerView, flash: boolean): LedColour {
  switch (b.state) {
    case 'firing':
      return 'green';
    case 'called':
    case 'purge':
    case 'ignition':
      return 'amber';
    case 'lockout':
      return flash ? 'red' : 'off';
    default:
      return 'off';
  }
}

/**
 * The unit's status LED: green steady while running in AUTO, green
 * flashing stopped in AUTO, amber in HAND, red on a fault (flashing
 * until its alarm is accepted), off with the
 * plant disabled or no power.
 */
export function statusLed(view: CascadeManagerView, flash: boolean): LedColour {
  if (!view.powered) return 'off';
  // A new alarm flashes it; accepted, or a lockout alone, it is steady.
  if (view.alarms.some((a) => a.flashing)) return flash ? 'red' : 'off';
  if (view.alarms.length || view.boilers.some((b) => b.state === 'lockout'))
    return 'red';
  if (view.enable === 'off') return 'off';
  if (view.enable === 'hand') return 'amber';
  return view.running || flash ? 'green' : 'off';
}
