import type { BrandId } from '../../toolkit/components/core/logic/brands';
import { kindFiles } from './kind-files';
import { compositeTraits, expand, resolveMeta } from './traits';
import type { CompositeTrait } from './traits';
import type { KindFile } from './kind-files';
import { KIND_IDS, OTHER_KIND_IDS, PLACED_KIND_IDS } from './kinds/index';

/**
 * The equipment kinds (prompt 060): every kind the inventory names, with
 * its tag code, its classification, its word in a description ("1st Pump
 * in PL2"), how its live status is put, and an engineering note of what
 * such a thing is for. One finite list, shared by the catalogue and the
 * descriptions (`component-descriptions.ts`), so no kind can be added
 * without its wording. Pure.
 */

export type Classification = 'plant' | 'non-plant' | 'decorative';

/**
 * How a kind's live status is put, given what the world says of the item
 * (`component-status.ts`): a motor On, Off or Tripped; a tank so full; a
 * pump set its pumps; a packaged cabinet what it is doing; a booster set
 * running or not; a switch On or Off; or none, when the world keeps no
 * reliable state for the item and the description stops at its location.
 */
export type StatusPolicy =
  | 'none'
  | 'motor'
  | 'level'
  | 'pump-set'
  | 'cabinet'
  | 'booster'
  | 'switch'
  /** A gas detector: its reading. */
  | 'gas'
  /** A UV unit: its lamp lit or not. */
  | 'uv'
  /** A sand filter: what it is doing, and how its bed seems (`filter-condition.ts`). */
  | 'filter';

/**
 * How a kind is described: an isolating valve by what it isolates, an
 * isolator by the power it isolates, anything else by its place, its type,
 * its room and its status.
 */
export type DescriptionTemplate = 'valve' | 'power' | 'equipment';

/** What aiming at a registered kind can offer, independently of plant status. */
export type InteractionClass = 'decorative' | 'inspect-only' | 'usable';

/** The default solid shape is the built object's bounds, in its own frame. */
export type KindSolidShape =
  | { readonly type: 'bounds' }
  | {
      readonly type: 'box';
      readonly width: number;
      readonly height: number;
      readonly depth: number;
      readonly centre?: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      };
    };

/** A seat faces its local +z unless the kind says otherwise. Metres. */
export interface KindSeat {
  readonly height: number;
  readonly lookDirection?: { readonly x: number; readonly z: number };
}

/** Proposed kind-level behaviour. Current room wiring does not read these yet. */
export interface KindAffordances {
  readonly interaction: InteractionClass;
  readonly portable: boolean;
  readonly solid: boolean;
  readonly shape: KindSolidShape;
  /** A solid object's reachable top can support placement and walking. */
  readonly surface: boolean;
  readonly seat: KindSeat | null;
}

/** A kind declares only departures from the defaults; surface follows solidity. */
export type KindAffordanceDeclaration = Partial<
  Omit<KindAffordances, 'surface' | 'seat'>
> & { readonly seat?: KindSeat | null };

export interface EquipmentKind {
  /** The letters of its tag after the room's code (PL2-P1), for placed items. */
  code: string;
  class: Classification;
  /** Its word in a description, capitalised: "Pump", "Balance tank". */
  type: string;
  status: StatusPolicy;
  template?: DescriptionTemplate;
  /** What such a thing is for, as engineering documentation; not shown as an item's description. */
  purpose: string;
  /** Maker printed on the installed unit, when its model specifies one. */
  brand?: BrandId;
  /** Mission 158: reviewed affordances, resolved by `kindAffordances`. */
  affordances?: KindAffordanceDeclaration;
  /** Mission 172: its traits, primitive or composite; when present they decide its affordances. */
  traits?: readonly string[];
  /** Mission 172: metadata its traits imply, where it differs from their defaults. */
  meta?: Readonly<Record<string, number | string>>;
}

/**
 * The registry is data (missions 168 and 171; the owner, 2026-11-04):
 * each kind is one JSON file in `kinds/`, listed by `kinds/index.ts`, and
 * changed only by `npm run audit -- register | set | unset | unregister |
 * bind`, never by hand. Here it is compiled into the registry the game
 * reads, with each kind's ids kept as compile-time unions by the index.
 */
const asKind = (f: KindFile): EquipmentKind => {
  const { group: _group, sources: _s, bindings: _b, ...k } = f;
  return k as EquipmentKind;
};

const FILES = kindFiles();
const pick = <Id extends string>(ids: readonly Id[]) =>
  Object.fromEntries(ids.map((id) => [id, asKind(FILES[id])])) as Record<
    Id,
    EquipmentKind
  >;

/** The kinds placed by the rooms' layouts (`roomEquipment`), including excluded scenery. */
export const PLACED_KINDS = pick(PLACED_KIND_IDS);

/** The kinds of things registered outside the layouts: valves, fixtures, feeders, model parts. */
export const OTHER_KINDS = pick(OTHER_KIND_IDS);

export const EQUIPMENT_KINDS: Record<KindId, EquipmentKind> = {
  ...PLACED_KINDS,
  ...OTHER_KINDS,
};
export type PlacedKindId = (typeof PLACED_KIND_IDS)[number];
export type KindId = (typeof KIND_IDS)[number];

export const isKindId = (kind: string): kind is KindId =>
  Object.hasOwn(EQUIPMENT_KINDS, kind);

/** A kind by its id; unknown ids fail loudly. */
export function equipmentKind(kind: string): EquipmentKind {
  if (!isKindId(kind)) throw new Error(`Unknown equipment kind ${kind}`);
  return EQUIPMENT_KINDS[kind];
}

/**
 * A kind's affordances. Mission 172: a kind with traits is resolved from
 * them (interaction from its use traits, portable from holdable, solidity
 * and shape from its form, surface from supportable, its seat from
 * sittable's metadata); a kind not yet classified keeps 158's declared
 * flags and defaults (the migration gate).
 */
export function resolveKindAffordances(kind: EquipmentKind): KindAffordances {
  if (kind.traits?.length)
    return affordancesFromTraits(kind.traits, kind.meta ?? {});
  const declared = kind.affordances;
  const solid = declared?.solid ?? true;
  return {
    interaction:
      declared?.interaction ??
      (kind.class === 'decorative' ? 'decorative' : 'inspect-only'),
    portable: declared?.portable ?? false,
    solid,
    shape: declared?.shape ?? { type: 'bounds' },
    surface: solid,
    seat: declared?.seat ?? null,
  };
}

const LOOK: Record<string, { x: number; z: number }> = {
  '+x': { x: 1, z: 0 },
  '-x': { x: -1, z: 0 },
  '+z': { x: 0, z: 1 },
  '-z': { x: 0, z: -1 },
};

/** The affordances a set of traits gives, through the composites (pure). */
export function affordancesFromTraits(
  traits: readonly string[],
  own: Readonly<Record<string, number | string>>,
  composites: Readonly<Record<string, CompositeTrait>> = compositeTraits(),
): KindAffordances {
  const ps = expand(traits, composites).primitives;
  const has = (p: string) => (ps as readonly string[]).includes(p);
  const meta = resolveMeta(traits, own, composites).values;
  const solid = !has('decorative') && !has('run-like');
  return {
    interaction: has('decorative')
      ? 'decorative'
      : has('operable') || has('sittable')
        ? 'usable'
        : 'inspect-only',
    portable: has('holdable'),
    solid,
    shape: { type: 'bounds' },
    surface: solid && has('supportable'),
    seat: has('sittable')
      ? {
          height: Number(meta.seatHeight ?? 0.45),
          lookDirection: LOOK[String(meta.look ?? '+z')] ?? LOOK['+z'],
        }
      : null,
  };
}

/** The proposed affordances of a registered kind. */
export const kindAffordances = (kind: KindId): KindAffordances =>
  resolveKindAffordances(equipmentKind(kind));
