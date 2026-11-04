import { describe, expect, test } from 'vite-plus/test';
import { isKindId } from '../../../../game/plant/equipment-kinds';
import { kindCatalogue } from '../kind-catalogue';
import {
  AUDIT_SCHEMA_VERSION,
  auditIndex,
  auditJson,
  auditJsonPath,
  kindAudit,
  roomAudit,
} from './audit-export';
import type { RoomManifest } from './manifests';

const kinds = kindCatalogue();
const input = { kinds };

describe('the engineers office, from data alone (mission 167 fixture)', () => {
  const office = roomAudit('engineers_office', input);

  test('lists its six catalogue copies, each registered as the registry says', () => {
    expect(office.objects.map((o) => [o.ref, o.kind])).toEqual([
      ['EO-CP1', 'scenario-simulator'],
      ['EO-SF1', 'switch-fuse'],
      ['engineer-s-desk', 'desk'],
      ['parts-stores-cupboard', 'storage-cupboard'],
      ['staff-noticeboard', 'sign'],
      ['test-equipment-cupboard', 'storage-cupboard'],
    ]);
    for (const o of office.objects) {
      expect(o.registered).toBe(isKindId(o.kind));
      expect(
        office.findings.some(
          (f) => f.id === `room:engineers_office:unregistered:${o.ref}`,
        ),
      ).toBe(!o.registered);
    }
  });

  test('keeps the eleven software boxes as named manifest evidence, not decoration', () => {
    expect(office.manifest).toHaveLength(11);
    for (const m of office.manifest) {
      expect(m.shows).toEqual(['portable']);
      expect(m.matched).toBe(true);
      expect(m.source).toMatch(/software-boxes\.ts/);
    }
    expect(
      office.findings.filter((f) => f.id.includes(':manifest-only:')),
    ).toHaveLength(11);
  });

  test('says what it cannot vouch for: no descriptors means interaction unknown, never none', () => {
    expect(office.counts.described).toBe(0);
    expect(office.coverage).toEqual({
      interaction: 'unknown',
      seats: 'unknown',
      portable: 'partial',
      solidity: 'partial',
    });
    expect(Object.values(office.coverage)).not.toContain('none');
  });

  test('is proposed, never signed off without a recorded ruling', () => {
    expect(office.signOff).toBe('proposed');
    for (const o of office.objects)
      if (o.affordances)
        expect(['declared', 'default']).toContain(o.affordances.evidence);
  });

  test('carries its schema version, links and JSON path', () => {
    expect(office.schemaVersion).toBe(AUDIT_SCHEMA_VERSION);
    // Links are site-relative; linkBase leads from the JSON's URL to the root.
    const json = new URL(office.links.json, 'https://x.test/pool/');
    expect(new URL(office.linkBase + office.links.html, json).href).toBe(
      'https://x.test/pool/bench.html?bench=room-audit&room=engineers_office',
    );
    expect(office.links).toEqual({
      html: 'bench.html?bench=room-audit&room=engineers_office',
      json: 'audit/room/engineers_office.json',
    });
  });
});

describe('the rules', () => {
  test('output is deterministic', () => {
    expect(auditJson(roomAudit('engineers_office', input))).toBe(
      auditJson(roomAudit('engineers_office', { kinds: kindCatalogue() })),
    );
    expect(auditJson(kindAudit('desk', input))).toBe(
      auditJson(kindAudit('desk', input)),
    );
  });

  test('a room with no data is unknown everywhere and not started', () => {
    const empty = roomAudit('no-such-room', { kinds, manifests: {} });
    expect(empty.objects).toEqual([]);
    expect(Object.values(empty.coverage)).toEqual([
      'unknown',
      'unknown',
      'unknown',
      'unknown',
    ]);
    expect(empty.signOff).toBe('not-started');
  });

  test('a manifest entry whose owner is not catalogued is flagged', () => {
    const manifests: Record<string, () => RoomManifest> = {
      engineers_office: () => ({
        room: 'engineers_office',
        entries: [
          {
            ref: 'mystery-lever',
            title: 'Mystery lever',
            owner: 'no-such-thing',
            shows: ['interaction'],
            behaviour: 'pulled',
            source: 'nowhere.ts:1',
          },
        ],
      }),
    };
    const a = roomAudit('engineers_office', { kinds, manifests });
    expect(a.manifest[0].matched).toBe(false);
    const f = a.findings.find((x) =>
      x.id.endsWith(':manifest-unmatched:mystery-lever'),
    );
    expect(f?.severity).toBe('warning');
    expect(a.coverage.interaction).toBe('partial');
  });

  test('a proposal is not an approval: only a recorded ruling approves', () => {
    const ruled = {
      kinds,
      rulings: [{ subject: 'desk', date: '2026-11-04', decision: 'test' }],
    };
    // Nobody has declared the desk's affordances: they are defaults, not declarations.
    expect(kindAudit('desk', input).affordances?.evidence).toBe('default');
    expect(kindAudit('desk', ruled).affordances?.evidence).toBe('approved');
    expect(kindAudit('desk', input).findings.map((f) => f.id)).toContain(
      'kind:desk:affordances-unruled',
    );
    expect(kindAudit('desk', ruled).findings).toEqual([]);
  });

  test('a room is signed off only with a ruling and no unresolved findings', () => {
    const rulings = [
      { subject: 'engineers_office', date: '2026-11-04', decision: 'test' },
    ];
    // An unmatched manifest entry is unresolved, so even a ruling does not sign it off.
    const manifests: Record<string, () => RoomManifest> = {
      engineers_office: () => ({
        room: 'engineers_office',
        entries: [
          {
            ref: 'stray',
            title: 'Stray',
            owner: 'nothing-here',
            shows: ['portable'],
            behaviour: 'carried',
            source: 'x.ts:1',
          },
        ],
      }),
    };
    expect(
      roomAudit('engineers_office', { kinds, rulings, manifests }).signOff,
    ).toBe('proposed');
  });

  test('a kind lists its placements by room, with links', () => {
    const desk = kindAudit('desk', input);
    expect(desk.registered).toBe(true);
    expect(desk.placements.find((p) => p.room === 'engineers_office')).toEqual({
      room: 'engineers_office',
      refs: ['engineer-s-desk'],
      links: {
        html: 'bench.html?bench=room-audit&room=engineers_office',
        json: auditJsonPath.room('engineers_office'),
      },
    });
  });

  test('the index lists every room and kind with links', () => {
    const index = auditIndex(input);
    expect(
      index.rooms.find((r) => r.id === 'engineers_office')?.links.json,
    ).toBe('audit/room/engineers_office.json');
    for (const k of index.kinds) expect(k.registered).toBe(isKindId(k.id));
    expect(index.kinds.find((k) => k.id === 'desk')?.links.html).toBe(
      'bench.html?bench=item-audit&kind=desk',
    );
  });
});

const SOURCES = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

test('the export path never reaches a scene: no Three.js, DOM views or scanner imported', () => {
  expect(Object.keys(SOURCES).length).toBeGreaterThan(2);
  for (const [file, source] of Object.entries(SOURCES)) {
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    for (const i of imports)
      expect(i, `${file} imports ${i}`).not.toMatch(
        /^three|\/views\/|look-audit-scene|room-build/,
      );
  }
});
