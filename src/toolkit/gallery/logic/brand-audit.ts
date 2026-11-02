import type { Brand, BrandId } from '../../components/core/logic/brands';
import type { CatalogueCopy, KindClass, KindEntry } from './kind-catalogue';

/**
 * The brand audit's pure parts (mission 136, `doc/plans/136-brand-audit.md`):
 * each brand's models in the game grouped by what they are, a brand with
 * nothing placed, and the unbranded kinds split into gaps and the kinds the
 * owner accepts as generic. From 126's `kindCatalogue` alone: no DOM, no
 * Three.js, no scene.
 */

/** A brand's audit page (a bench page, development only). */
export const brandAuditLink = (brand: BrandId) =>
  `bench.html?bench=brand-audit&brand=${encodeURIComponent(brand)}`;
/** The unbranded goods page. */
export const UNBRANDED_LINK = 'bench.html?bench=unbranded';

/** The order the groups are shown in, and each group's heading. */
export const CLASS_ORDER: readonly KindClass[] = [
  'plant',
  'non-plant',
  'architectural',
  'decorative',
  'unclassified',
];
export const CLASS_WORDS: Record<KindClass, string> = {
  plant: 'Plant',
  'non-plant': 'Equipment outside the plant model',
  architectural: 'Architectural components',
  decorative: 'Decoration',
  unclassified: 'Not in the register (dev exhibits)',
};

/** One kind that carries the brand, with the copies that carry it. */
export interface BrandModel {
  kind: KindEntry;
  /** Its copies carrying this brand: all of them when the kind's maker is the brand. */
  copies: CatalogueCopy[];
  rooms: string[];
  /** Whether every copy of the kind is this brand's (else it is shared with other makers). */
  whole: boolean;
}

export interface ClassGroup<T> {
  class: KindClass;
  items: T[];
}

/** Items grouped by their kind's class, in `CLASS_ORDER`, each group by its word. */
export function groupByClass<T>(
  items: readonly T[],
  kindOf: (item: T) => KindEntry,
): ClassGroup<T>[] {
  return CLASS_ORDER.map((cls) => ({
    class: cls,
    items: items
      .filter((i) => kindOf(i).class === cls)
      .sort((a, b) => kindOf(a).word.localeCompare(kindOf(b).word)),
  })).filter((g) => g.items.length > 0);
}

const roomsOf = (copies: readonly CatalogueCopy[]) => [
  ...new Set(copies.map((c) => c.room)),
];

/** Every kind carrying the brand: its maker is the brand, or some of its copies name it. */
export function brandModels(
  brand: BrandId,
  kinds: readonly KindEntry[],
): BrandModel[] {
  const out: BrandModel[] = [];
  for (const kind of kinds) {
    const whole = kind.maker === brand;
    const copies = whole
      ? kind.copies
      : kind.copies.filter((c) => c.maker === brand);
    if (!whole && !copies.length) continue;
    out.push({ kind, copies, rooms: roomsOf(copies), whole });
  }
  return out;
}

export interface BrandAudit {
  brand: Brand;
  groups: ClassGroup<BrandModel>[];
  /** Kinds carrying it. */
  kinds: number;
  /** Copies placed, in any counted room. */
  copies: number;
  /** A brand in the lore with nothing placed yet: no kind, or no copy of one. */
  nothingPlaced: boolean;
}

export function brandAudit(
  brand: Brand,
  kinds: readonly KindEntry[],
): BrandAudit {
  const models = brandModels(brand.id, kinds);
  const copies = models.reduce((n, m) => n + m.copies.length, 0);
  return {
    brand,
    groups: groupByClass(models, (m) => m.kind),
    kinds: models.length,
    copies,
    nothingPlaced: copies === 0,
  };
}

/** A kind the owner accepts as unbranded, and why. */
export interface GenericKind {
  kind: string;
  reason: string;
}

/**
 * The kinds the owner accepts as unbranded (generic goods), each with the
 * reason: the owner's to extend. Every other kind with no maker is a gap.
 */
export const CONFIRMED_GENERIC: readonly GenericKind[] = [];

/** A kind with no maker at all: neither the kind's nor any copy's. */
export const isUnbranded = (kind: KindEntry) =>
  !kind.maker && kind.copies.every((c) => !c.maker);

export interface UnbrandedEntry {
  kind: KindEntry;
  /** Its reason, where the owner has confirmed it generic. */
  generic?: string;
}

export interface Unbranded {
  /** Kinds that should have a maker: findings. */
  gaps: ClassGroup<UnbrandedEntry>[];
  /** Kinds the owner accepts as unbranded. */
  generic: ClassGroup<UnbrandedEntry>[];
  /** Confirmed-generic kinds that now have a maker, or are no longer in the catalogue: stale entries. */
  stale: GenericKind[];
}

/**
 * Every kind not associated with any brand, decoration aside (exempt, as
 * 126 has it), split into gaps and the confirmed generic.
 */
export function unbranded(
  kinds: readonly KindEntry[],
  generic: readonly GenericKind[] = CONFIRMED_GENERIC,
): Unbranded {
  const reasons = new Map(generic.map((g) => [g.kind, g.reason]));
  const entries: UnbrandedEntry[] = kinds
    .filter((k) => !k.exempt && isUnbranded(k))
    .map((kind) => {
      const reason = reasons.get(kind.key);
      return reason === undefined ? { kind } : { kind, generic: reason };
    });
  const listed = new Set(entries.map((e) => e.kind.key));
  return {
    gaps: groupByClass(
      entries.filter((e) => e.generic === undefined),
      (e) => e.kind,
    ),
    generic: groupByClass(
      entries.filter((e) => e.generic !== undefined),
      (e) => e.kind,
    ),
    stale: generic.filter((g) => !listed.has(g.kind)),
  };
}

/** Each brand's kinds and copies, for the catalogue's Brands list. */
export function brandCounts(
  brands: readonly Brand[],
  kinds: readonly KindEntry[],
): { brand: Brand; kinds: number; copies: number }[] {
  return brands.map((brand) => {
    const a = brandAudit(brand, kinds);
    return { brand, kinds: a.kinds, copies: a.copies };
  });
}
