import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import { createBootDisplay } from '../../components/core/views/boot-screens';
import type { BootFamily } from '../../components/core/logic/boot-sequence';
import type { TestFitting } from './test-boards';

/** The board's width, metres. */
export const BOOT_BOARD_WIDTH = 1.7;

/**
 * The boot-sequences board (moved from dev58 to dev0, the owner,
 * 2026-11-01): the game's other boot families (a Unix-like controller, a
 * 1990s PC, a microcontroller), each on its own screen running its boot
 * sequence, with its own RESTART. Built in metres from the floor (its
 * board 1.0 to 2.0 m up), its back at z = 0, facing +z. Each screen draws
 * only when its picture changes (`createBootDisplay`).
 */
export function createBootSequencesBoard(kit: PanelKit): TestFitting {
  const t = tools(kit);
  const parts = createPartSet();
  const board = new Group();
  t.box(
    board,
    t.paint('#2e3438', 0.5),
    BOOT_BOARD_WIDTH,
    1.0,
    0.03,
    0,
    1.5,
    0.015,
  );
  t.label(
    board,
    'BOOT SEQUENCES · THE OTHER FAMILIES',
    0,
    1.93,
    0.032,
    0.035,
    '#ffffff',
  );
  const others: {
    family: BootFamily;
    title: string;
    x: number;
    metres: number;
    px: { w: number; h: number };
    kind: 'crt' | 'lcd';
  }[] = [
    {
      family: 'unix',
      title: 'UNIX-LIKE CONTROLLER · FRUGALBSD',
      x: -0.55,
      metres: 0.46,
      px: { w: 480, h: 300 },
      kind: 'crt',
    },
    {
      family: 'dos',
      title: '1990s PC · HARBOUR DOS',
      x: 0.02,
      metres: 0.46,
      px: { w: 480, h: 300 },
      kind: 'crt',
    },
    {
      family: 'firmware',
      title: 'MICROCONTROLLER · KILOMON',
      x: 0.56,
      metres: 0.2,
      px: { w: 128, h: 64 },
      kind: 'lcd',
    },
  ];
  const screens = others.map((o, i) => {
    const display = createBootDisplay({
      family: o.family,
      px: o.px,
      metres: o.metres,
      kind: o.kind,
      seed: 11 + i,
    });
    display.group.position.set(o.x, 1.55, 0.04);
    board.add(display.group);
    // A bezel behind it.
    const bh = (o.metres * o.px.h) / o.px.w;
    t.box(
      board,
      t.paint('#15181a', 0.6),
      o.metres + 0.04,
      bh + 0.04,
      0.012,
      o.x,
      1.55,
      0.026,
    );
    t.label(board, o.title, o.x, 1.84, 0.032, 0.022, '#ffffff');
    const restart = parts.add(
      pushButton(kit, {
        colour: 'blue',
        name: `Restart the ${o.family} boot`,
        action: () => display.restart(),
      }),
    );
    restart.object.scale.setScalar(0.6);
    restart.object.position.set(o.x, 1.17, 0.03);
    board.add(restart.object);
    t.label(board, 'RESTART', o.x, 1.08, 0.032, 0.022, '#ffffff');
    return display;
  });
  return {
    group: board,
    parts,
    update(_seconds, delta) {
      parts.update(delta);
      for (const s of screens) s.update(delta);
    },
    dispose() {
      parts.dispose();
      for (const s of screens) s.dispose();
    },
  };
}
