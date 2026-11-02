import type { PanelKit } from '../../components/core/views/eighties-controls';
import { jogDial } from '../../components/core/parts/jog-dial';
import { createCharacterLcd } from '../../components/industrial-control/views/ot216-terminal';
import { createBoard } from './test-boards';
import type { TestFitting } from './test-boards';

/**
 * The turn-and-push knob on trial (mission 122): the Hamwarmy CM6
 * cascade manager's one knob, twice life size, tried on dev0 before the
 * unit is assembled in dev39. Turning steps a value from 0 to 20 (red at
 * its ends, where it will not turn further); a push on its cap counts,
 * and toggles whether the value is being edited, as the CM6's menus do.
 */
export function createJogDialBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'TURN-AND-PUSH KNOB',
    width: 0.3,
    height: 0.24,
    scale: 2,
    captionScale: 1.1,
  });
  let value = 10;
  let pushes = 0;
  let editing = false;
  const lcd = createCharacterLcd(kit, { w: 0.116, h: 0.03 });
  board.at(lcd.mesh, -0.055, 0.04).position.z = 0.002;
  board.place(
    jogDial(kit, {
      name: 'trial turn-and-push knob',
      onTurn: (direction) => {
        if (editing) value = Math.max(0, Math.min(20, value + direction));
      },
      onPush: () => {
        pushes++;
        editing = !editing;
      },
      canTurn: (direction) =>
        editing && value + direction >= 0 && value + direction <= 20,
    }),
    0.085,
    0.03,
  );
  board.caption('ROTARY ENCODER, 24 DETENTS, PUSH SWITCH', 0, -0.04, 0.007);
  board.caption(
    'TURN: LEFT HALF DOWN, RIGHT HALF UP (LB, RB)  ·  PUSH: THE CAP (A)',
    0,
    -0.055,
    0.0055,
  );
  board.caption('PUSH TO EDIT, TURN, PUSH TO SAVE', 0, -0.07, 0.0055);
  return {
    group: board.group,
    parts: board.set,
    update(_seconds, delta) {
      board.set.update(delta);
      lcd.show(
        [
          `VALUE ${String(value).padStart(2)}${editing ? ' <EDIT>' : '       '}`.padEnd(
            16,
          ),
          `PUSHES ${String(pushes % 10000).padStart(4)}`.padEnd(16),
        ],
        null,
        1,
      );
    },
    dispose: () => board.set.dispose(),
  };
}
