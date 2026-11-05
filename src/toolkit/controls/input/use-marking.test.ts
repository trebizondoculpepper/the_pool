import { describe, expect, it } from 'vite-plus/test';
import { Group } from 'three';
import { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';
import { markUsable, useActionOf, usableOf } from './use-marking';
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
});
