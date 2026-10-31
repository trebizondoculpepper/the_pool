import { dose } from '../water/pool-chemistry';
import type { Additions } from '../water/pool-chemistry';
import { POOL_CELL_SHARES } from '../water/circuit';
import {
  POOL_IDS,
  poolArea,
  poolMakeUpRate,
  poolTankCapacity,
  poolVolume,
} from './pools';
import type { PoolId, PoolWaterState } from './pools';
import { STRENGTH } from './water-treatment';
import type { CircuitWater, DoseCharge } from './water-treatment';

/**
 * A chemical tipped into a pool's water by hand (the owner, 2026-10-31):
 * the stand-in, until the hand-dosing and inventory game is designed, for
 * someone carrying a drum or a bag to the balance tank (or the pool) and
 * pouring it in. It goes through the real chemistry (`pool-chemistry.ts`
 * `dose`) at the volume of the water it lands in, the balance tank's
 * water by default or the pool's return side (its first cell), and the
 * circulation mixes it in from there. Pure.
 *
 * Units, as Dr Aqualis's Show dose gives them (`aqualis-advisor.ts`): kg
 * for the solids, litres for the hypochlorite (14 %) and the acid (10 %),
 * at the plant's strengths (`water-treatment.ts` `STRENGTH`); and grams for
 * CO₂, as its channel and panels dose it (g/h). Each is dosed in its
 * normal unit; g and kg, or ml and l, are accepted where they suit.
 */

export type HandChemical =
  | 'bicarbonate'
  | 'sodaAsh'
  | 'calciumChloride'
  | 'thiosulphate'
  | 'bisulphate'
  | 'hypochlorite'
  | 'acid'
  | 'co2';

/** Where a hand dose goes: the pool's balance tank, or the pool itself (its return side). */
export type DoseInto = 'balance-tank' | 'pool';
export const DOSE_INTO: readonly DoseInto[] = ['balance-tank', 'pool'];

export type DoseUnit = 'kg' | 'g' | 'l' | 'ml';

/** Grams (by weight) or millilitres (by volume) in each unit. */
const UNITS: Record<DoseUnit, { measure: 'weight' | 'volume'; per: number }> = {
  kg: { measure: 'weight', per: 1000 },
  g: { measure: 'weight', per: 1 },
  l: { measure: 'volume', per: 1000 },
  ml: { measure: 'volume', per: 1 },
};

/** Words each unit may be typed as. */
const UNIT_WORDS: Record<string, DoseUnit> = {
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  g: 'g',
  gram: 'g',
  grams: 'g',
  l: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  ml: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
};

export interface HandChemicalInfo {
  id: HandChemical;
  /** What it is called, in the log and the list. */
  name: string;
  /** The words `dose` knows it by, its id's lower case first. */
  aliases: readonly string[];
  /** Its normal unit: what the action's amount is in. */
  unit: DoseUnit;
  /** Its unit as the list shows it: `l of 14 %`. */
  unitText: string;
  /** What it does, in a few words. */
  does: string;
  /** Where it normally goes. */
  into: DoseInto;
  /** A word on how it is normally dosed, where that is not by hand. */
  note?: string;
  /** What `amount` of it, in its unit, adds to the water. */
  additions(amount: number): Additions;
}

const solid = (key: keyof Additions) => (kg: number) => ({ [key]: kg * 1000 });

export const HAND_CHEMICALS: readonly HandChemicalInfo[] = [
  {
    id: 'bicarbonate',
    name: 'sodium bicarbonate',
    aliases: ['bicarbonate', 'bicarb', 'nahco3', 'sodium-bicarbonate'],
    unit: 'kg',
    unitText: 'kg',
    does: 'raises alkalinity',
    into: 'balance-tank',
    additions: solid('bicarbonate'),
  },
  {
    id: 'sodaAsh',
    name: 'soda ash',
    aliases: ['sodaash', 'soda-ash', 'soda_ash', 'na2co3'],
    unit: 'kg',
    unitText: 'kg',
    does: 'raises pH and alkalinity',
    into: 'balance-tank',
    additions: solid('sodaAsh'),
  },
  {
    id: 'calciumChloride',
    name: 'calcium chloride',
    aliases: ['calciumchloride', 'cacl2', 'calcium', 'calcium-chloride'],
    unit: 'kg',
    unitText: 'kg',
    does: 'raises calcium hardness',
    into: 'balance-tank',
    additions: solid('calciumChloride'),
  },
  {
    id: 'thiosulphate',
    name: 'sodium thiosulphate',
    aliases: ['thiosulphate', 'thio', 'thiosulfate', 'dechlor'],
    unit: 'kg',
    unitText: 'kg',
    does: 'takes out chlorine',
    into: 'balance-tank',
    additions: solid('thiosulphate'),
  },
  {
    id: 'bisulphate',
    name: 'sodium bisulphate',
    aliases: ['bisulphate', 'bisulfate', 'nahso4', 'dry-acid'],
    unit: 'kg',
    unitText: 'kg',
    does: 'lowers pH and alkalinity',
    into: 'balance-tank',
    additions: solid('bisulphate'),
  },
  {
    id: 'hypochlorite',
    name: 'sodium hypochlorite (14 %)',
    aliases: ['hypochlorite', 'hypo', 'naocl', 'chlorine'],
    unit: 'l',
    unitText: 'l of 14 %',
    does: 'raises free chlorine',
    into: 'balance-tank',
    additions: (l) => {
      const g = l * STRENGTH.hypochlorite;
      return { hypochlorite: g, chlorate: g * STRENGTH.chlorate };
    },
  },
  {
    id: 'acid',
    name: 'hydrochloric acid (10 %)',
    aliases: ['acid', 'hcl', 'hydrochloric'],
    unit: 'l',
    unitText: 'l of 10 %',
    does: 'lowers pH and alkalinity',
    into: 'balance-tank',
    additions: (l) => ({ hcl: l * STRENGTH.acid }),
  },
  {
    id: 'co2',
    name: 'CO₂',
    aliases: ['co2', 'carbon-dioxide'],
    unit: 'g',
    unitText: 'g',
    does: 'lowers pH, alkalinity unchanged',
    into: 'pool',
    note: 'normally dosed by the CO₂ system; by hand, gassed in at the injection point',
    additions: (g) => ({ co2: g }),
  },
];

export const HAND_CHEMICAL_IDS: readonly HandChemical[] = HAND_CHEMICALS.map(
  (c) => c.id,
);

const BY_ID = new Map(HAND_CHEMICALS.map((c) => [c.id, c]));
const BY_WORD = new Map<string, HandChemicalInfo>();
for (const c of HAND_CHEMICALS) {
  BY_WORD.set(c.id.toLowerCase(), c);
  for (const a of c.aliases) BY_WORD.set(a, c);
}

export const handChemical = (id: HandChemical) => BY_ID.get(id);

/** The chemical a word names, by its id or an alias, case aside; undefined if none. */
export const chemicalNamed = (word: string) => BY_WORD.get(word.toLowerCase());

/** Every pool's everyday name. */
export const POOL_TITLES: Record<PoolId, string> = {
  pool_01: 'Lounge pool',
  pool_02: 'Olympic pool',
  pool_03: 'Jacuzzi',
  pool_04: 'Footbath',
};

export const isPoolId = (word: string): word is PoolId =>
  (POOL_IDS as readonly string[]).includes(word);

/**
 * An amount as typed (`18kg`, `500 ml`, `2.5`), in the chemical's normal
 * unit; no unit means its normal unit. A failure says what went wrong.
 */
export function parseAmount(
  chemical: HandChemicalInfo,
  text: string,
): { amount: number } | { error: string } {
  const m = /^(\d+(?:\.\d*)?|\.\d+)\s*([a-zµ]*)$/i.exec(text.trim());
  if (!m)
    return { error: `"${text}" is not an amount (say 18kg, 500ml, 2.5l)` };
  const value = Number(m[1]);
  const word = m[2].toLowerCase();
  const unit = word ? UNIT_WORDS[word] : chemical.unit;
  if (!unit) return { error: `no unit "${m[2]}" (say kg, g, l or ml)` };
  const want = UNITS[chemical.unit];
  const got = UNITS[unit];
  if (got.measure !== want.measure)
    return {
      error: `${chemical.name} is measured by ${want.measure}: say ${want.measure === 'weight' ? 'kg or g' : 'l or ml'}`,
    };
  if (!(value > 0)) return { error: 'the amount must be more than nothing' };
  return { amount: (value * got.per) / want.per };
}

/** An amount in a chemical's unit as the log says it: `18 kg`, `500 g`, `250 ml`. */
export function amountText(chemical: HandChemicalInfo, amount: number) {
  const small = amount < 1 && (chemical.unit === 'kg' || chemical.unit === 'l');
  const v = small ? amount * 1000 : amount;
  const unit = small ? (chemical.unit === 'kg' ? 'g' : 'ml') : chemical.unit;
  return `${Number(v.toPrecision(3))} ${unit}`;
}

/** The water a hand dose lands in, m³: the balance tank's, or the pool's return side (its first cell). */
export function doseVolume(
  id: PoolId,
  pool: Pick<PoolWaterState, 'level' | 'balance'>,
  into: DoseInto,
) {
  if (into === 'balance-tank')
    return Math.max(0, pool.balance * poolTankCapacity(id));
  return (
    Math.max(0, poolVolume(id) + pool.level * poolArea(id)) *
    POOL_CELL_SHARES[0]
  );
}

/** Less water than this is too little to dose into: the dose is not taken. */
export const DOSE_MIN_VOLUME = 0.01;

/**
 * A pool's circuit with `amount` (in the chemical's unit) of a chemical
 * tipped in where `into` says, mixed at once through that zone's volume;
 * unchanged for an unknown chemical, no amount, or too little water there.
 */
export function handDose(
  c: CircuitWater,
  id: PoolId,
  pool: Pick<PoolWaterState, 'level' | 'balance' | 'temperature'>,
  chemical: HandChemical,
  amount: number,
  into: DoseInto,
): CircuitWater {
  const info = BY_ID.get(chemical);
  if (!info || !(amount > 0) || !Number.isFinite(amount)) return c;
  const v = doseVolume(id, pool, into);
  if (!(v >= DOSE_MIN_VOLUME)) return c;
  const added = info.additions(amount);
  if (into === 'balance-tank')
    return { ...c, tank: dose(c.tank, added, v, pool.temperature) };
  const cells = [...c.pool];
  cells[0] = dose(cells[0], added, v, pool.temperature);
  return { ...c, pool: cells };
}

// ---- Going in gradually ------------------------------------------------------------

/**
 * How fast a hand dose goes in (`doc/plans/aqualis-advice-verification.md`,
 * Part 1; the owner, 2026-10-31). Normal practice: a solid is dissolved
 * and added a bucket at a time, about half an hour for a 25 kg sack,
 * so 50 kg an hour, and never less than 5 minutes for a small one; a
 * solution is poured in steadily, a 25 l drum in about 12 minutes (120 l
 * an hour), at least 2 minutes; CO₂ gassed in at the injection point at
 * 3 kg an hour; and a dilution's fresh water comes in at the make-up's
 * most (`poolMakeUpRate`: the Lounge's 9 m³/h, the Olympic's 30) as the
 * same volume goes to drain. A dose into the pool is spread over its
 * surface, all its cells by their shares, at the same rates.
 */
export const DISSOLVE = {
  solidKgPerHour: 50,
  solidLeast: 5 * 60,
  solutionLPerHour: 120,
  solutionLeast: 2 * 60,
  co2GPerHour: 3000,
  co2Least: 2 * 60,
} as const;

/** Seconds `amount` (in its unit) of a chemical takes to go in by hand. */
export function dissolveSeconds(chemical: HandChemical, amount: number) {
  const info = BY_ID.get(chemical);
  if (!info) return 0;
  const D = DISSOLVE;
  if (chemical === 'co2')
    return Math.max(D.co2Least, (amount / D.co2GPerHour) * 3600);
  if (info.unit === 'l')
    return Math.max(D.solutionLeast, (amount / D.solutionLPerHour) * 3600);
  return Math.max(D.solidLeast, (amount / D.solidKgPerHour) * 3600);
}

/** A hand dose as a charge going in gradually; null for an unknown chemical or no amount. */
export function handCharge(
  chemical: HandChemical,
  amount: number,
  into: DoseInto,
): DoseCharge | null {
  const info = BY_ID.get(chemical);
  if (!info || !(amount > 0) || !Number.isFinite(amount)) return null;
  return {
    additions: info.additions(amount),
    fresh: 0,
    into,
    seconds: dissolveSeconds(chemical, amount),
    left: 1,
  };
}

/**
 * A dilution as a charge (the console's `dilute`, a stand-in for a
 * partial drain-down and refill): `m3` of the circuit's water to drain
 * as the same of the mains' comes in at the pool's make-up rate.
 */
export function dilutionCharge(id: PoolId, m3: number): DoseCharge | null {
  if (!(m3 > 0) || !Number.isFinite(m3)) return null;
  return {
    additions: {},
    fresh: m3,
    into: 'pool',
    seconds: (m3 / Math.max(0.1, poolMakeUpRate(id))) * 3600,
    left: 1,
  };
}
