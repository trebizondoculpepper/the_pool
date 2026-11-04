import { EQUIPMENT_KINDS } from '../../../game/plant/equipment-kinds';
import { mediaByKind } from '../../../game/plant/trait-index';
import type {
  TraitContext,
  TraitSource,
} from '../../../game/plant/trait-index';
import { compositeTraits } from '../../../game/plant/traits';
import { groupPlacements } from './item-audit';
import type { KindEntry } from './kind-catalogue';
import { simGraph } from './sim-graph/index';

/**
 * The trait audit page's pure parts (mission 174): its link, the trait
 * context built from the registry, the composites and the simulation
 * graph's ports (the same as `npm run audit` builds), the objects in the
 * world that have a trait, joined from the catalogue's placements, and the
 * command that would correct a kind's trait. Pure.
 */

/** The trait audit page: one trait, or the index of every trait. */
export const traitAuditLink = (trait?: string) =>
  trait
    ? `bench.html?bench=trait-audit&trait=${encodeURIComponent(trait)}`
    : 'bench.html?bench=trait-audit';

let cached: TraitContext | undefined;

/** The registry's trait context, built once (the registry is fixed while the game runs). */
export function traitContext(): TraitContext {
  cached ??= {
    kinds: EQUIPMENT_KINDS,
    composites: compositeTraits(),
    media: mediaByKind(simGraph()),
  };
  return cached;
}

/** How a kind has a trait, in words. */
export function sourceWords(s: TraitSource): string {
  switch (s.by) {
    case 'named':
      return 'named in its file';
    case 'composite':
      return `via ${s.via.join(' › ')}`;
    case 'implied':
      return `implied by ${s.from}`;
    case 'ports':
      return `from its ports (${s.media.join(', ')})`;
  }
}

/**
 * The command that would remove a trait from a kind, or why there is none:
 * the page is read-only and the registry changes only by the command.
 */
export function fixCommand(
  kind: string,
  trait: string,
  s: TraitSource,
): string {
  switch (s.by) {
    case 'named':
      return `npm run -s audit -- set ${kind} traits-=${trait}`;
    case 'composite':
      return `npm run -s audit -- set ${kind} traits-=${s.via[0]}  (removes ${s.via[0]} and everything it brings)`;
    case 'implied':
      return `implied by ${s.from}: remove that instead`;
    case 'ports':
      return `derived from its ports (${s.media.join(', ')}): change the model, not the trait`;
  }
}

/** The command that would add a trait to a kind. */
export const addCommand = (kind: string, trait: string) =>
  `npm run -s audit -- set ${kind} traits+=${trait}`;

export interface TraitObjects {
  rooms: ReturnType<typeof groupPlacements>['rooms'];
  objects: number;
  roomCount: number;
  outsideDev: number;
}

/** Every placed object of the given kinds, grouped by room as the item audit groups them. */
export function traitObjects(
  kinds: readonly string[],
  catalogue: readonly KindEntry[],
): TraitObjects {
  const wanted = new Set(kinds);
  const copies = catalogue
    .filter((k) => wanted.has(k.key))
    .flatMap((k) => k.copies);
  const placed = groupPlacements(copies);
  return {
    rooms: placed.rooms,
    objects: copies.length,
    roomCount: placed.rooms.length,
    outsideDev: placed.rooms
      .filter((r) => !r.dev)
      .reduce((n, r) => n + r.copies.length, 0),
  };
}
