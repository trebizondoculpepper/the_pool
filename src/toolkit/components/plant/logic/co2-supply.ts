/**
 * A CO₂ cylinder supply (mission 109, stage 1; simplified in mission 118):
 * two racks of CO₂ cylinders, after the 34 kg cylinders an industrial gas
 * supplier rents, four to a rack, on a two-rack automatic changeover
 * manifold (after the lever-type changeover manifolds of BOC or Gas Arc),
 * its regulator reducing the cylinders' pressure to the low-pressure
 * line's, and the line's emergency isolation valve at the wall. Pure.
 *
 * The world keeps no cylinder-by-cylinder state (the owner, 2026-10-31,
 * mission 118's decision 5): a left rack and a right rack, each with its
 * grams of CO₂ left, and which rack is in service. The cylinders of a rack
 * share one header and are changed together, so a rack is drawn as one
 * vessel of four cylinders' size. A cylinder of CO₂ holds liquid under its
 * own vapour: while any liquid is left its pressure is the vapour pressure
 * at its temperature (about 57 bar at 20 °C), whatever its contents; only
 * when the last liquid has boiled off does its pressure fall, with the gas
 * left. So a rack's gauge stands steady through most of its life and then
 * drops; below the changeover pressure the rack is spent, its flag goes
 * red, and the manifold changes over to the other rack, which becomes the
 * one in service. A swap (a delivery, `swapRack`) refills whichever rack
 * is spent and not in service.
 */

/** A cylinder's size: the largest single CO₂ cylinder a supplier rents. */
export const CO2_CYLINDER = {
  /** CO₂ when full, kg. */
  contents: 34,
  /** Its water capacity, litres (filled to 0.667 kg/l). */
  litres: 50,
} as const;

/** The manifold's settings. */
export const CO2_MANIFOLD = {
  /** Cylinders on each rack. */
  perBank: 4,
  /** A rack below this, bar gauge, is spent: the manifold changes over. */
  changeover: 10,
  /** The regulator's outlet, bar gauge: the low-pressure line's. */
  outlet: 4,
  /** The regulator needs this much above its outlet to hold it, bar. */
  margin: 1,
} as const;

/** A full rack, g: four full cylinders. */
export const CO2_RACK_GRAMS =
  CO2_CYLINDER.contents * CO2_MANIFOLD.perBank * 1000;

/**
 * CO₂'s vapour pressure, bar absolute, by temperature, °C (NIST): the
 * pressure in a cylinder while it still holds liquid.
 */
const VAPOUR: readonly (readonly [number, number])[] = [
  [-20, 19.7],
  [-10, 26.5],
  [0, 34.9],
  [10, 45.0],
  [20, 57.3],
  [30, 72.1],
];
/** Saturated vapour's density at the same temperatures, kg/m³ (NIST). */
const VAPOUR_DENSITY: readonly (readonly [number, number])[] = [
  [-20, 51.7],
  [-10, 71.1],
  [0, 97.6],
  [10, 135.0],
  [20, 194.2],
  [30, 345.0],
];

const interpolate = (
  table: readonly (readonly [number, number])[],
  x: number,
) => {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
};

/** CO₂'s vapour pressure at `celsius`, bar gauge. */
export const vapourPressure = (celsius: number) =>
  interpolate(VAPOUR, Math.min(30, celsius)) - 1;

/**
 * A cylinder's pressure, bar gauge, holding `kg` of CO₂ at `celsius`: the
 * vapour pressure while liquid is left; below that, with only gas, falling
 * in proportion to the gas left.
 */
export function cylinderPressure(kg: number, celsius: number): number {
  if (kg <= 0) return 0;
  const allGas =
    (interpolate(VAPOUR_DENSITY, Math.min(30, celsius)) * CO2_CYLINDER.litres) /
    1000;
  const saturated = vapourPressure(celsius);
  if (kg >= allGas) return saturated;
  return Math.max(0, ((saturated + 1) * kg) / allGas - 1);
}

export type Co2Bank = 'left' | 'right';
export const CO2_BANKS: readonly Co2Bank[] = ['left', 'right'];

export interface Co2Supply {
  /** Each rack's CO₂ left, g. */
  racks: Record<Co2Bank, number>;
  /** The rack in service (its lever); the other is the reserve. */
  service: Co2Bank;
  /** The emergency isolation valve at the wall, open. */
  isolation: boolean;
  /** The air's temperature in the cage, °C. */
  ambient: number;
}

/** A new supply: both racks full, the left in service, the line open. */
export const newCo2Supply = (ambient = 12): Co2Supply => ({
  racks: { left: CO2_RACK_GRAMS, right: CO2_RACK_GRAMS },
  service: 'left',
  isolation: true,
  ambient,
});

/** CO₂ left in a rack, kg. */
export const bankContents = (s: Co2Supply, bank: Co2Bank) =>
  s.racks[bank] / 1000;

/** CO₂ left in each of a rack's cylinders, kg: a quarter of the rack's. */
export const cylinderContents = (s: Co2Supply, bank: Co2Bank) =>
  bankContents(s, bank) / CO2_MANIFOLD.perBank;

/** A rack's pressure, bar gauge, on its gauge: its cylinders share one header. */
export const bankPressure = (s: Co2Supply, bank: Co2Bank) =>
  cylinderPressure(cylinderContents(s, bank), s.ambient);

export const otherBank = (bank: Co2Bank): Co2Bank =>
  bank === 'left' ? 'right' : 'left';

/** Whether a rack is spent: below the changeover pressure. */
export const rackSpent = (s: Co2Supply, bank: Co2Bank) =>
  bankPressure(s, bank) < CO2_MANIFOLD.changeover;

/**
 * The rack the manifold draws from now: the rack in service until it falls
 * below the changeover pressure, then the reserve; with both spent,
 * whichever still has anything; none when both are empty.
 */
export function bankInUse(s: Co2Supply): Co2Bank | null {
  if (!rackSpent(s, s.service)) return s.service;
  const reserve = otherBank(s.service);
  if (!rackSpent(s, reserve)) return reserve;
  // Both under the changeover: whichever can still push gas out.
  if (bankPressure(s, s.service) > 0) return s.service;
  if (bankPressure(s, reserve) > 0) return reserve;
  return null;
}

/** What a rack's indicator flag shows. */
export type Co2Flag = 'in-use' | 'standby' | 'empty';

/**
 * Each rack's flag, as the manifold's indicator shows it: green IN USE on
 * the rack it draws from, red EMPTY on a spent rack, STANDBY on a full reserve.
 */
export function bankFlag(s: Co2Supply, bank: Co2Bank): Co2Flag {
  if (rackSpent(s, bank)) return 'empty';
  return bankInUse(s) === bank ? 'in-use' : 'standby';
}

/** The regulator's inlet and outlet, and the line beyond the isolation valve, bar gauge. */
export function co2Pressures(s: Co2Supply) {
  const using = bankInUse(s);
  const inlet = using ? bankPressure(s, using) : 0;
  const outlet = Math.max(
    0,
    Math.min(CO2_MANIFOLD.outlet, inlet - CO2_MANIFOLD.margin),
  );
  return { inlet, outlet, line: s.isolation ? outlet : 0 };
}

/** The lever thrown to the other rack: it becomes the rack in service. */
export const throwLever = (s: Co2Supply): Co2Supply => ({
  ...s,
  service: otherBank(s.service),
});

/** The emergency isolation valve opened or shut. */
export const setIsolation = (s: Co2Supply, open: boolean): Co2Supply => ({
  ...s,
  isolation: open,
});

/**
 * The automatic changeover: with the rack in service spent and the other
 * not, the other becomes the rack in service (its flag green, the spent
 * one's red, awaiting a swap).
 */
export function changeOver(s: Co2Supply): Co2Supply {
  if (!rackSpent(s, s.service)) return s;
  const reserve = otherBank(s.service);
  return rackSpent(s, reserve) ? s : { ...s, service: reserve };
}

/**
 * `kg` of CO₂ drawn through the line: from the rack in use, a little at a
 * time, so that once it falls below the changeover the manifold changes
 * over and the rest comes from the other. Nothing flows with the
 * isolation valve shut, nor once both racks are empty.
 */
export function drawCo2(s: Co2Supply, kg: number): Co2Supply {
  if (!s.isolation || kg <= 0) return changeOver(s);
  let out = changeOver(s);
  let left = kg * 1000;
  while (left > 1e-6) {
    const bank = bankInUse(out);
    if (!bank) break;
    const take = Math.min(left, out.racks[bank], 500);
    if (take <= 1e-6) break;
    out = changeOver({
      ...out,
      racks: { ...out.racks, [bank]: out.racks[bank] - take },
    });
    left -= take;
  }
  return out;
}

/**
 * The rack a swap would refill: the one spent and not in service, or null
 * with nothing to swap (neither spent, or only the rack in service, which
 * a swap must not touch while it feeds the line).
 */
export function rackToSwap(s: Co2Supply): Co2Bank | null {
  const reserve = otherBank(s.service);
  return rackSpent(s, reserve) ? reserve : null;
}

/** Why a swap would be refused now, or null if it would go ahead. */
export function swapRefusal(s: Co2Supply): string | null {
  if (rackToSwap(s)) return null;
  if (rackSpent(s, s.service))
    return `the ${s.service} rack is spent but still in service: throw the changeover lever first`;
  return 'neither rack is spent';
}

/**
 * A swap (a delivery): the spent rack not in service exchanged for four
 * full cylinders. Refused (the supply unchanged) with nothing to swap.
 */
export function swapRack(s: Co2Supply): Co2Supply {
  const bank = rackToSwap(s);
  if (!bank) return s;
  return changeOver({
    ...s,
    racks: { ...s.racks, [bank]: CO2_RACK_GRAMS },
  });
}

/**
 * The manifold's alarms, on its volt-free contacts (CO₂ dosing, the owner,
 * 2026-10-31): BANK EMPTY, CHANGE CYLINDERS while either rack is spent (its
 * flag red: the manifold has changed over, or the reserve was never
 * changed), and SUPPLY EXHAUSTED when neither rack can feed the regulator.
 */
export function co2SupplyAlarms(s: Co2Supply) {
  const empty = CO2_BANKS.filter((b) => bankFlag(s, b) === 'empty');
  return {
    bankEmpty: empty.length > 0,
    exhausted: empty.length === CO2_BANKS.length,
  };
}

/**
 * A saved supply of the old shape (world version 66: each rack's
 * cylinders, `{ kg, open }`), as racks of grams: each rack's open
 * cylinders' CO₂ (world version 67).
 */
export function supplyFromCylinders(old: {
  banks?: Partial<Record<Co2Bank, readonly { kg: number; open: boolean }[]>>;
  service?: Co2Bank;
  isolation?: boolean;
  ambient?: number;
}): Co2Supply {
  const grams = (bank: Co2Bank) =>
    (old.banks?.[bank] ?? []).reduce(
      (sum, c) => sum + (c.open ? Math.max(0, c.kg) : 0),
      0,
    ) * 1000;
  const fresh = newCo2Supply(old.ambient);
  return changeOver({
    racks: old.banks
      ? { left: grams('left'), right: grams('right') }
      : fresh.racks,
    service: old.service ?? 'left',
    isolation: old.isolation ?? true,
    ambient: old.ambient ?? fresh.ambient,
  });
}
