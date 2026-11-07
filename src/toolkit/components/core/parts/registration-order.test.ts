import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../views/eighties-controls';
import {
  markAnswer,
  useRegistrationOf,
} from '../../../controls/input/use-marking';
import type { UseQuery } from '../../../controls/input/use-marking';
import {
  markTurnable,
  turningKnobs,
} from '../../../controls/input/knob-turning';
import { beginPart, createPartSet } from './parts';
import { jogDial } from './jog-dial';

/**
 * Mission 161 (the owner, 2026-11-06): a specific answer beats the plain
 * one whichever is registered first, a use set straight on a room's part
 * set is registered as a part's is, and the CM6 jog dial's cap pushes,
 * its rim turns and a pad's LB or RB turns it wherever it is aimed.
 */

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const camera = new PerspectiveCamera();
camera.position.set(0, 0, 1);
camera.updateMatrixWorld(true);

/** A click on `object` at `point`, as the resolver would make it. */
const queryOn = (object: Object3D, point = new Vector3()): UseQuery => ({
  object,
  hit: object,
  point,
  camera,
  x: 0,
  pad: false,
});
const answerOf = (object: Object3D) => {
  const registration = useRegistrationOf(object);
  return registration?.usable(queryOn(registration.object)) ?? null;
};
const click = (object: Object3D, point?: Vector3) => {
  const registration = useRegistrationOf(object);
  registration?.action?.(queryOn(registration.object, point));
};
const SPECIFIC = { gesture: 'push', possible: false } as const;

describe('a part’s use and its cue, in either order', () => {
  it('cue, then use: the cue’s answer stands and the click runs the use', () => {
    const part = beginPart(createPanelKit(), 'test');
    const on = new Group();
    let ran = 0;
    part.cue(on, () => SPECIFIC);
    part.uses.set(on, () => ran++);
    expect(answerOf(on)).toEqual(SPECIFIC);
    click(on);
    expect(ran).toBe(1);
  });

  it('use, then cue: the same', () => {
    const part = beginPart(createPanelKit(), 'test');
    const on = new Group();
    let ran = 0;
    part.uses.set(on, () => ran++);
    part.cue(on, () => SPECIFIC);
    expect(answerOf(on)).toEqual(SPECIFIC);
    click(on);
    expect(ran).toBe(1);
  });

  it('a knob marked turnable before its use is set still answers a turn', () => {
    const part = beginPart(createPanelKit(), 'test');
    const on = new Group();
    let ran = 0;
    markTurnable(on, { canTurn: () => true });
    part.uses.set(on, () => ran++);
    expect(answerOf(on)?.gesture).toBe('turn');
    click(on);
    expect(ran).toBe(1);
  });

  it('a later specific answer replaces the plain one and keeps the action', () => {
    const part = beginPart(createPanelKit(), 'test');
    const on = new Group();
    let ran = 0;
    part.uses.set(on, () => ran++);
    expect(answerOf(on)?.gesture).toBe('use');
    markAnswer(on, () => SPECIFIC);
    expect(answerOf(on)).toEqual(SPECIFIC);
    click(on);
    expect(ran).toBe(1);
  });
});

describe('a room’s part set registers the uses set on it directly', () => {
  it('a use set on the set (a desk’s PC, a valve’s chain) is clicked through the one resolver, and unregistered when taken away', () => {
    const parts = createPartSet();
    const pc = new Group();
    let ran = 0;
    parts.uses.set(pc, () => ran++);
    expect(answerOf(pc)?.gesture).toBe('use');
    click(pc);
    expect(ran).toBe(1);
    parts.uses.delete(pc);
    expect(useRegistrationOf(pc)).toBeNull();
  });

  it('adding a part keeps the part’s own cue', () => {
    const kit = createPanelKit();
    const parts = createPartSet();
    const part = beginPart(kit, 'test');
    const on = new Group();
    part.uses.set(on, () => {});
    part.cue(on, () => SPECIFIC);
    parts.add(part.part());
    expect(answerOf(on)).toEqual(SPECIFIC);
  });

  it('disposing the set unregisters what it registered', () => {
    const parts = createPartSet();
    const pc = new Group();
    parts.uses.set(pc, () => {});
    parts.dispose();
    expect(useRegistrationOf(pc)).toBeNull();
  });
});

describe('the CM6 jog dial: cap pushes, rim turns, LB/RB turn it anywhere', () => {
  const dial = () => {
    const events: string[] = [];
    const part = jogDial(createPanelKit(), {
      onTurn: (d) => events.push(`turn ${d}`),
      onPush: () => events.push('push'),
    });
    part.object.updateMatrixWorld(true);
    const [rim, cap] = [...part.uses.keys()];
    return { part, rim, cap, events };
  };

  it('a click on the cap pushes; its cue says push', () => {
    const { cap, events } = dial();
    expect(answerOf(cap)?.gesture).toBe('push');
    click(cap);
    expect(events).toEqual(['push']);
  });

  it('a click on the rim turns it; its cue says turn', () => {
    const { rim, events } = dial();
    expect(answerOf(rim)?.gesture).toBe('turn');
    click(rim, new Vector3(0.01, 0, 0));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatch(/^turn /);
  });

  it('LB and RB turn it, aimed at the rim or the cap', () => {
    const { rim, cap, events } = dial();
    turningKnobs(-1, () => click(cap));
    turningKnobs(1, () => click(rim));
    expect(events).toEqual(['turn -1', 'turn 1']);
  });
});

describe('undoing registrations (ahnaa_dmitrieva’s review of PR #46)', () => {
  it('unmarking an answer over a registered use leaves the plain answer, and the use working', () => {
    const part = beginPart(createPanelKit(), 'test');
    const on = new Group();
    let ran = 0;
    part.uses.set(on, () => ran++);
    const unmark = markAnswer(on, () => SPECIFIC);
    unmark();
    expect(answerOf(on)?.gesture).toBe('use');
    click(on);
    expect(ran).toBe(1);
  });

  it('a part’s use set again replaces the old one; deleted, it is no longer clickable', () => {
    const part = beginPart(createPanelKit(), 'test');
    const on = new Group();
    const ran: string[] = [];
    part.uses.set(on, () => ran.push('old'));
    part.uses.set(on, () => ran.push('new'));
    click(on);
    expect(ran).toEqual(['new']);
    part.uses.delete(on);
    expect(useRegistrationOf(on)).toBeNull();
  });
});
