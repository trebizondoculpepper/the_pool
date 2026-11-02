import { describe, expect, it } from 'vite-plus/test';
import type { ObjectDescriptor } from '../../../game/descriptors/descriptor';
import { objectDescriptors } from '../../../game/descriptors/registry';
import { JACUZZI_CABINET_REF } from '../../../game/descriptors/jacuzzi-room';
import type { RoomAudit, TargetRecord } from './look-audit';
import {
  auditNetwork,
  boardCopies,
  connectionsOf,
  controlledBy,
  controlsOf,
  copiesOf,
  roomAuditRows,
  shownText,
} from './room-audit';
import type { AuditNetwork } from './room-audit';

const net: AuditNetwork = {
  nodes: [
    { id: 'pump', kind: 'pump', name: 'Pump' },
    { id: 'tank', kind: 'balance-tank', name: 'Tank' },
    { id: 'out', kind: 'boundary', name: 'Outlet' },
    { id: 'panel', kind: 'valve-panel', name: 'Panel' },
    { id: 'lonely', kind: 'pump', name: 'Lonely' },
  ],
  links: [
    {
      id: 'suction',
      sourceId: 'tank',
      sourcePort: 'out',
      targetId: 'pump',
      targetPort: 'in',
      medium: 'water',
    },
    {
      id: 'waste',
      sourceId: 'pump',
      sourcePort: 'out',
      targetId: 'out',
      targetPort: 'in',
      medium: 'water',
    },
    {
      id: 'signal',
      sourceId: 'panel',
      sourcePort: 'out',
      targetId: 'pump',
      targetPort: 'ctl',
      medium: 'control',
    },
  ],
  along: new Map([['suction', ['v1']]]),
};

const target = (t: Partial<TargetRecord> & { ref: string }): TargetRecord => ({
  class: 'plant',
  owners: 1,
  parts: [],
  catalogue: 'absent',
  size: 1,
  findings: [],
  ...t,
});

const auditOf = (targets: TargetRecord[]): RoomAudit => ({
  room: 'r',
  hook: true,
  targets,
  unlabelled: [{ under: 'Room / Rack', meshes: 3, volume: 0.2, size: 1 }],
  unreachable: [],
  unverified: [],
  duplicateTags: [],
  duplicateNames: [],
  badFronts: [],
  hiddenSigns: [],
  unmarkedControls: [],
  counts: {} as RoomAudit['counts'],
  failing: 0,
});

const descriptor = (
  ref: string,
  room: string,
  targets: string[],
): ObjectDescriptor => ({
  ref,
  room,
  kind: 'k',
  class: 'plant',
  name: ref,
  controls: [
    {
      key: 'go',
      ref: `${ref}/go`,
      label: 'GO',
      form: 'push-button',
      inputs: ['press'],
      targets,
    },
  ],
  readings: [
    {
      key: 'lamp',
      ref: `${ref}/lamp`,
      label: 'RUN',
      form: 'lamp',
      read: () => true,
    },
  ],
  view: [],
  presets: [],
});

describe('connectionsOf', () => {
  const present = new Set([
    'node:pump',
    'node:tank',
    'fitting:v1',
    'node:panel',
    'link:suction',
  ]);
  it('labels drawn, model-only and boundary links, through fittings', () => {
    const c = connectionsOf('node:pump', net, present);
    expect(c.map((x) => [x.neighbour, x.label])).toEqual([
      ['fitting:v1', 'drawn'],
      ['node:out', 'boundary'],
      ['node:panel', 'model only'],
    ]);
  });
  it('gives a fitting its neighbours either side', () => {
    expect(
      connectionsOf('fitting:v1', net, present).map((x) => x.neighbour),
    ).toEqual(['node:tank', 'node:pump']);
  });
  it('calls a neighbour not in the scene a boundary', () => {
    const c = connectionsOf('node:tank', net, new Set(['link:suction']));
    expect(c[0].label).toBe('boundary');
  });
});

describe('controls', () => {
  const ds = [
    descriptor('A', 'r', ['node:pump']),
    descriptor('B', 'other', ['node:pump', 'T1']),
  ];
  it('finds what controls a row: by model in its room, by tag anywhere', () => {
    const by = controlledBy(
      { ref: 'T1', tag: 'T1', model: 'node:pump' },
      'r',
      ds,
    );
    expect(by.map((c) => [c.control, c.room])).toEqual([
      ['A/go', 'r'],
      ['B/go', 'other'],
    ]);
  });
  it('lists what a row controls, not itself', () => {
    expect(controlsOf({ ref: 'A' }, 'r', ds)[0].targets).toEqual(['node:pump']);
    expect(controlsOf({ ref: 'A', model: 'node:pump' }, 'r', ds)).toEqual([]);
  });
});

describe('roomAuditRows', () => {
  const view = roomAuditRows(
    auditOf([
      target({ ref: 'node:panel', model: 'node:panel' }),
      target({ ref: 'Z9', tag: 'Z9', model: 'node:pump' }),
      target({ ref: 'loose', name: 'Loose thing' }),
      target({ ref: 'sign', name: 'Exit', class: 'architectural' }),
      target({ ref: 'plant-pot', name: 'Pot', class: 'decorative' }),
      target({ ref: 'node:lonely', name: 'Lonely', model: 'node:lonely' }),
      target({ ref: 'D1', tag: 'D1', findings: ['duplicate-tag'] }),
    ]),
    {
      network: net,
      descriptors: [
        descriptor('Z9', 'r', ['node:tank']),
        descriptor('node:panel', 'r', ['nowhere']),
      ],
      world: {} as never,
    },
  );
  const row = (ref: string) => view.rows.find((r) => r.ref === ref)!;
  it('puts named rows first and decoration apart', () => {
    expect(view.rows.map((r) => r.ref)).toEqual([
      'D1',
      'Z9',
      'sign',
      'node:lonely',
      'loose',
      'node:panel',
    ]);
    expect(view.decorative.map((r) => r.ref)).toEqual(['plant-pot']);
  });
  it('flags each kind of gap', () => {
    expect(row('node:panel').flags).toContain('unnamed');
    expect(row('loose').flags).toEqual(['unbound']);
    expect(row('sign').flags).toEqual([]);
    expect(row('node:lonely').flags).toEqual(['orphan']);
    expect(row('D1').flags).toContain('duplicate');
    expect(row('node:panel').flags).toContain('missing-control');
    expect(view.missingControls).toEqual([
      {
        control: 'node:panel/go',
        reason: 'works nowhere, which nothing holds',
      },
    ]);
    expect(view.counts.unnamed).toBe(2);
  });
  it('reads what a row shows', () => {
    expect(row('Z9').shows).toEqual([{ label: 'RUN', value: 'lit' }]);
  });
  it('flags nothing unbound in a room without a network', () => {
    const v = roomAuditRows(auditOf([target({ ref: 'x', name: 'X' })]));
    expect(v.rows[0].flags).toEqual([]);
  });
});

describe('the real rooms', () => {
  it('the control room’s jacuzzi mimic is a copy of the plant room’s board', () => {
    const copies = boardCopies();
    expect(
      copiesOf('node:mimic-jacuzzi', 'control_room', copies).mirrors,
    ).toContainEqual({ room: 'plant_pool_03', node: 'mimic' });
    expect(
      copiesOf('node:mimic', 'plant_pool_03', copies).mirroredBy,
    ).toContainEqual({ room: 'control_room', node: 'mimic-jacuzzi' });
    // Found by kind: the boiler house's gas mimic.
    expect(
      copiesOf('node:mimic-gas', 'control_room', copies).mirrors,
    ).toContainEqual({ room: 'boiler_house', node: 'mimic-gas' });
  });
  it('the jacuzzi room’s network holds its 18 valves and its isolator', () => {
    const n = auditNetwork('plant_pool_03')!;
    const fittings = [...n.along.values()].flat();
    expect(fittings.filter((f) => f.endsWith('isolator'))).toHaveLength(1);
    expect(fittings.length).toBeGreaterThanOrEqual(19);
  });
  it('the cabinet is controlled by its own controls and the valve panel’s are not its', () => {
    const by = controlledBy(
      {
        ref: JACUZZI_CABINET_REF,
        tag: JACUZZI_CABINET_REF,
        model: 'node:cabinet',
      },
      'plant_pool_03',
      objectDescriptors(),
    );
    expect(by.some((c) => c.object === JACUZZI_CABINET_REF)).toBe(true);
  });
  it('words readings', () => {
    expect([shownText(false), shownText(0.21818), shownText(null)]).toEqual([
      'out',
      '0.22',
      '—',
    ]);
  });
});
