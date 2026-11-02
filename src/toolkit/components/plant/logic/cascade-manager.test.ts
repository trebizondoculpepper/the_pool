import { describe, expect, it } from 'vite-plus/test';
import {
  CASCADE_LIMITS,
  HOME_AFTER_S,
  MAIN_MENU,
  SCREEN_H,
  SCREEN_W,
  boilerLed,
  canPush,
  canTurn,
  cascadeInput,
  cascadeScreen,
  cascadeTick,
  drawCascadeScreen,
  newCascadeUi,
  screenKey,
  statusLed,
} from './cascade-manager';
import type {
  CascadeBoilerState,
  CascadeEdit,
  CascadeInput,
  CascadeManagerView,
  CascadeUi,
} from './cascade-manager';
import { isLit } from '../../industrial-control/logic/dot-matrix';
import type { DotFrame } from '../../industrial-control/logic/dot-matrix';

const boiler = (state: CascadeBoilerState, rate = 0) => ({
  state,
  rate,
  flowC: 78,
  hours: 12345,
  starts: 2345,
});

const view = (over: Partial<CascadeManagerView> = {}): CascadeManagerView => ({
  powered: true,
  enable: 'auto',
  running: true,
  headerC: 78.4,
  setpointC: 80,
  trend: [70, 72, 75, 78, 78.4],
  trendMinutes: 36,
  demand: 0.45,
  lead: 2,
  rotation: 'hours',
  stageUpS: 120,
  stageDownS: 180,
  minRunS: 300,
  boilers: [
    boiler('standby'),
    boiler('purge'),
    boiler('firing', 1),
    boiler('firing', 0.5),
    boiler('lockout'),
    boiler('off'),
  ],
  alarms: [],
  clock: 14 * 3600 + 32 * 60,
  ...over,
});

const TURN_UP: CascadeInput = { kind: 'turn', direction: 1 };
const TURN_DOWN: CascadeInput = { kind: 'turn', direction: -1 };
const PUSH: CascadeInput = { kind: 'push' };
const key = (k: 'home' | 'back' | 'info' | 'service'): CascadeInput => ({
  kind: 'key',
  key: k,
});

/** Inputs in turn, collecting the edits they make. */
function run(inputs: CascadeInput[], v = view(), ui = newCascadeUi()) {
  const edits: CascadeEdit[] = [];
  for (const input of inputs) {
    const out = cascadeInput(ui, v, input);
    ui = out.ui;
    if (out.edit) edits.push(out.edit);
  }
  return { ui, edits };
}

const litIn = (f: DotFrame, x: number, y: number, w: number, h: number) => {
  let n = 0;
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) if (isLit(f, i, j)) n++;
  return n;
};

describe('the cascade manager’s menus', () => {
  it('opens the main menu from home with a push, and pages from it', () => {
    const { ui } = run([PUSH]);
    expect(ui.page).toBe('menu');
    const opened = run([PUSH, TURN_UP, PUSH]).ui;
    expect(opened.page).toBe(MAIN_MENU[1].page);
    expect(opened.menuCursor).toBe(1);
  });

  it('edits the set point: push to edit, turn, push to save', () => {
    const { ui, edits } = run([PUSH, PUSH, PUSH, TURN_UP, TURN_UP, PUSH]);
    expect(edits).toEqual([{ setting: 'setpoint', value: 82 }]);
    expect(ui.editing).toBeNull();
  });

  it('holds an edit at its limit, and the knob says it will not turn', () => {
    const top = view({ setpointC: CASCADE_LIMITS.setpoint.max });
    const { ui } = run([PUSH, PUSH, PUSH], top);
    expect(canTurn(ui, top, 1)).toBe(false);
    expect(canTurn(ui, top, -1)).toBe(true);
    const { edits } = run([PUSH, PUSH, PUSH, TURN_UP, PUSH], top);
    expect(edits).toEqual([{ setting: 'setpoint', value: 85 }]);
  });

  it('drops an edit on BACK, and climbs a page on a second', () => {
    const editing = run([PUSH, PUSH, PUSH, TURN_UP]).ui;
    const back = cascadeInput(editing, view(), key('back'));
    expect(back.edit).toBeUndefined();
    expect(back.ui.editing).toBeNull();
    expect(cascadeInput(back.ui, view(), key('back')).ui.page).toBe('menu');
  });

  it('sets staging delays in 30 s steps', () => {
    const { edits } = run([
      PUSH,
      TURN_UP,
      PUSH,
      TURN_UP,
      PUSH,
      TURN_DOWN,
      PUSH,
    ]);
    expect(edits).toEqual([{ setting: 'stageDown', value: 150 }]);
  });

  it('chooses the rotation, and a fixed lead only when fixed', () => {
    const toRotation = [PUSH, TURN_UP, TURN_UP, PUSH, TURN_UP];
    const { edits } = run([...toRotation, PUSH, TURN_UP, PUSH]);
    expect(edits).toEqual([{ setting: 'rotation', value: 'fixed' }]);
    // The lead row is read-only by hours, editable when fixed.
    const byHours = run([...toRotation, TURN_UP]).ui;
    expect(canPush(byHours, view())).toBe(false);
    const fixed = view({ rotation: 'fixed' });
    const lead = run([...toRotation, TURN_UP, PUSH, TURN_UP, PUSH], fixed);
    expect(lead.edits).toEqual([{ setting: 'lead', value: 3 }]);
  });

  it('opens a boiler from the hours list and turns through the boilers', () => {
    const list = [PUSH, TURN_UP, TURN_UP, TURN_UP, PUSH];
    const { ui } = run([...list, TURN_UP, TURN_UP, PUSH]);
    expect(ui.page).toBe('boiler');
    expect(ui.boiler).toBe(2);
    const next = cascadeInput(ui, view(), TURN_UP).ui;
    expect(next.boiler).toBe(3);
    expect(cascadeInput(next, view(), key('back')).ui).toMatchObject({
      page: 'boilers',
      cursor: 3,
    });
  });

  it('goes home on HOME, shows help on INFO until the next input', () => {
    const deep = run([PUSH, PUSH, PUSH]).ui;
    expect(cascadeInput(deep, view(), key('home')).ui.page).toBe('home');
    const help = cascadeInput(deep, view(), key('info')).ui;
    expect(help.info).toBe(true);
    const closed = cascadeInput(help, view(), TURN_UP);
    expect(closed.ui.info).toBe(false);
    expect(closed.ui.editing).toBe(deep.editing);
  });

  it('opens the service page from the key behind the flap', () => {
    expect(run([key('service')]).ui.page).toBe('service');
  });

  it('goes home untouched, dropping an edit', () => {
    const editing = run([PUSH, PUSH, PUSH]).ui;
    expect(cascadeTick(editing, HOME_AFTER_S - 1).page).toBe('setpoint');
    const home = cascadeTick(editing, HOME_AFTER_S);
    expect(home.page).toBe('home');
    expect(home.editing).toBeNull();
  });

  it('does nothing unpowered', () => {
    const off = view({ powered: false });
    expect(run([PUSH, PUSH], off).ui.page).toBe('home');
    expect(canTurn(newCascadeUi(), off, 1)).toBe(false);
  });
});

describe('the cascade manager’s screen', () => {
  const home = newCascadeUi();

  it('describes the same screen while nothing it shows changes', () => {
    const a = screenKey(cascadeScreen(view(), home, 1.0));
    const b = screenKey(cascadeScreen(view(), home, 1.05));
    expect(a).toBe(b);
    // A tenth of a degree is shown, and so redraws.
    expect(screenKey(cascadeScreen(view({ headerC: 78.5 }), home, 1))).not.toBe(
      a,
    );
  });

  it('flickers its flames at no more than five frames a second, only while firing', () => {
    const frames = new Set<string>();
    for (let t = 0; t < 1; t += 0.01)
      frames.add(screenKey(cascadeScreen(view(), home, t)));
    expect(frames.size).toBeLessThanOrEqual(5);
    const idle = view({ boilers: view().boilers.map(() => boiler('standby')) });
    const still = new Set<string>();
    for (let t = 0; t < 2; t += 0.05)
      still.add(screenKey(cascadeScreen(idle, home, t)));
    expect(still.size).toBe(1);
  });

  it('draws a flame in a firing boiler and none in a standby one', () => {
    const f = drawCascadeScreen(cascadeScreen(view(), home, 0));
    expect(f.width).toBe(SCREEN_W);
    expect(f.height).toBe(SCREEN_H);
    // Boiler 3 (firing) and boiler 1 (standby), inside their chambers.
    const chamber = (i: number) => litIn(f, 122 + i * 19 + 2, 30, 12, 24);
    expect(chamber(2)).toBeGreaterThan(20);
    expect(chamber(0)).toBe(0);
    // Boiler 5's lockout cross.
    expect(chamber(4)).toBeGreaterThan(10);
  });

  it('fills the demand bar to its share', () => {
    const empty = drawCascadeScreen(
      cascadeScreen(view({ demand: 0 }), home, 0),
    );
    const full = drawCascadeScreen(cascadeScreen(view({ demand: 1 }), home, 0));
    expect(litIn(full, 44, 105, 156, 7)).toBeGreaterThan(1000);
    expect(litIn(empty, 44, 105, 156, 7)).toBe(0);
  });

  it('shows a lockout on its status line, inverted', () => {
    const s = cascadeScreen(view(), home, 0);
    expect(s.kind === 'home' && s.banner).toBe('B5 LOCKOUT');
    expect(s.kind === 'home' && s.alarm).toBe(true);
  });

  it('shows what stops the plant', () => {
    const fine = view({ boilers: view().boilers.map(() => boiler('standby')) });
    const banner = (v: CascadeManagerView) => {
      const s = cascadeScreen(v, home, 0);
      return s.kind === 'home' ? s.banner : '';
    };
    expect(banner({ ...fine, enable: 'off' })).toBe('PLANT DISABLED');
    expect(banner({ ...fine, running: false })).toMatch(/CONTROL RM/);
  });

  it('marks the row being edited and its value', () => {
    const ui: CascadeUi = { ...run([PUSH, PUSH, PUSH, TURN_UP]).ui };
    const s = cascadeScreen(view(), ui, 0);
    expect(s.kind).toBe('list');
    if (s.kind !== 'list') return;
    expect(s.rows[0]).toMatchObject({ editing: true, value: '81°C' });
    expect(s.hint).toMatch(/SAVE/);
    drawCascadeScreen(s);
  });

  it('lists hours and starts for every boiler', () => {
    const ui = run([PUSH, TURN_UP, TURN_UP, TURN_UP, PUSH]).ui;
    const s = cascadeScreen(view(), ui, 0);
    expect(s.kind === 'list' && s.rows.length).toBe(6);
    expect(s.kind === 'list' && s.rows[0].label).toMatch(/12,345 H/);
  });

  it('is blank unpowered', () => {
    const f = drawCascadeScreen(
      cascadeScreen(view({ powered: false }), home, 0),
    );
    expect(litIn(f, 0, 0, SCREEN_W, SCREEN_H)).toBe(0);
  });
});

describe('the cascade manager’s LEDs', () => {
  it('lights each boiler’s LED by its state', () => {
    expect(boilerLed(boiler('firing', 1), true)).toBe('green');
    expect(boilerLed(boiler('purge'), true)).toBe('amber');
    expect(boilerLed(boiler('called'), true)).toBe('amber');
    expect(boilerLed(boiler('lockout'), true)).toBe('red');
    expect(boilerLed(boiler('lockout'), false)).toBe('off');
    expect(boilerLed(boiler('standby'), true)).toBe('off');
  });

  it('shows the unit’s state on its status LED', () => {
    const ok = view({ boilers: [boiler('firing', 1)] });
    expect(statusLed(ok, false)).toBe('green');
    expect(statusLed({ ...ok, running: false }, false)).toBe('off');
    expect(statusLed({ ...ok, enable: 'hand' }, false)).toBe('amber');
    expect(statusLed(view(), true)).toBe('red');
  });
});

describe('the cascade manager’s faults page', () => {
  const toFaults = [PUSH, TURN_UP, TURN_UP, TURN_UP, TURN_UP, PUSH];
  const alarmed = view({
    alarms: [{ text: 'BOILER LOCKOUT', flashing: true }],
  });

  it('lists the alarms, new or accepted, and the lockouts', () => {
    const { ui } = run(toFaults, alarmed);
    const s = cascadeScreen(alarmed, ui, 0);
    expect(s.kind === 'list' && s.rows.map((r) => [r.label, r.value])).toEqual([
      ['BOILER LOCKOUT', 'NEW'],
      ['B5 LOCKOUT', ''],
      ['ACCEPT ALARMS', '>'],
      ['RESET LOCKOUTS', '>'],
    ]);
  });

  it('accepts the alarms and resets the lockouts from its command rows', () => {
    const accept = run([...toFaults, TURN_UP, TURN_UP, PUSH], alarmed);
    expect(accept.edits).toEqual([{ command: 'accept' }]);
    const reset = run([...toFaults, TURN_UP, TURN_UP, TURN_UP, PUSH], alarmed);
    expect(reset.edits).toEqual([{ command: 'reset' }]);
    expect(canPush(reset.ui, alarmed)).toBe(true);
  });

  it('flashes the status LED until the alarm is accepted, then holds it red', () => {
    expect(statusLed(alarmed, false)).toBe('off');
    expect(statusLed(alarmed, true)).toBe('red');
    const accepted = view({
      alarms: [{ text: 'BOILER LOCKOUT', flashing: false }],
    });
    expect(statusLed(accepted, false)).toBe('red');
  });
});
