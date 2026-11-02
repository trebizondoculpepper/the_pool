import { isDevRoom } from './kind-catalogue';
import type { CatalogueCopy } from './kind-catalogue';
import { slugOf } from './look-ref';

/**
 * The item audit's pure parts (mission 130, `doc/plans/130-item-audit.md`):
 * its links, its placements grouped by room, the rooms not counted from
 * data, a room scan's matches, the magic panel's preset selection, and the
 * deprecated kinds. No DOM, no Three.js.
 */

/** The item audit page of a kind (a bench page, development only). */
export const itemAuditLink = (kind: string) =>
  `bench.html?bench=item-audit&kind=${encodeURIComponent(kind)}`;
/** Its magic room: a room of its own, generated for it. */
export const magicRoomLink = (kind: string) =>
  `bench.html?bench=magic-room&kind=${encodeURIComponent(kind)}`;
/** Its magic page: what it does, in words, for a kind with no 3D form. */
export const magicPageLink = (kind: string) =>
  `bench.html?bench=magic-page&kind=${encodeURIComponent(kind)}`;

/** A deprecated kind: why, and what replaces it. */
export interface Deprecation {
  kind: string;
  reason: string;
  replacement: string;
}

/**
 * The kinds marked deprecated, the owner's to name (empty until then):
 * each still placed outside a dev room is a thing to replace.
 */
export const DEPRECATED_KINDS: readonly Deprecation[] = [];

export const deprecationOf = (
  kind: string,
  list: readonly Deprecation[] = DEPRECATED_KINDS,
) => list.find((d) => d.kind === kind);

/** One room's copies of a kind. */
export interface RoomPlacements {
  room: string;
  dev: boolean;
  copies: CatalogueCopy[];
}

export interface Placements {
  rooms: RoomPlacements[];
  count: number;
  /** As 126 counts it: copies outside dev rooms. */
  outsideDev: number;
  inDev: number;
}

/** A kind's copies grouped by room: the building's rooms first, then the dev rooms, each by name; copies by ref. */
export function groupPlacements(copies: readonly CatalogueCopy[]): Placements {
  const byRoom = new Map<string, CatalogueCopy[]>();
  for (const c of copies)
    byRoom.set(c.room, [...(byRoom.get(c.room) ?? []), c]);
  const rooms = [...byRoom]
    .map(([room, list]) => ({
      room,
      dev: isDevRoom(room),
      copies: [...list].sort((a, b) =>
        a.ref.localeCompare(b.ref, 'en', { numeric: true }),
      ),
    }))
    .sort(
      (a, b) =>
        Number(a.dev) - Number(b.dev) ||
        a.room.localeCompare(b.room, 'en', { numeric: true }),
    );
  const outsideDev = copies.filter((c) => !isDevRoom(c.room)).length;
  return {
    rooms,
    count: copies.length,
    outsideDev,
    inDev: copies.length - outsideDev,
  };
}

/** The rooms whose contents the catalogue does not count from data. */
export const uncountedRooms = (
  all: readonly string[],
  counted: Iterable<string>,
) => {
  const seen = new Set(counted);
  return all.filter((r) => !seen.has(r));
};

/** What 127's scan records of a thing, as far as matching needs. */
export interface ScannedThing {
  ref: string;
  tag?: string;
  name?: string;
  kind?: string;
  assetId?: string;
}

/**
 * The things of a built room's scan that are copies of a kind: marked
 * with the kind, or named as it (its word, or its model's title).
 */
export function scanMatches(
  things: readonly ScannedThing[],
  kind: string,
  names: readonly string[],
): ScannedThing[] {
  const slugs = new Set(names.filter(Boolean).map(slugOf));
  return things.filter(
    (t) =>
      t.kind === kind ||
      (!!t.name && slugs.has(slugOf(t.name))) ||
      slugs.has(slugOf(t.ref)),
  );
}

/** The most positions a selector has (`parts.ts`'s `selector`). */
export const MAX_POSITIONS = 4;

/**
 * The curated looks a panel's selector offers: the first `MAX_POSITIONS`,
 * never every combination (the owner, 2026-11-02). A selector needs two
 * positions; one look alone gets no knob.
 */
export const panelChoices = <T>(list: readonly T[]): readonly T[] =>
  list.length < 2 ? [] : list.slice(0, MAX_POSITIONS);

/** The choice at a selector's position, clamped to those offered. */
export const choiceAt = <T>(list: readonly T[], position: number) =>
  list.length
    ? list[Math.max(0, Math.min(list.length - 1, Math.round(position)))]
    : undefined;

/** A selector's engraved legend: the choices' labels, as `selector` names its positions. */
export const selectorLegend = (labels: readonly string[]) => labels.join(' · ');
