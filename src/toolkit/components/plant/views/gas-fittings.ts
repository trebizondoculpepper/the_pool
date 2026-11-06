import { Group, Vector3 } from 'three';
import { turnSeen } from '../../../controls/input/knob-turning';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { FINISH, plantTools } from './plant-tools';

/**
 * Gas plumbing fittings, as a boiler house has them: to go in a gas
 * plumbing development room, and in the boiler room meanwhile. In metres.
 */

export interface BallValveView extends Part {
  /** Whether it is open now. */
  readonly open: boolean;
}

/**
 * A quarter-turn gas ball valve on a pipe along x, after the common
 * full-bore lever ball valve (BS EN 331): a brass body, its yellow lever
 * along the pipe when open and across it when shut. A click turns it.
 * `pipeRadius` is the pipe it sits on; its middle is at the origin.
 */
export function createGasBallValve(
  kit: PanelKit,
  {
    pipeRadius = 0.03,
    initial = true,
    name = 'Gas isolating valve',
    binding,
    lever: leverColour = '#e5c43a',
  }: {
    pipeRadius?: number;
    initial?: boolean;
    name?: string;
    binding?: { open(): boolean; set(open: boolean): void };
    /** Its lever's colour: yellow for gas, red for an emergency isolation valve. */
    lever?: string;
  } = {},
): BallValveView {
  const t = plantTools(kit);
  const a = beginPart(kit, name);
  const brass = t.paint(FINISH.brass, 0.35, 0.7);
  t.cyl(a.object, brass, pipeRadius * 1.35, pipeRadius * 2.6, 0, 0, 0, 'x', 6);
  t.cyl(a.object, brass, pipeRadius * 0.9, pipeRadius * 1.6, 0, 0, 0, 'y', 16);
  t.cyl(a.object, brass, 0.008, 0.03, 0, pipeRadius * 1.3, 0, 'y', 10);
  const lever = new Group();
  lever.userData.live = true;
  lever.position.y = pipeRadius * 1.3 + 0.02;
  a.object.add(lever);
  const handle = t.box(
    lever,
    t.paint(leverColour, 0.45),
    0.16,
    0.012,
    0.03,
    0.06,
    0,
    0,
  );
  handle.userData.live = true;
  let open = initial;
  let angle = open ? 0 : -Math.PI / 2;
  a.uses.set(handle, () => {
    if (binding) binding.set(!binding.open());
    else open = !open;
  });
  // A quarter turn, either way it is (the crosshair's cue, prompt 115),
  // its arrow the way the lever is seen to go (#25): about its upright
  // stem, open to shut is clockwise from above and anticlockwise from
  // below, so it is worked out from the eye. Edge-on, as from above, where
  // a standing player usually sees it.
  const pivot = new Vector3();
  const from = new Vector3();
  const to = new Vector3();
  /** The lever's end at `turn` radians about its stem, in world space. */
  const endAt = (turn: number, out: Vector3) =>
    a.object.localToWorld(
      out.set(0.12 * Math.cos(turn), lever.position.y, -0.12 * Math.sin(turn)),
    );
  a.cue(handle, (at) => {
    const isOpen = binding?.open() ?? open;
    a.object.updateWorldMatrix(true, false);
    a.object.localToWorld(pivot.copy(lever.position));
    return {
      gesture: 'turn',
      direction: turnSeen(
        at.camera,
        pivot,
        endAt(isOpen ? 0 : -Math.PI / 2, from),
        endAt(isOpen ? -Math.PI / 2 : 0, to),
        isOpen ? 1 : -1,
      ),
      possible: true,
    };
  });
  a.updates.push((delta) => {
    const target = (binding?.open() ?? open) ? 0 : -Math.PI / 2;
    angle += (target - angle) * Math.min(1, delta * 8);
    lever.rotation.y = angle;
  });
  // A live getter (Object.assign would read it once, as it is built).
  return Object.defineProperty(a.part(), 'open', {
    get: () => binding?.open() ?? open,
  }) as BallValveView;
}
