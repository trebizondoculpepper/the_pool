/**
 * The Mozzetti Forni Ravello D (the owner, 2026-11-02: a kitchen dev
 * room's first thing), after the Moretti Forni serieP Amalfi D: an
 * electric twin-deck pizza oven stood on its heated prover, on four
 * locking castors. Its figures, in metres, from Moretti's datasheet for
 * the Amalfi D, two baking chambers 18 cm high on the prover 800 mm high
 * (`doc/research/pizza-oven.md`), and what each deck's electronic panel
 * shows. Pure: no DOM or Three.js.
 */

/** The datasheet's figures, metres. */
export const RAVELLO = {
  /** External width. */
  width: 1.52,
  /** The body's depth, its front face to its back. */
  depth: 1.365,
  /** The hood's overhang in front of the body, over the doors' handles. */
  hoodOverhang: 0.2,
  /** The vapour duct's depth behind the body. */
  ductDepth: 0.105,
  /** The castors, floor to the prover's underside (each Ø100 mm wheel). */
  castor: 0.14,
  /** The prover, floor to its top, castors included. */
  prover: 0.8,
  /** The oven's base under the lower deck. */
  base: 0.1,
  /** Each deck's module, its door, panel and front. */
  deck: 0.4,
  /** The hood on top. */
  hood: 0.15,
  /** The steam exhaust's collar on the hood (Ø150 mm). */
  collar: 0.1,
  /** Each baking chamber inside: width, depth, height. */
  chamber: { w: 1.15, d: 1.115, h: 0.18 },
  /** The doors' handles, floor to their pivots, lower deck then upper. */
  handles: [1.002, 1.402],
  /** The left stile (vapour knob) and the right control column. */
  stile: 0.122,
  column: 0.198,
  /** Hottest the chambers and the prover go, °C. */
  maxChamber: 450,
  maxProver: 65,
} as const;

/** Floor to the hood's top (the datasheet's 1850 mm). */
export const ovenHeight = () =>
  RAVELLO.prover + RAVELLO.base + 2 * RAVELLO.deck + RAVELLO.hood;

/** Floor to the underside of deck `n` (0 the lower). */
export const deckFloor = (n: 0 | 1) =>
  RAVELLO.prover + RAVELLO.base + n * RAVELLO.deck;

/** What one deck's panel is set to and reads: its main switch, its chamber and its settings. */
export interface DeckFace {
  /** The main switch (ON/OFF): its rocker and the panel below it lit. */
  on: boolean;
  /** Heating started (START/STOP), its red LED lit. */
  heating: boolean;
  /** The chamber's temperature, °C, from its thermocouple. */
  chamber: number;
  /** The set point, °C. */
  setPoint: number;
  /** The ceiling's and the floor's power, 0 (off) to 9. */
  ceiling: number;
  floor: number;
  /** The halogen lamps (LIGHT). */
  light: boolean;
}

/** A deck as a reference photograph shows it: on, heating, at a pizza's 330 °C. */
export const SAMPLE_DECK: DeckFace = {
  on: true,
  heating: true,
  chamber: 322,
  setPoint: 330,
  ceiling: 7,
  floor: 5,
  light: true,
};

/** A deck switched off and cold. */
export const COLD_DECK: DeckFace = {
  on: false,
  heating: false,
  chamber: 20,
  setPoint: 330,
  ceiling: 7,
  floor: 5,
  light: false,
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** What the panel's four LED displays show; blank while it is switched off. */
export function deckReadouts(face: DeckFace) {
  if (!face.on) return { chamber: '', setPoint: '', ceiling: '', floor: '' };
  const temp = (v: number) =>
    String(Math.round(clamp(v, 0, RAVELLO.maxChamber + 49)));
  const power = (v: number) => String(Math.round(clamp(v, 0, 9)));
  return {
    chamber: temp(face.chamber),
    setPoint: temp(Math.min(face.setPoint, RAVELLO.maxChamber)),
    // A point lit in the corner while that side's elements draw power.
    ceiling:
      power(face.ceiling) + (face.heating && face.ceiling > 0 ? '.' : ''),
    floor: power(face.floor) + (face.heating && face.floor > 0 ? '.' : ''),
  };
}

/** The prover's thermostat, its pointer's turn (radians, 0 at OFF) for a setting in °C. */
export function proverDialTurn(setting: number) {
  return (
    (clamp(setting, 0, RAVELLO.maxProver) / RAVELLO.maxProver) * 1.5 * Math.PI
  );
}
