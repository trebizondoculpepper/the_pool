import { Group } from 'three';
import type { PanelKit } from '../views/eighties-controls';
import { tools } from '../views/fitting-tools';
import { partAudio, recording } from '../audio/part-audio';
import {
  markTurnable,
  turningKnob,
} from '../../../controls/input/knob-turning';
import { beginPart } from './parts';
import type { Part } from './parts';

/**
 * A turn-and-push knob (a jog dial; mission 122): a 2010s controller's
 * one knob on a rotary encoder with a push switch in its shaft, as on
 * Siemens' Albatros operator units and Remeha's and Viessmann's boiler
 * panels. It turns freely, one detent a click (24 to the turn), by the
 * game's one rotary rule (`knobDirection`: a use on its left half turns
 * it down, its right half up; a pad's LB and RB); a use on its centre
 * cap pushes it, the whole knob dipping 1.5 mm. It has no end stops of
 * its own: `canTurn` says whether what it works would move, for the
 * crosshair's cue. Built in metres, facing +z, its mounting face at
 * z = 0.
 */

/** The encoder's detent: soft and quick. */
const DETENT = recording(
  new URL('../audio/assets/switch-click.wav', import.meta.url),
  0.02,
);
/** Its push switch: a short tactile click. */
const PUSH = recording(
  new URL('../audio/assets/button-press.wav', import.meta.url),
  0.03,
);

/** Detents in a full turn. */
export const JOG_DETENTS = 24;

export interface JogDialProps {
  name?: string;
  /** The knob's diameter, metres (38 mm, a typical controller's). */
  diameter?: number;
  /** One detent `direction`, -1 down (anticlockwise) or 1 up. */
  onTurn(direction: -1 | 1): void;
  onPush(): void;
  /** Whether a turn would move what it works, for the cue; always, if left out. */
  canTurn?(direction: -1 | 1): boolean;
  /** Whether a push would do anything, for the cue. */
  canPush?(): boolean;
  /** Its colours, where not the defaults' light greys and orange pointer. */
  colours?: Partial<JogDialColours>;
}

export interface JogDialColours {
  /** The skirt, and the ribs of its grip. */
  skirt: string;
  grip: string;
  /** The face round the cap, and the cap. */
  face: string;
  cap: string;
  /** The pointer line across the face and cap. */
  pointer: string;
}

/**
 * Light grey with an orange pointer (the owner, 2026-11-02: no black or
 * near-black knobs or buttons, which render badly).
 */
export const JOG_DIAL_COLOURS: JogDialColours = {
  skirt: '#b4b9bd',
  grip: '#9aa0a5',
  face: '#c8ccce',
  cap: '#dfe2e4',
  pointer: '#d4501e',
};

export function jogDial(kit: PanelKit, props: JogDialProps): Part {
  const t = tools(kit);
  const a = beginPart(kit, props.name ?? 'turn-and-push knob');
  const r = (props.diameter ?? 0.038) / 2;
  const colour = { ...JOG_DIAL_COLOURS, ...props.colours };
  // A shallow bezel ring on the fascia.
  t.cyl(
    a.object,
    t.paint('#9aa0a4', 0.4, 0.3),
    r + 0.003,
    0.002,
    0,
    0,
    0.001,
    'z',
    32,
  );
  // The knob, on its shaft: it turns, and dips when pushed.
  const shaft = new Group();
  shaft.userData.live = true;
  a.object.add(shaft);
  const turning = new Group();
  shaft.add(turning);
  const depth = 0.015;
  // Its skirt, ribbed for the fingers.
  // Skirt and ribs together, the use's target, its centre the shaft's.
  const rim = new Group();
  turning.add(rim);
  t.cyl(
    rim,
    t.paint(colour.skirt, 0.7),
    r,
    depth,
    0,
    0,
    0.002 + depth / 2,
    'z',
    36,
  );
  const grip = t.paint(colour.grip, 0.8);
  for (let k = 0; k < 18; k++) {
    const angle = (k / 18) * Math.PI * 2;
    const rib = t.box(
      rim,
      grip,
      0.0016,
      0.0016,
      depth * 0.8,
      Math.cos(angle) * r,
      Math.sin(angle) * r,
      0.002 + depth / 2,
    );
    rib.rotation.z = angle;
  }
  // Its pointer, a line from the cap to the rim, so a turn can be seen.
  const pointer = t.paint(colour.pointer, 0.5);
  t.box(
    rim,
    pointer,
    0.0016,
    r * 0.42,
    0.0006,
    0,
    r * 0.68,
    0.002 + depth + 0.0006,
  );
  // Its face, and the push cap in its middle.
  t.cyl(
    rim,
    t.paint(colour.face, 0.6),
    r * 0.92,
    0.001,
    0,
    0,
    0.002 + depth,
    'z',
    36,
  );
  const capR = r * 0.48;
  // The cap and its centre, together the push's target.
  // It turns with the knob, as an encoder's one-piece knob does.
  const cap = new Group();
  turning.add(cap);
  t.cyl(
    cap,
    t.paint(colour.cap, 0.35, 0.2),
    capR,
    0.002,
    0,
    0,
    0.002 + depth + 0.0008,
    'z',
    28,
  );
  // The pointer carried on across the cap, nearly to its centre.
  t.box(
    cap,
    pointer,
    0.0016,
    capR * 0.75,
    0.0006,
    0,
    capR * 0.5,
    0.002 + depth + 0.0019,
  );

  const canTurn = props.canTurn ?? (() => true);
  const canPush = props.canPush ?? (() => true);
  let angle = 0;
  let pressed = 0;
  const turn = (direction = 1) => {
    const d: -1 | 1 = direction < 0 ? -1 : 1;
    // The encoder clicks over its detent whether or not anything moves.
    angle -= (d * Math.PI * 2) / JOG_DETENTS;
    partAudio.play(DETENT, a.object);
    props.onTurn(d);
  };
  a.uses.set(rim, turn);
  a.disposers.push(markTurnable(rim, { canTurn }));
  a.uses.set(cap, (direction = 1) => {
    // A pad's LB or RB turns it wherever it is aimed.
    if (turningKnob()) return turn(direction);
    pressed = 0.15;
    partAudio.play(PUSH, a.object);
    props.onPush();
  });
  a.cue(cap, () => ({ gesture: 'push', possible: canPush() }));
  a.updates.push((delta) => {
    pressed = Math.max(0, pressed - delta);
    shaft.position.z = pressed > 0 ? -0.0015 : 0;
    turning.rotation.z +=
      (angle - turning.rotation.z) * Math.min(1, delta * 25);
  });
  a.shows(
    () => 'a turn-and-push knob: turn to choose or change, push to select',
  );
  return a.part();
}
