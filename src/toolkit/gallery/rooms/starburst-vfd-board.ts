import type { PanelKit } from '../../components/core/views/eighties-controls';
import { pushButton } from '../../components/core/parts/parts';
import { markComponent } from '../../components/core/views/component-identity';
import { createStarburstVfd } from '../../components/industrial-control/views/starburst-vfd';
import { createBoard } from './test-boards';
import type { TestFitting } from './test-boards';

/**
 * The 14-segment VFD on trial (mission 143), twice life size, before the
 * Wash-O-Tron's console has it: its test pattern, page by page, then text
 * that changes (a running clock and a step timer, times with a dash).
 * POWER switches it off and on (every segment lit for a moment at
 * power-on), DIM steps its brightness, PAGE moves on a page.
 */

const fit = (s: string) => s.padEnd(20).slice(0, 20);
const mmss = (t: number) =>
  `${String(Math.floor(t / 60) % 100).padStart(2, '0')}-${String(Math.floor(t) % 60).padStart(2, '0')}`;

const PAGES: ((t: number) => [string, string])[] = [
  () => ['ABCDEFGHIJKLMNOPQRST', 'UVWXYZ 0123456789   '],
  () => [fit("-+/\\*<>_'.,=()%?! "), fit('MWKXVNZ 8.8. 02-30')],
  (t) => [
    fit(`AUTO F${1 + (Math.floor(t / 20) % 5)} BACKWASH`),
    fit(`${mmss(t % 180)}/03-00`),
  ],
  (t) => [
    fit(`TIME ${mmss(t)}`),
    fit(['LOW FLOW', 'PIT 72%', 'VALVES NOT PROVED'][Math.floor(t / 3) % 3]),
  ],
];

export function createStarburstVfdBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: '14-SEGMENT VFD',
    width: 0.2,
    height: 0.13,
    scale: 2,
    captionScale: 1.1,
  });
  const vfd = createStarburstVfd(kit);
  board.at(vfd.group, 0, 0.015);
  markComponent(vfd.group, { name: '14-segment VFD display' });
  let page = 0;
  let power = true;
  let level = 1;
  let time = 0;
  const buttons: [string, number, () => void][] = [
    ['POWER', -0.055, () => (power = !power)],
    [
      'DIM',
      0,
      () => vfd.setBrightness((level = level > 0.3 ? level - 0.25 : 1)),
    ],
    ['PAGE', 0.055, () => (page = (page + 1) % PAGES.length)],
  ];
  for (const [legend, x, action] of buttons)
    board.place(
      pushButton(kit, {
        colour: 'white',
        legend,
        name: `14-segment VFD ${legend}`,
        action,
      }),
      x,
      -0.022,
      0.45,
    );
  board.caption(
    '2 × 20 STARBURST VFD, 5 MM CHARACTERS: TEST PATTERN, THEN LIVE TEXT',
    0,
    -0.05,
    0.004,
  );
  // Named, so a look link reaches it: `look=14-segment-vfd`.
  markComponent(board.group, { name: '14-segment VFD' });
  return {
    group: board.group,
    parts: board.set,
    update(_seconds, delta) {
      time += delta;
      vfd.show(PAGES[page](time), power);
      vfd.update(delta);
      board.set.update(delta);
    },
    dispose: () => board.set.dispose(),
  };
}
