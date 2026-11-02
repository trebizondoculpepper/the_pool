import { EQUIPMENT_KINDS } from '../../../game/plant/equipment-kinds';
import type { Classification } from '../../../game/plant/equipment-kinds';

/**
 * The one classification of a game object's kind (mission 127), shared by
 * the scene's marking (`room-equipment.ts`), the binding check
 * (`world-in-model.ts`), the catalogue (`kind-catalogue.ts`) and the look
 * audit, so none of them can disagree. The kinds' register gives `plant`,
 * `non-plant` and `decorative`; the owner's `architectural` class
 * (2026-11-02) is added here: signs, electrical fittings (light switches,
 * sockets, fused spurs, as distinct from the modelled distribution), fire
 * fittings (extinguishers, call points, the fire alarm's repeaters) and
 * doors. They have a game function beyond decoration but are not part of
 * the simulation yet: named, lookable and listed, never decoration and
 * never flagged unbound. Pure.
 */
export type ObjectClass = Classification | 'architectural';

/** The placed kinds that are architectural components (by the kind's key). */
export const ARCHITECTURAL_KINDS: ReadonlySet<string> = new Set([
  // A room's notice or sign (`building-signs.ts`), and the stores' sign boards.
  'sign',
  'store-signs',
  // Fire fittings: the extinguisher point and the fire alarm's repeater.
  'fire-point',
  'fire-repeater',
]);

/**
 * Kinds the owner has ruled set decoration (2026-10-22): the stores' safety
 * showers, spill kits and PPE cabinets, and the control room's water-test kit.
 */
export const RULED_DECORATIVE: ReadonlySet<string> = new Set([
  'safety-shower',
  'spill-kit',
  'ppe-cabinet',
  'water-test-kit',
]);

/** The kind's key of a layout item key: `balance-tank:3x2x2` is `balance-tank`. */
export const kindOfKey = (key: string) => key.split(':')[0];

/** Whether a placed item, by its key (`sign:no-entry`) or its kind's, is architectural. */
export const architecturalKind = (key: string) =>
  ARCHITECTURAL_KINDS.has(kindOfKey(key));

/**
 * A kind's class, by its key or a placed item's key: architectural first,
 * then the owner's rulings, then the register; `undefined` for a kind the
 * register does not know.
 */
export function objectClass(key: string): ObjectClass | undefined {
  const kind = kindOfKey(key);
  if (ARCHITECTURAL_KINDS.has(kind)) return 'architectural';
  if (RULED_DECORATIVE.has(kind)) return 'decorative';
  return Object.hasOwn(EQUIPMENT_KINDS, kind)
    ? (EQUIPMENT_KINDS as Record<string, { class: Classification }>)[kind].class
    : undefined;
}

/** Whether a placed item, by its key, is set decoration (never an architectural component). */
export const decorativeClass = (key: string) =>
  objectClass(key) === 'decorative';
