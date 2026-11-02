/**
 * What gets a page (mission 138, plan section 2a; the owner, 2026-11-02):
 * each graph kind's tier, declared once per kind, never per object.
 * Active nodes hold or change state and get node pages; connectors (pipes,
 * cables, conduits, plain busbars and headers, passive fittings) only carry
 * a signal from one active node to the next, collapse into the edge
 * between them and get no page; groups are declared by their kind. A kind
 * not listed is `unknown`: shown as such, given a page, never guessed.
 * Separate from `object-class.ts`, which classifies catalogue kinds. Pure.
 */

export type GraphTier =
  | 'active'
  | 'connector'
  | 'group-one'
  | 'group-many'
  | 'unknown';

export type GraphSort =
  | 'node'
  | 'fitting'
  | 'link'
  | 'part'
  | 'alarm'
  | 'state';

/** Passive schematic node kinds: pipes, mains, headers, conduits, buses. */
const CONNECTOR_KINDS: ReadonlySet<string> = new Set([
  'busbar',
  'distribution-conduit',
  'control-bus',
  'backwash-main',
  'header',
  'gas-main',
  'chemical-main',
  'chemical-branch',
  'fill-line',
  'ring-main',
  'low-loss-header',
  'flue-stack',
  'water-main',
]);

/**
 * Where a room's network meets something outside it: its boundary nodes,
 * and the cables and supplies that come in from another room. Connectors
 * too, but a run may end at one (a boundary, not a dead end).
 */
export const BOUNDARY_KINDS: ReadonlySet<string> = new Set([
  'boundary',
  'generator-cable',
  'room-supply',
  'pool-plant-rooms',
  'sewer',
  'atmosphere',
  'remote-signal',
  'plant-signals',
]);

/** Simulated as one, drawn as many (a ganged cylinder bank). */
const GROUP_ONE_KINDS: ReadonlySet<string> = new Set(['co2-supply']);

/** A group of individually simulated members (the boiler cascades, a pump pair). */
const GROUP_MANY_KINDS: ReadonlySet<string> = new Set([
  'boiler-cascade',
  'pump-pair',
  'lthw-pumps',
  'pumps',
]);

/** Active schematic node kinds: machines, tanks, pools, sensors, controllers, boards, supplies. */
const ACTIVE_KINDS: ReadonlySet<string> = new Set([
  'jacuzzi-pack',
  'sand-filter',
  'balance-tank',
  'spa',
  'heating-main',
  'water-service',
  'gully',
  'deck-gully',
  'switch-fuse',
  'valve-panel',
  'mimic-board',
  'fibre-illuminator',
  'control-plate',
  'music-rack',
  'speaker-pair',
  'water-quality-display',
  'instrument-rack',
  'fibre-wall',
  'plant-room-lights',
  'hall-lights',
  'chem-day',
  'spa-pack',
  'footbath',
  'pool',
  'heat-exchanger',
  'pool-temperature-controller',
  'regulating-valve',
  'temperature-sensor',
  'music-source',
  'contact-tank',
  'ozone-generator',
  'uv-unit',
  'hypo-pumps',
  'acid-pump',
  'dosing-controller',
  'sample-point',
  'gas-wall-port',
  'co2-dosing-panel',
  'co2-injection-nozzle',
  'co2-detector',
  'pump-panel',
  'annunciator',
  'ozone-monitor',
  'injection-quill',
  'break-tank',
  'booster-set',
  'water-meter',
  'make-up-flowmeter',
  'backwash-tank',
  'mimic-wet',
  'mimic-wet-dirty',
  'sewer-monitor',
  'make-up-recorder',
  'chem-control-box',
  'chem-terminal',
  'chem-selector',
  'branch-flowmeter',
  'boiler',
  'calorifier',
  'pressurisation',
  'gas-train',
  'dosing-pot',
  'gas-safety',
  'mimic-gas',
  'mimic-boiler-heat',
  'combustion-panel',
  'cascade-manager',
  'gas-supply',
  'building-heating',
  'building-hot-water',
  'incoming-supply',
  'main-switch',
  'lv-switchboard',
  'central-battery',
  'lighting-board',
  'changeover-switch',
  'earthing-terminal',
  'room-feeders',
  'lighting-zones',
  'chem-bulk',
  'store-extract',
  'chem-pump',
  'fill-cabinet',
  'generator-point',
  'chemical-store',
  'co2-master-panel',
  'ahu-stack',
  'mimic-air',
  'hall-air',
  'operator-desk',
  'alarm-printer',
  'mimic-pool',
  'mimic-heating',
  'mimic-wet-fresh',
  'mimic-lounge-filter',
  'mimic-jacuzzi',
  'mimic-energy',
  'readout-board',
  'fire-repeater',
  'weather-station',
  'cctv',
  'scenario-simulator',
  'twin-socket',
  'pir-switch',
  'lighting-zone',
  'filter',
  'contact',
  'uv',
  'panel',
  'generator',
  'exchanger',
  'main-plant',
  'supply',
  'level-transmitter',
  'balance-tank-panel',
]);

/**
 * Fittings: every kind the plumber sets holds or changes state (a valve
 * open or shut, a non-return valve's check, an isolator, a meter's
 * reading); passive fittings (bends, tees, reducers) are not in the model
 * yet, and would be `connector`.
 */
const ACTIVE_FITTINGS: ReadonlySet<string> = new Set([
  'isolating-valve',
  'regulating-valve',
  'non-return-valve',
  'power-isolator',
  'flowmeter',
]);

/** A graph kind's tier: by sort, then by the schematic's or fitting's kind. */
export function graphTier(sort: GraphSort, kind: string): GraphTier {
  switch (sort) {
    case 'link':
      return 'connector';
    case 'part':
    case 'alarm':
    case 'state':
      return 'active';
    case 'fitting':
      return ACTIVE_FITTINGS.has(kind) ? 'active' : 'unknown';
    case 'node':
      if (CONNECTOR_KINDS.has(kind) || BOUNDARY_KINDS.has(kind))
        return 'connector';
      if (GROUP_ONE_KINDS.has(kind)) return 'group-one';
      if (GROUP_MANY_KINDS.has(kind)) return 'group-many';
      return ACTIVE_KINDS.has(kind) ? 'active' : 'unknown';
  }
}

/** Whether a tier gets a node page: everything but a connector. */
export const hasPage = (tier: GraphTier) => tier !== 'connector';
