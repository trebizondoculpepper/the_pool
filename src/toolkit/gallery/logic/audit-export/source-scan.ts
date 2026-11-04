/**
 * Source evidence for the audit (mission 168): what a kind's builder code
 * shows it doing, read from the source text alone, with no scene. Each
 * hit is a line that wires behaviour (a click's use, a seat, a pick-up, a
 * named part) with the nearest name the code gives it, so an agent can
 * tell what a kind does without reading the file. Heuristic: it only adds
 * evidence, and its silence proves nothing. Pure.
 */

export type HitKind = 'use' | 'seat' | 'pick-up' | 'part';

export interface SourceHit {
  kind: HitKind;
  /** `path:line`. */
  at: string;
  /** The nearest name: a quoted name on or above the line, else the code itself. */
  what: string;
}

const PATTERNS: readonly [HitKind, RegExp][] = [
  ['use', /\buses\.set\(|\bmarkUsable\(|\bparts\.uses\b|\buseOnHit\b/],
  ['seat', /\bdeclareSeat\(|\bcreateOfficeChair\(|\bseatOf\(/],
  [
    'pick-up',
    /\bportable\b|\bmarkPortable\(|\bobject-handling\b|\bmarkHoldable\(/,
  ],
  ['part', /\bbeginPart\(|\bmarkComponent\(/],
];

const NAME =
  /(?:name\s*[:=]\s*|beginPart\([^,]+,\s*|\/\/\s*)['"`]?([A-Z][^'"`\n]{2,60})['"`]?/;

/** The hits in one file's text. */
export function scanSource(path: string, text: string): SourceHit[] {
  const lines = text.split('\n');
  const hits: SourceHit[] = [];
  let lastLine = -10;
  lines.forEach((line, i) => {
    const code = line.trim();
    if (
      code.startsWith('*') ||
      code.startsWith('/*') ||
      code.startsWith('import ')
    )
      return;
    for (const [kind, re] of PATTERNS) {
      if (!re.test(line)) continue;
      // Neighbouring lines wiring the same thing are one hit, at its first line.
      if (hits.at(-1)?.kind === kind && i - lastLine <= 4) {
        lastLine = i;
        break;
      }
      lastLine = i;
      let what = '';
      for (let j = i; j >= Math.max(0, i - 3) && !what; j -= 1)
        what = NAME.exec(lines[j])?.[1]?.trim() ?? '';
      hits.push({
        kind,
        at: `${path}:${i + 1}`,
        what: what || code.slice(0, 80),
      });
      break;
    }
  });
  return hits;
}

/** A kind's words for finding its files by name: `storage-cupboard` → storage, cupboard. */
const wordsOf = (kind: string) =>
  kind.split('-').filter((w) => w.length > 2 && !/^\d+$/.test(w));

/**
 * The source files likely to hold a kind's builder: those whose file name
 * carries every word of the kind (`engineer-storage-cupboard.ts` for
 * `storage-cupboard`), not tests, plus any its file names (`sources`).
 */
export function sourcesFor(
  kind: string,
  paths: readonly string[],
  named: readonly string[] = [],
): string[] {
  const words = wordsOf(kind);
  const byName = words.length
    ? paths.filter((p) => {
        const base = p.replace(/^.*\//, '').replace(/\.ts$/, '');
        return (
          !base.endsWith('.test') &&
          !base.endsWith('.slow.test') &&
          words.every((w) => base.split(/[-.]/).includes(w))
        );
      })
    : [];
  return [...new Set([...byName, ...named])].sort();
}

/** The hits' counts by kind, for a summary line. */
export const hitCounts = (hits: readonly SourceHit[]) =>
  Object.fromEntries(
    (['use', 'seat', 'pick-up', 'part'] as const).map((k) => [
      k,
      hits.filter((h) => h.kind === k).length,
    ]),
  ) as Record<HitKind, number>;
