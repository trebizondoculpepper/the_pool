import {
  CO2_PORT_IDS,
  linePressure,
  masterOpen,
  portPressure,
} from './co2-distribution';
import { CO2_FAULT_TEXT } from './co2-dosing';
import { CO2_ROOM_IDS } from './co2-detection';
import type { Co2Plant } from './co2-plant';
import {
  CO2_BANKS,
  bankContents,
  bankFlag,
  rackToSwap,
} from '../../toolkit/components/plant/logic/co2-supply';

/**
 * The console's `co2` (mission 118, a stand-in until the CO₂ system's
 * gameplay is designed): the CO₂ system as it stands, in a few lines: the
 * line's pressure and the master valve, each rack's kilograms and flag,
 * each wall port, each panel's mode and flow, each detector's reading.
 * Pure.
 */

const ROOM_NAMES: Record<string, string> = {
  plant_pool_01: 'PL1 Lounge',
  plant_pool_02: 'PL2 Olympic',
  loading_bay: 'LB loading bay',
};

const FLAG_TEXT = { 'in-use': 'IN USE', standby: 'STANDBY', empty: 'EMPTY' };

export function co2StatusLines(co2: Co2Plant): string[] {
  const d = co2.distribution;
  const s = d.supply;
  const master = d.master.tripped
    ? 'TRIPPED'
    : !d.master.on
      ? 'OFF'
      : masterOpen(d)
        ? 'OPEN'
        : 'SHUT (no power)';
  const swap = rackToSwap(s);
  return [
    `CO₂ line ${linePressure(d).toFixed(2)} bar · master valve ${master} · emergency isolation ${s.isolation ? 'OPEN' : 'SHUT'}`,
    ...CO2_BANKS.map(
      (b) =>
        `  ${b.padEnd(5)} rack ${bankContents(s, b).toFixed(1).padStart(6)} kg  ${FLAG_TEXT[bankFlag(s, b)]}${s.service === b ? ' (in service)' : ''}`,
    ),
    swap
      ? `  the ${swap} rack wants a swap: co2 swap`
      : '  no rack wants a swap',
    ...CO2_PORT_IDS.flatMap((id) => {
      const p = co2.dosers[id];
      return [
        `  ${ROOM_NAMES[id]}: wall port ${d.ports[id].open ? 'OPEN' : 'SHUT'} ${portPressure(d, id).toFixed(2)} bar · panel ${p.powered ? p.mode.toUpperCase() : 'NO POWER'} ${Math.round(p.delivering)} g/h${p.fault ? ` · ${CO2_FAULT_TEXT[p.fault]}` : ''}`,
      ];
    }),
    ...CO2_ROOM_IDS.map((id) => {
      const det = co2.detectors[id];
      return `  ${ROOM_NAMES[id]} detector ${Math.round(det.reading)} ppm${det.a2 ? ' · A2' : det.a1 ? ' · A1' : ''}`;
    }),
  ];
}
