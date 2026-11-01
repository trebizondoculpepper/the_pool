import { link } from './schematic-parts';
import type { PlumbEdge } from './plumbing-expansion';
import type { SchematicFitting, SchematicNode } from './schematics';

/** The detector's interlock cable to its room's dosing panel. */
export const CO2_DETECTOR_LINK = 'CO₂ detector interlock to the dosing panel';

/** The injection nozzle's node: drawn as its contact length on the main. */
export const CO2_NOZZLE_NODE = 'co2-injection';

/** The low-pressure CO₂ branch shared by Plant 1 and Plant 2 (mission 118). */
export function co2RoomParts(
  code: 'PL1' | 'PL2',
  pool: string,
  injection: [string, string],
): {
  nodes: SchematicNode[];
  links: PlumbEdge[];
  fittings: SchematicFitting[];
} {
  const inlet = 'CO₂ from the building line';
  const feed = 'CO₂ low-pressure feed';
  const dose = 'CO₂ to the injection nozzle';
  return {
    nodes: [
      {
        id: 'co2-wall-port',
        kind: 'gas-wall-port',
        code: 'WP1',
        name: `${pool} CO₂ wall port`,
      },
      {
        id: 'co2-panel',
        kind: 'co2-dosing-panel',
        code: 'CP4',
        name: `${pool} CO₂ dosing valve controller`,
      },
      {
        id: 'co2-injection',
        kind: 'co2-injection-nozzle',
        code: 'INJ1',
        name: `${pool} CO₂ injection nozzle`,
      },
      {
        id: 'co2-building-line',
        kind: 'gas-main',
        name: 'Low-pressure CO₂ building line',
      },
      // The room's NDIR CO₂ detector, its head 0.3 m off the floor near
      // the panel (CO₂ is heavier than air), its controller above it.
      {
        id: 'co2-detector',
        kind: 'co2-detector',
        code: 'GD2',
        name: `${pool} CO₂ detector`,
      },
    ],
    links: [
      link(inlet, ['co2-building-line', 'out'], ['co2-wall-port', 'in'], 'gas'),
      link(feed, ['co2-wall-port', 'out'], ['co2-panel', 'in'], 'gas'),
      link(dose, ['co2-panel', 'out'], ['co2-injection', 'in'], 'gas'),
      link(
        'CO₂ injection into the circulation',
        ['co2-injection', 'out'],
        injection,
        'chemical',
      ),
      link(
        'CO₂ panel power',
        ['switch-fuse', 'co2'],
        ['co2-panel', 'power'],
        'power',
      ),
      // Its alarms' interlock shuts the room's dosing valve (decision 8).
      link(
        CO2_DETECTOR_LINK,
        ['co2-detector', 'alarm'],
        ['co2-panel', 'interlock'],
        'control',
      ),
    ],
    fittings: [
      {
        id: `${code}.co2-wall-port.out.iso`,
        kind: 'isolating-valve',
        edge: feed,
        end: 'source',
        normally: 'open',
        role: 'CO₂ room isolation',
        operator: 'lever',
        keptBy: 'distribution',
      },
      {
        id: `${code}.co2-panel.out.valve`,
        kind: 'isolating-valve',
        edge: dose,
        end: 'source',
        normally: 'closed',
        role: 'Trio-controlled CO₂ dosing valve',
        operator: 'solenoid',
        keptBy: 'distribution',
      },
      {
        id: `${code}.co2-injection.in.nrv`,
        kind: 'non-return-valve',
        edge: 'CO₂ injection into the circulation',
        end: 'source',
        normally: 'open',
        role: 'injection non-return',
      },
    ],
  };
}

export const LOUNGE_CO2 = co2RoomParts('PL1', 'Lounge pool', [
  'heated-main',
  'co2',
]);
export const OLYMPIC_CO2 = co2RoomParts('PL2', 'Olympic pool', [
  'uv',
  'co2-dose',
]);
