import type {
  AuditFinding,
  Coverage,
  KindAudit,
  RoomAudit,
} from '../logic/audit-export/audit-export';
import { count, el, table } from './look-audit-page';

/**
 * The data-first sections of the room and item audit pages (mission 167):
 * drawn from the pure audit model before, and without, any scene, with a
 * link to the same document as JSON. Nothing runs while idle.
 */

const COVERAGE_WORDS: Record<Coverage, string> = {
  covered: 'covered',
  partial: 'partial (known gaps)',
  none: 'none (checked and absent)',
  unknown: 'unknown (no data; not proof of none)',
};

const STYLE = `
.ad .cov-unknown { color: #d8c27a; } .ad .cov-none { color: #a8a291; }
.ad .sev-warning, .ad .sev-error { color: #ff9b8a; } .ad .sev-info { color: #a8a291; }
.ad .ev { font-size: 11px; padding: 0 4px; border-radius: 3px; background: #33373d; }
`;

const link = (href: string, text: string) => el('a', { href }, text);

const jsonLine = (json: string, html?: string) =>
  el(
    'p',
    { className: 'note' },
    'Machine-readable: ',
    link(json, json),
    ' (schema in doc/agent-tooling.md)',
    ...(html ? [' · ', link(html, 'this page')] : []),
  );

function findingsTable(findings: readonly AuditFinding[]) {
  if (!findings.length) return el('p', { className: 'note' }, 'No findings.');
  return table(
    ['Severity', 'Finding', 'Next', 'Evidence · source'],
    findings.map((f) => [
      el('span', { className: `sev-${f.severity}` }, f.severity),
      el('span', { title: f.id }, f.message),
      f.next,
      el(
        'span',
        {},
        el('span', { className: 'ev' }, f.evidence),
        ` ${f.source}`,
      ),
    ]),
  );
}

/** A room's data-first audit: coverage, objects, manifest evidence and findings. */
export function roomDataSection(a: RoomAudit): HTMLElement {
  const affordance = (o: RoomAudit['objects'][number]) => {
    const v = o.affordances?.value;
    if (!v) return el('span', { className: 'sev-warning' }, 'unregistered');
    return el(
      'span',
      {},
      [
        v.interaction,
        v.portable ? 'portable' : '',
        v.solid ? `solid (${v.shape.type})` : 'not solid',
        v.seat ? 'seat' : '',
      ]
        .filter(Boolean)
        .join(' · '),
      ' ',
      el('span', { className: 'ev' }, o.affordances!.evidence),
    );
  };
  return el(
    'section',
    { className: 'ad' },
    el('style', {}, STYLE),
    el('h2', {}, 'From data (mission 167): no scene built'),
    jsonLine(a.links.json),
    el(
      'div',
      { className: 'counts' },
      count('objects', a.counts.objects),
      count('registered', a.counts.registered),
      count('unregistered', a.counts.unregistered, true),
      count('described', a.counts.described),
      count('manifest', a.counts.manifest),
      count('findings', a.counts.findings),
    ),
    el('p', {}, `Sign-off: ${a.signOff}.`),
    table(
      ['Capability', 'Coverage'],
      Object.entries(a.coverage).map(([c, v]) => [
        c,
        el('span', { className: `cov-${v}` }, COVERAGE_WORDS[v]),
      ]),
    ),
    el('h3', {}, `Objects (${a.objects.length})`),
    table(
      ['Ref', 'Title', 'Kind', 'Affordances', 'Descriptor'],
      a.objects.map((o) => [
        o.links[0] ? link(o.links[0], o.ref) : o.ref,
        o.title,
        o.links[1] ? link(o.links[1], o.kind) : o.kind,
        affordance(o),
        o.descriptor
          ? `${o.descriptor.controls} controls, ${o.descriptor.readings} readings`
          : '—',
      ]),
    ),
    el('h3', {}, `Manifest evidence (${a.manifest.length})`),
    a.manifest.length
      ? table(
          ['Ref', 'Title', 'Owner', 'Shows', 'Behaviour', 'Source'],
          a.manifest.map((m) => [
            m.ref,
            m.title,
            m.matched
              ? (m.owner ?? '—')
              : el(
                  'span',
                  { className: 'sev-warning' },
                  `${m.owner ?? '—'} (unmatched)`,
                ),
            m.shows.join(', '),
            m.behaviour,
            m.source,
          ]),
        )
      : el('p', { className: 'note' }, 'No manifest entries for this room.'),
    el('h3', {}, `Findings (${a.findings.length})`),
    findingsTable(a.findings),
  );
}

/** A kind's data-first audit: affordances, placements and findings. */
export function kindDataSection(k: KindAudit): HTMLElement {
  const v = k.affordances?.value;
  return el(
    'section',
    { className: 'ad' },
    el('style', {}, STYLE),
    el('h2', {}, 'From data (mission 167)'),
    jsonLine(k.links.json),
    v
      ? table(
          [
            'Interaction',
            'Portable',
            'Solid',
            'Shape',
            'Surface',
            'Seat',
            'Evidence',
          ],
          [
            [
              v.interaction,
              String(v.portable),
              String(v.solid),
              v.shape.type,
              String(v.surface),
              v.seat ? `${v.seat.height} m` : '—',
              el('span', { className: 'ev' }, k.affordances!.evidence),
            ],
          ],
        )
      : el(
          'p',
          { className: 'sev-warning' },
          'Not in the object registry: no affordances.',
        ),
    el(
      'h3',
      {},
      `Placements (${k.counts.placements} in ${k.counts.rooms} rooms)`,
    ),
    k.placements.length
      ? table(
          ['Room', 'Refs'],
          k.placements.map((p) => [
            link(p.links.html, p.room),
            p.refs.join(', '),
          ]),
        )
      : el('p', { className: 'note' }, 'Placed nowhere the catalogue knows.'),
    el('h3', {}, `Findings (${k.findings.length})`),
    findingsTable(k.findings),
  );
}
