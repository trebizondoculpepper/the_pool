import type { BrandId } from '../../toolkit/components/core/logic/brands';
import type {
  Classification,
  DescriptionTemplate,
  KindAffordanceDeclaration,
  StatusPolicy,
} from './equipment-kinds';
import type { KindBinding } from './kind-files';
import type { PrimitiveName } from './traits';
import type { TRAIT_IDS } from './traits/index';

/**
 * Typed configuration for kinds and composite traits (mission 173; the
 * owner, 2026-11-04): each kind is `kinds/<kind>.ts`, `export default
 * defineKind({ … })`, and each composite trait `traits/<trait>.ts`,
 * `export default defineTrait({ … })`. The types catch a misspelt class,
 * status, template, brand or trait name at compile time; what types
 * cannot say (metadata implied by the kind's own traits, facet counts,
 * conflicts, cycles) the runtime validator and `npm run audit -- check`
 * still check. The files are written by `npm run audit`, never by hand.
 * Pure.
 */

/** A trait's name: a primitive, or a composite in the traits' index. */
export type TraitName = PrimitiveName | (typeof TRAIT_IDS)[number];

/** Every metadata key a primitive implies. */
export type MetaKey =
  | 'axis'
  | 'base'
  | 'facing'
  | 'gap'
  | 'look'
  | 'origin'
  | 'rowDepth'
  | 'rowWidth'
  | 'runAxis'
  | 'seatHeight'
  | 'surface'
  | 'surfaceY';

export interface KindConfig {
  group: 'placed' | 'other';
  type: string;
  code: string;
  class: Classification;
  status: StatusPolicy;
  template?: DescriptionTemplate;
  purpose: string;
  brand?: BrandId;
  affordances?: KindAffordanceDeclaration;
  traits?: TraitName[];
  meta?: Partial<Record<MetaKey, number | string>>;
  sources?: string[];
  bindings?: KindBinding[];
}

export interface TraitConfig {
  description: string;
  extends: TraitName[];
  meta?: Partial<Record<MetaKey, number | string>>;
}

/** A kind's configuration, checked by the compiler. */
export const defineKind = (kind: KindConfig): KindConfig => kind;

/** A composite trait's configuration, checked by the compiler. */
export const defineTrait = (trait: TraitConfig): TraitConfig => trait;
