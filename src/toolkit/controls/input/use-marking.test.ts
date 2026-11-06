import { describe, expect, it } from 'vite-plus/test';
import { Group } from 'three';
import { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';
import {
  markUsable,
  useActionOf,
  useRegistrationOf,
  usableOf,
} from './use-marking';
import type { UseQuery } from './use-marking';
import type { UseAnswer } from '../logic/use-cue';

const at = (object: Group): UseQuery => ({
  object,
  point: new Vector3(),
  camera: new PerspectiveCamera(),
  x: 0,
  pad: false,
});

const turn: UseAnswer = { gesture: 'turn', direction: 1, possible: true };
const turnable = () => turn;

describe('one registration with a cue and an action (mission 161)', () => {
  it('carries the pure answer and the click’s action apart', () => {
    const knob = new Group();
    let pressed = 0;
    markUsable(knob, turnable, () => {
      pressed++;
    });
    expect(usableOf(knob)?.usable(at(knob))).toBe(turn);
    expect(useActionOf(knob)?.object).toBe(knob);
    const action = useActionOf(knob)!.action;
    action(at(knob));
    expect(pressed).toBe(1);
  });

  it('finds the action through an ancestor, as the cue does', () => {
    const panel = new Group();
    const knob = new Group();
    panel.add(knob);
    let ran = 0;
    markUsable(panel, turnable, () => {
      ran++;
    });
    expect(useActionOf(knob)?.object).toBe(panel);
    useActionOf(knob)!.action(at(knob));
    expect(ran).toBe(1);
  });

  it('unmarking removes answer and action together', () => {
    const knob = new Group();
    const unmark = markUsable(knob, turnable, () => {});
    expect(useActionOf(knob)).not.toBeNull();
    unmark();
    expect(usableOf(knob)).toBeNull();
    expect(useActionOf(knob)).toBeNull();
  });

  it('an actionable registration always answers (a cue), a decoration neither', () => {
    const knob = new Group();
    const decoration = new Group();
    markUsable(knob, turnable, () => {});
    expect(usableOf(knob)).not.toBeNull();
    expect(useActionOf(decoration)).toBeNull();
    expect(usableOf(decoration)).toBeNull();
  });

  it('resolves cue and click to the same registration (mission 161, step 2)', () => {
    // A knob whose click runs on the same registration the cue answers.
    const knob = new Group();
    let pressed = 0;
    markUsable(knob, turnable, () => {
      pressed++;
    });
    const registration = useRegistrationOf(knob)!;
    expect(registration.object).toBe(knob);
    expect(registration.usable(at(knob))).toBe(turn);
    registration.action!(at(knob));
    expect(pressed).toBe(1);
  });

  it('a child usable without an action never runs a parent’s action (finding 2)', () => {
    // The child shows its own cue; the parent has an action. The click must
    // run the *child’s* registration, which has no action, not the parent’s.
    const panel = new Group();
    const knob = new Group();
    panel.add(knob);
    let parentRan = 0;
    markUsable(knob, turnable); // answer only, no action
    markUsable(panel, turnable, () => {
      parentRan++;
    });
    const registration = useRegistrationOf(knob)!;
    expect(registration.object).toBe(knob);
    expect(registration.action).toBeUndefined();
    expect(parentRan).toBe(0);
  });

  it('a registration with no action leaves the click to the room (migration)', () => {
    const knob = new Group();
    markUsable(knob, turnable); // answer only, no action
    expect(useRegistrationOf(knob)?.action).toBeUndefined();
  });

  it('replacing an action-bearing mark with an answer-only one clears the action', () => {
    const knob = new Group();
    const fired: string[] = [];
    markUsable(knob, turnable, () => {
      fired.push('old');
    });
    expect(useRegistrationOf(knob)?.action).toBeTruthy();
    // Re-marked with an answer only: the old action must not survive.
    markUsable(knob, turnable);
    const registration = useRegistrationOf(knob)!;
    expect(registration.action).toBeUndefined();
    registration.usable(at(knob));
    expect(fired).toEqual([]);
    // And an answer-only mark cannot resurrect a later action's disposer.
    const unmark = markUsable(knob, turnable, () => {
      fired.push('new');
    });
    useRegistrationOf(knob)!.action!(at(knob));
    expect(fired).toEqual(['new']);
    unmark();
    expect(useRegistrationOf(knob)).toBeNull();
  });
});
