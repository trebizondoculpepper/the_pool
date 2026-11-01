import type { RoomSchematic, SchematicNode } from './schematics';
import { POOL_IDS } from './pools';
import type { PoolId } from './pools';
import { link } from './schematic-parts';

/** The cross-room water branches in the main corridor, between plant-room
 * boundary ports and the wet hall. Each branch transmitter is a real node
 * in series with its pipe, before any waste branches join. */
const poolNumber = (id: PoolId) => Number(id.slice(-2));
const meterId = (side: 'fresh' | 'dirty', id: PoolId) => `${side}-${id}`;
const meter = (side: 'fresh' | 'dirty', id: PoolId): SchematicNode => ({
  id: meterId(side, id),
  kind: 'branch-flowmeter',
  code: `FT${poolNumber(id) + (side === 'dirty' ? 4 : 0)}`,
  name: `${id} ${side === 'fresh' ? 'make-up' : 'pit waste'} flow transmitter`,
});

export const CORRIDOR_WATER_SCHEMATIC: RoomSchematic = {
  room: 'main_corridor',
  code: 'MC',
  nodes: [
    { id: 'make-up-ring', kind: 'header', name: 'Boosted make-up ring' },
    { id: 'wet-hall-boost', kind: 'boundary', name: 'Wet hall booster outlet' },
    { id: 'wet-hall-pit', kind: 'boundary', name: 'Wet hall backwash pit' },
    { id: 'waste-junction', kind: 'header', name: 'Large-pool waste junction' },
    {
      id: 'olympic-foul-wet-hall-inlet',
      kind: 'boundary',
      name: 'Olympic tank drain at wet hall wall',
    },
    ...POOL_IDS.flatMap((id) => [
      { id: `${id}-make-up`, kind: 'boundary', name: `${id} make-up inlet` },
      { id: `${id}-waste`, kind: 'boundary', name: `${id} pit-waste outlet` },
      meter('fresh', id),
      meter('dirty', id),
    ]),
    ...(['pool_03', 'pool_04'] as const).map((id) => ({
      id: `${id}-wet-hall-inlet`,
      kind: 'boundary',
      name: `${id} pit waste at wet hall wall`,
    })),
    {
      id: 'olympic-tank-drain',
      kind: 'boundary',
      name: 'Olympic balance-tank drain',
    },
    {
      id: 'fresh-mimic',
      kind: 'boundary',
      name: 'Fresh Water Distribution mimic',
    },
    { id: 'dirty-mimic', kind: 'boundary', name: 'Pit Inflow Sources mimic' },
  ],
  links: [
    link(
      'Wet hall booster to make-up ring',
      ['wet-hall-boost', 'out'],
      ['make-up-ring', 'in'],
      'water',
    ),
    ...POOL_IDS.flatMap((id) => [
      link(
        `${id} make-up upstream`,
        ['make-up-ring', id],
        [meterId('fresh', id), 'in'],
        'water',
      ),
      link(
        `${id} make-up downstream`,
        [meterId('fresh', id), 'out'],
        [`${id}-make-up`, 'in'],
        'water',
      ),
      link(
        `${id} pit waste upstream`,
        [`${id}-waste`, 'out'],
        [meterId('dirty', id), 'in'],
        'water',
      ),
      link(
        `${id} pit waste downstream`,
        [meterId('dirty', id), 'out'],
        [poolNumber(id) <= 2 ? 'waste-junction' : `${id}-wet-hall-inlet`, id],
        'water',
      ),
      link(
        `${id} fresh meter signal`,
        [meterId('fresh', id), 'signal'],
        ['fresh-mimic', id],
        'control',
      ),
      link(
        `${id} dirty meter signal`,
        [meterId('dirty', id), 'signal'],
        ['dirty-mimic', id],
        'control',
      ),
    ]),
    link(
      'Joined large-pool waste to pit',
      ['waste-junction', 'out'],
      ['wet-hall-pit', 'large-pools'],
      'water',
    ),
    link(
      'Olympic tank drain to wet hall foul inlet',
      ['olympic-tank-drain', 'out'],
      ['olympic-foul-wet-hall-inlet', 'in'],
      'water',
    ),
  ],
  fittings: [],
  rules: { isolate: new Set(), pumps: new Set() },
};

export const branchMeterTag = (side: 'fresh' | 'dirty', id: PoolId) =>
  `${CORRIDOR_WATER_SCHEMATIC.code}-${meter(side, id).code}`;
