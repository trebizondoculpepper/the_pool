import { co2DistributionAlarms, portPressure } from './co2-distribution';
import type { Co2PortId } from './co2-distribution';
import { CO2_PANEL } from './co2-dosing';
import type { Co2Plant } from './co2-plant';
import { co2SupplyAlarms } from '../../toolkit/components/plant/logic/co2-supply';

/**
 * The CO₂ system's windows for the Lounge's and the Olympic's annunciators
 * (mission 118; the brief's decision 9: alarms to the plant rooms' boards
 * and the old control room's twins, and so to the bridge's lists), and
 * the two lamps of the water-treatment mimics' CO₂ section (decision 10).
 * Each board shows the whole building's supply (one line feeds both
 * rooms), its own room's detector and its own room's panel. Pure.
 */

export type Co2WindowId =
  | 'co2-bank-empty'
  | 'co2-exhausted'
  | 'co2-line-low'
  | 'co2-master-trip'
  | 'co2-gas-a1'
  | 'co2-gas-a2'
  | 'co2-panel-fault';

/** In the boards' order. */
export const CO2_WINDOWS: readonly Co2WindowId[] = [
  'co2-bank-empty',
  'co2-exhausted',
  'co2-line-low',
  'co2-master-trip',
  'co2-gas-a1',
  'co2-gas-a2',
  'co2-panel-fault',
];

/** Each window's engraving, two short lines, as the boards' others. */
export const CO2_WINDOW_TEXT: Record<Co2WindowId, string> = {
  'co2-bank-empty': 'CO₂ BANK EMPTY\nCHANGE CYLS',
  'co2-exhausted': 'CO₂ SUPPLY\nEXHAUSTED',
  'co2-line-low': 'CO₂ LINE\nPRESSURE LOW',
  'co2-master-trip': 'CO₂ MASTER\nVALVE TRIPPED',
  'co2-gas-a1': 'CO₂ GAS\nLOW ALARM',
  'co2-gas-a2': 'CO₂ GAS\nHIGH ALARM',
  'co2-panel-fault': 'CO₂ DOSING\nPANEL FAULT',
};

/**
 * The windows lit for `room`'s board: the manifold's volt-free contacts
 * (BANK EMPTY, CHANGE CYLINDERS while a rack's flag is red; SUPPLY
 * EXHAUSTED with both spent), the line's (LINE PRESSURE LOW, MASTER VALVE
 * TRIPPED), its room's detector's A1 and A2 (latched until reset), and its
 * panel's error relay (any fault it names; one switched off is no fault).
 */
export function co2Windows(co2: Co2Plant, room: Co2PortId): Co2WindowId[] {
  const line = co2DistributionAlarms(co2.distribution);
  const detector = co2.detectors[room];
  const panel = co2.dosers[room];
  const lit: Record<Co2WindowId, boolean> = {
    'co2-bank-empty': line.bankEmpty,
    'co2-exhausted': line.exhausted,
    'co2-line-low': line.lineLow,
    'co2-master-trip': line.masterTripped,
    'co2-gas-a1': detector.a1,
    'co2-gas-a2': detector.a2,
    'co2-panel-fault': panel.powered && panel.fault !== null,
  };
  return CO2_WINDOWS.filter((w) => lit[w]);
}

/**
 * The water-treatment mimics' CO₂ section's two warning lamps (decision
 * 10): CO₂ PRESSURE LOW from the line's LINE PRESSURE LOW or its room's
 * wall port's own NO SUPPLY PRESSURE (its panel's inlet switch, which
 * sees a shut wall port too), and CHANGE CYLINDERS from the manifold's
 * flags.
 */
export function co2MimicLamps(co2: Co2Plant, room: Co2PortId) {
  const line = co2DistributionAlarms(co2.distribution);
  return {
    pressureLow:
      line.lineLow ||
      portPressure(co2.distribution, room) < CO2_PANEL.lowInlet ||
      co2.dosers[room].fault === 'no-supply-pressure',
    changeCylinders: co2SupplyAlarms(co2.distribution.supply).bankEmpty,
  };
}
