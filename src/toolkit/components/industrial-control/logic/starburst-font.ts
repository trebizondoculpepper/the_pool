/**
 * The 14-segment ("starburst") character set of a vacuum fluorescent
 * display (mission 143, `doc/research/starburst-vfd.md`): which of a
 * character's fourteen segments, and its decimal point, each character
 * lights, and where each segment lies in its cell. Pure.
 *
 * The segments are named as the common convention names them:
 *
 * ```
 *  ----A----
 * |\   |   /|
 * F H  J  K B
 * |   \|/   |
 *  -G1- -G2-
 * |   /|\   |
 * E N  M  L C
 * |/   |   \|
 *  ----D----  DP
 * ```
 *
 * The glyphs follow the common 14-segment ASCII tables (the decoders of
 * the period's alphanumeric displays: an upper-case set of 64), with M,
 * N, K, V, W, X and Z drawn on their diagonals. Lower case is folded to
 * upper case, as those 64-character decoders did. There is no colon:
 * times are written with a dash (`02-30`, the owner, 2026-11-02).
 */

export const SEGMENTS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G1',
  'G2',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'DP',
] as const;

export type Segment = (typeof SEGMENTS)[number];

const glyphs: Record<string, string> = {
  ' ': '',
  '0': 'A B C D E F K N',
  '1': 'B C K',
  '2': 'A B D E G1 G2',
  '3': 'A B C D G2',
  '4': 'B C F G1 G2',
  '5': 'A D F G1 L',
  '6': 'A C D E F G1 G2',
  '7': 'A B C',
  '8': 'A B C D E F G1 G2',
  '9': 'A B C D F G1 G2',
  A: 'A B C E F G1 G2',
  B: 'A B C D G2 J M',
  C: 'A D E F',
  D: 'A B C D J M',
  E: 'A D E F G1',
  F: 'A E F G1',
  G: 'A C D E F G2',
  H: 'B C E F G1 G2',
  I: 'A D J M',
  J: 'B C D E',
  K: 'E F G1 K L',
  L: 'D E F',
  M: 'B C E F H K',
  N: 'B C E F H L',
  O: 'A B C D E F',
  P: 'A B E F G1 G2',
  Q: 'A B C D E F L',
  R: 'A B E F G1 G2 L',
  S: 'A C D F G1 G2',
  T: 'A J M',
  U: 'B C D E F',
  V: 'E F K N',
  W: 'B C E F L N',
  X: 'H K L N',
  Y: 'H K M',
  Z: 'A D K N',
  '-': 'G1 G2',
  '+': 'G1 G2 J M',
  '/': 'K N',
  '\\': 'H L',
  '*': 'G1 G2 H J K L M N',
  '<': 'K L',
  '>': 'H N',
  _: 'D',
  "'": 'J',
  '"': 'F J',
  '.': 'DP',
  ',': 'N',
  '=': 'D G1 G2',
  '(': 'K L',
  ')': 'H N',
  '[': 'A D E F',
  ']': 'A B C D',
  '%': 'C F G1 G2 J K M N',
  '?': 'A B G2 M DP',
  '!': 'B C DP',
  '#': 'B C D G1 G2 J M',
  $: 'A C D F G1 G2 J M',
  '&': 'A D E G1 H J L N',
  '@': 'A B D E F G2 J',
  '^': 'L N',
  '|': 'J M',
  '`': 'H',
};

const table = new Map<string, ReadonlySet<Segment>>(
  Object.entries(glyphs).map(([c, s]) => [
    c,
    new Set(s.split(' ').filter(Boolean) as Segment[]),
  ]),
);

/** Every character the display can draw (lower case aside, which folds). */
export const STARBURST_CHARACTERS = [...table.keys()].join('');

/** The segments a character lights, or null if it cannot be drawn. */
export function starburst(character: string): ReadonlySet<Segment> | null {
  return table.get(character.toUpperCase()) ?? null;
}

/** Whether every character of `text` can be drawn. */
export function canDraw(text: string): boolean {
  return text.split('').every((c) => starburst(c) !== null);
}

/** The characters of `text` it cannot draw, each once. */
export function undrawable(text: string): string[] {
  return [...new Set(text.split('').filter((c) => starburst(c) === null))];
}

/**
 * Where each segment lies in a character's cell, from (0, 0) at its top
 * left to (1, 1) at its bottom right: a stroke from one end to the other,
 * its ends drawn back by `gap` (of the cell) so that segments meeting at a
 * node stay separate bars, as the anodes on the glass are. The decimal
 * point is a dot, both ends the same, beyond the bottom right.
 */
export function segmentStroke(
  segment: Segment,
  gap = 0.09,
): [number, number, number, number] {
  const g = gap;
  // Diagonals are drawn back a little further, as they meet at a corner.
  const d = gap * 1.25;
  switch (segment) {
    case 'A':
      return [g, 0, 1 - g, 0];
    case 'B':
      return [1, g, 1, 0.5 - g];
    case 'C':
      return [1, 0.5 + g, 1, 1 - g];
    case 'D':
      return [g, 1, 1 - g, 1];
    case 'E':
      return [0, 0.5 + g, 0, 1 - g];
    case 'F':
      return [0, g, 0, 0.5 - g];
    case 'G1':
      return [g, 0.5, 0.5 - g, 0.5];
    case 'G2':
      return [0.5 + g, 0.5, 1 - g, 0.5];
    case 'H':
      return [d, d, 0.5 - d, 0.5 - d];
    case 'J':
      return [0.5, g, 0.5, 0.5 - g];
    case 'K':
      return [1 - d, d, 0.5 + d, 0.5 - d];
    case 'L':
      return [0.5 + d, 0.5 + d, 1 - d, 1 - d];
    case 'M':
      return [0.5, 0.5 + g, 0.5, 1 - g];
    case 'N':
      return [0.5 - d, 0.5 + d, d, 1 - d];
    case 'DP':
      return [1.22, 1, 1.22, 1];
  }
}
