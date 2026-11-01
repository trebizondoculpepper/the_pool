import { CO2_FAULT_TEXT, co2ValveDrive } from '../../../game/plant/co2-dosing';
import type { Co2Doser, Co2Fault } from '../../../game/plant/co2-dosing';

/**
 * The Olympic's CO₂ mass flow controller's display (the owner,
 * 2026-11-01; `doc/plans/co2-system.md`, "The mass flow controller"): a
 * backlit 2 × 16 character LCD, as Alicat's MC and Bronkhorst's display
 * versions carry. Line 1 always shows the measured flow in g/h and a
 * status word of four letters: AUTO, HAND, or OFF with the panel switched
 * off; while its valve is overridden, OPEN (forced open: Alicat's EXH) or
 * SHUT (held shut: Alicat's HLD), so a forced valve is plain at a glance.
 * Line 2 shows the page its MODE key has stepped to. Pure.
 */

export type MfcPage =
  | 'setpoint'
  | 'drive'
  | 'inlet'
  | 'total'
  | 'alarm'
  | 'control';

/** The pages, in the order MODE steps through them. */
export const MFC_PAGES: readonly MfcPage[] = [
  'setpoint',
  'drive',
  'inlet',
  'total',
  'alarm',
  'control',
];

/** The page after `page`, as MODE steps. */
export const nextMfcPage = (page: MfcPage): MfcPage =>
  MFC_PAGES[(MFC_PAGES.indexOf(page) + 1) % MFC_PAGES.length];

export const MFC_COLUMNS = 16;

/** Each fault in at most twelve characters, after `ALM `. */
export const MFC_FAULT_TEXT: Record<Co2Fault, string> = {
  'gas-alarm': 'CO2 GAS',
  'no-supply-pressure': 'NO SUPPLY',
  'no-water-flow': 'NO WATER FLW',
  'signal-lost': 'SIGNAL LOST',
  'flow-not-proved': 'FLOW NOT PRV',
  'valve-stuck': 'VALVE STUCK',
};

/** A line padded or cut to the display's sixteen columns. */
const line = (s: string) =>
  s.length > MFC_COLUMNS ? s.slice(0, MFC_COLUMNS) : s.padEnd(MFC_COLUMNS, ' ');

/** Its flow, as its display gives it: a tenth of a g/h under 1,000. */
const flowText = (gh: number) => {
  const v = Math.max(0, gh);
  return v < 999.95 ? v.toFixed(1) : String(Math.round(v));
};

/** Line 1's status flag. */
export function mfcFlag(d: Co2Doser): string {
  if (d.mode === 'off') return ' OFF';
  if (d.override === 'open') return 'OPEN';
  if (d.override === 'close') return 'SHUT';
  return d.mode === 'manual' ? 'HAND' : 'AUTO';
}

/**
 * Its display's two lines for a controller as it stands, its inlet's
 * pressure and the page shown; blank while it has no power (its backlight
 * out).
 */
export function mfcLines(
  d: Co2Doser,
  inletBar: number,
  page: MfcPage,
): [string, string] {
  if (!d.powered) return [line(''), line('')];
  const l1 = line(`${flowText(d.delivering).padStart(7)} g/h ${mfcFlag(d)}`);
  let l2: string;
  switch (page) {
    case 'setpoint': {
      const sp =
        d.mode === 'manual'
          ? String(Math.round(d.manualRate))
          : d.mode === 'off'
            ? '0'
            : d.override === 'normal'
              ? String(Math.round(d.asked))
              : '----';
      l2 = `SP ${d.mode === 'manual' ? 'HAND' : 'AUTO'}${sp.padStart(5)} g/h`;
      break;
    }
    case 'drive':
      l2 = `VALVE DRIVE ${String(Math.round(co2ValveDrive(d, inletBar))).padStart(3)}%`;
      break;
    case 'inlet':
      l2 = `INLET ${Math.max(0, inletBar).toFixed(2).padStart(5)} bar`;
      break;
    case 'total':
      l2 = `TOTAL ${(d.totalG / 1000).toFixed(3).padStart(7)} kg`;
      break;
    case 'alarm':
      l2 = `ALM ${d.fault ? MFC_FAULT_TEXT[d.fault] : 'NONE'}`;
      break;
    case 'control':
      l2 = `${d.mode === 'off' ? 'OFF ' : d.hand ? 'HAND' : 'AUTO'} OVR ${d.override.toUpperCase()}`;
      break;
  }
  return [l1, line(l2)];
}

/** The LCD's text as one key: it redraws only when this changes. */
export const mfcKey = (lines: readonly [string, string]) =>
  `${lines[0]}\n${lines[1]}`;

/** Its fault's words in full, for its information overlay. */
export const mfcFaultWords = (d: Co2Doser) =>
  d.fault ? CO2_FAULT_TEXT[d.fault] : 'no alarm';
