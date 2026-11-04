import { brandById } from '../../components/core/logic/brands';
import { objectDescriptors } from '../../../game/descriptors/registry';
import { newWorld } from '../../../game/world';
import { resolveRoomId } from '../logic/dev-room-links';
import { kindCatalogue } from '../logic/kind-catalogue';
import { auditLink, lookCatalogue, lookLink } from '../logic/look-catalogue';
import {
  FLAG_WORDS,
  auditNetwork,
  boardCopies,
  roomAuditRows,
} from '../logic/room-audit';
import type {
  AuditRow,
  ControlLink,
  RoomAuditView,
  RoomFlag,
} from '../logic/room-audit';
import { auditInFrame, count, el, table } from './look-audit-page';
import { resolveRef } from '../logic/sim-graph/graph';
import { nodeLink } from '../logic/sim-graph/node-page';
import { roomAudit } from '../logic/audit-export/audit-export';
import { roomDataSection } from './audit-data-section';

/**
 * The room audit page (mission 129, `bench.html?bench=room-audit&room=<id>`):
 * one room built by the game in a frame through 127's room-build adapter
 * (`?audit=look`), scanned once by 127's scanner, the frame removed; then
 * every look target listed with its model node, connections, controls,
 * copies, readings and flags (`logic/room-audit.ts`). Nothing runs while
 * idle.
 *
 * Mission 167: the page opens from data alone (`roomAudit`, the same
 * document as `audit/room/<id>.json`), with no scene; building and
 * scanning the room is the explicit **Verify this room** action, run at
 * once only when asked (`&verify=1`) or when a row is linked (`#row-…`).
 */

const STYLE = `
.ra { max-width: 1400px; margin: 0 auto; padding: 0 16px 48px; }
.ra h1 { font-size: 20px; } .ra h2 { font-size: 16px; margin-top: 24px; }
.ra table { border-collapse: collapse; width: 100%; font-size: 13px; }
.ra th, .ra td { border-bottom: 1px solid #3a3d42; padding: 4px 6px; text-align: left; vertical-align: top; }
.ra td.n, .ra th.n { text-align: right; font-variant-numeric: tabular-nums; }
.ra a { color: #9fc6ff; }
.ra .bad { color: #ff9b8a; } .ra .note { color: #a8a291; } .ra .soft { color: #d8c27a; }
.ra .counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.ra .count { background: #262a2f; border-radius: 6px; padding: 8px 12px; min-width: 96px; }
.ra .count b { display: block; font-size: 20px; }
.ra .scroll { overflow-x: auto; }
.ra iframe { width: 480px; max-width: 100%; aspect-ratio: 16 / 9; border: 1px solid #3a3d42; }
.ra ul { margin: 0; padding-left: 14px; } .ra li { margin: 0; }
.ra .lbl { font-size: 11px; padding: 0 4px; border-radius: 3px; background: #33373d; margin-left: 4px; }
.ra tr:target { background: #2d3a2d; }
.ra label { display: inline-flex; gap: 6px; align-items: center; min-height: 40px; }
`;

const rowId = (ref: string) => `row-${ref}`;
const audited = (room: string, ref?: string) =>
  `${auditLink(room).replace(/^bench\.html/, '')}${ref ? `#${encodeURIComponent(rowId(ref))}` : ''}`;

const list = (items: (Node | string)[]) =>
  items.length ? el('ul', {}, ...items.map((i) => el('li', {}, i))) : '';

function drawRows(root: HTMLElement, v: RoomAuditView, snapshot: string) {
  const { room } = v;
  const byModel = new Map(
    v.rows.flatMap((r) => (r.model ? [[r.model, r] as const] : [])),
  );
  const toRow = (r: AuditRow) =>
    el('a', { href: `#${rowId(r.ref)}` }, r.tag ?? r.name ?? r.ref);
  const ctl = (c: ControlLink, other: (c: ControlLink) => string) =>
    el(
      'span',
      {},
      el(
        'a',
        {
          href:
            c.room === room ? `#${rowId(c.object)}` : audited(c.room, c.object),
        },
        c.control,
      ),
      ` ${c.label}${c.local ? ' (local)' : ''}`,
      c.room === room ? '' : ` · ${c.room}`,
      other(c),
    );
  const nameCell = (r: AuditRow) =>
    el(
      'div',
      {},
      el(
        'a',
        { href: `./${lookLink(room, r.ref)}`, target: '_blank' },
        r.tag ?? r.name ?? r.ref,
      ),
      r.tag && r.name ? el('div', { className: 'note' }, r.name) : '',
      r.assetId ? el('div', { className: 'note' }, r.assetId) : '',
    );
  const typeCell = (r: AuditRow) =>
    el(
      'div',
      {},
      r.kindWord ?? r.kind ?? '',
      r.maker ? el('div', { className: 'note' }, r.maker) : '',
      el(
        'div',
        { className: r.class === 'architectural' ? 'soft' : 'note' },
        r.class,
      ),
    );
  const connCell = (r: AuditRow) =>
    list(
      r.connections.map((c) => {
        const row = byModel.get(c.neighbour);
        return el(
          'span',
          {},
          row ? toRow(row) : c.name,
          el('span', { className: 'lbl' }, c.label),
          el('span', { className: 'note' }, ` ${c.medium} · ${c.link}`),
        );
      }),
    );
  const ctlCell = (r: AuditRow) =>
    list([
      ...r.controlledBy.map((c) => ctl(c, () => '')),
      ...r.controls.map((c) =>
        ctl(c, (x) => ` → works ${(x.targets ?? []).join(', ')}`),
      ),
      ...r.mirrors.map((m) =>
        el(
          'span',
          {},
          'copy of ',
          el('a', { href: audited(m.room) }, `${m.room}'s ${m.node}`),
          ' (one world state)',
        ),
      ),
      ...r.mirroredBy.map((m) =>
        el(
          'span',
          {},
          'copied by ',
          el('a', { href: audited(m.room) }, `${m.room}'s ${m.node}`),
        ),
      ),
    ]);
  const flagCell = (r: AuditRow) =>
    el(
      'span',
      {},
      ...r.flags.map((f) =>
        el(
          'div',
          { className: f === 'no-maker' ? 'soft' : 'bad' },
          FLAG_WORDS[f],
        ),
      ),
    );
  // Mission 138: a model ref links to its simulation node's page (a
  // connector to its run's section on its active end's page, every target
  // listed); an architectural object to its not-simulated page.
  const modelCell = (r: AuditRow) => {
    if (!r.model)
      return r.class === 'architectural'
        ? el(
            'a',
            {
              href: `?bench=sim-object&room=${encodeURIComponent(room)}&ref=${encodeURIComponent(r.ref)}`,
            },
            'not simulated',
          )
        : el('span', { className: 'note' }, 'unbound');
    const targets = resolveRef(room, r.model);
    return el(
      'div',
      {},
      r.model,
      ...targets.map((t, i) =>
        el(
          'div',
          {},
          el(
            'a',
            { href: nodeLink(t.page, t.anchor).replace(/^bench\.html/, '') },
            targets.length > 1 ? `run ${i}: ${t.label}` : 'its node',
          ),
        ),
      ),
    );
  };
  const line = (r: AuditRow) => [
    nameCell(r),
    typeCell(r),
    modelCell(r),
    connCell(r),
    ctlCell(r),
    list(r.shows.map((s) => `${s.label}: ${s.value}`)),
    flagCell(r),
  ];
  const head = [
    'Name or tag',
    'Type',
    'Model node',
    'Connects to',
    'Controlled by · controls · copies',
    `Shows (${snapshot})`,
    'Flags',
  ];
  const main = table(head, v.rows.map(line));
  main.querySelectorAll('tbody tr').forEach((tr, i) => {
    tr.id = rowId(v.rows[i].ref);
    if (v.rows[i].flags.length) tr.classList.add('flagged');
  });
  const unnamed = table(
    ['Under', 'Meshes', 'Volume m³', 'Largest m'],
    v.unnamed.map((g) => [
      g.under,
      String(g.meshes),
      g.volume.toFixed(3),
      g.size.toFixed(2),
    ]),
    [1, 2, 3],
  );
  unnamed
    .querySelectorAll('tbody tr')
    .forEach((tr) => tr.classList.add('flagged'));
  const deco = table(
    ['Name or tag', 'Type', 'Model node'],
    v.decorative.map((r) => [nameCell(r), typeCell(r), r.model ?? '']),
  );
  const missing = table(
    ['Control', 'Why'],
    v.missingControls.map((m) => [m.control, m.reason]),
  );
  const only = document.createElement('input');
  only.type = 'checkbox';
  const onlyLabel = document.createElement('label');
  onlyLabel.append(only, 'Flagged rows only');
  only.addEventListener('change', () =>
    root.querySelectorAll('tbody tr').forEach((tr) => {
      (tr as HTMLElement).hidden =
        only.checked && !tr.classList.contains('flagged');
    }),
  );
  const flags = Object.keys(FLAG_WORDS) as RoomFlag[];
  root.append(
    el(
      'div',
      { className: 'counts' },
      count('rows', v.counts.rows),
      count('flagged', v.counts.flagged, true),
      ...flags.map((f) =>
        count(
          FLAG_WORDS[f].split(':')[0].replace(/ \(.*/, ''),
          v.counts[f],
          f !== 'no-maker',
        ),
      ),
      count('decorative', v.decorative.length),
    ),
    onlyLabel,
    el(
      'h2',
      {},
      `Every object (${v.rows.length}): named first, then the rest in scene order`,
    ),
    main,
    el(
      'h2',
      {},
      `Unnamed: drawn, no marked owner, by where it sits (${v.unnamed.length})`,
    ),
    unnamed,
    el(
      'h2',
      {},
      `Controls (131's descriptors) missing or wired to nothing (${v.missingControls.length})`,
    ),
    el(
      'p',
      { className: 'note' },
      'Only controls described as data are checked; until every kind is described this cannot be complete.',
    ),
    missing,
    el(
      'h2',
      {},
      `Decorative, listed apart, never flagged (${v.decorative.length})`,
    ),
    deco,
  );
}

export async function runRoomAuditPage(root: HTMLElement) {
  document.title = 'Room audit';
  root.replaceChildren(el('style', {}, STYLE));
  const page = el('div', { className: 'ra' });
  root.append(page);
  const asked = new URLSearchParams(location.search).get('room');
  const room = asked ? (resolveRoomId(asked) ?? asked) : null;
  if (!room) {
    page.append(
      el('h1', {}, 'Room audit'),
      el(
        'p',
        {},
        'Name a room: ?bench=room-audit&room=plant_pool_03, or use the catalogue’s Audit item (?dev).',
      ),
    );
    return;
  }
  if (asked !== room) {
    const q = new URLSearchParams(location.search);
    q.set('room', room);
    history.replaceState(null, '', `?${q}${location.hash}`);
  }
  page.append(
    el('h1', {}, `Room audit · ${room}`),
    el(
      'p',
      {},
      el('a', { href: `./?room=${encodeURIComponent(room)}` }, 'Open the room'),
      ' · ',
      el(
        'a',
        { href: `?bench=lookables&room=${encodeURIComponent(room)}` },
        'Its look audit (127)',
      ),
      ' · ',
      el(
        'a',
        { href: `?bench=sim-graph&room=${encodeURIComponent(room)}` },
        'Its simulation nodes (138)',
      ),
      ' · mission 129',
    ),
  );
  const data = roomAudit(room);
  (window as unknown as { __roomAuditData: unknown }).__roomAuditData = data;
  page.append(roomDataSection(data));
  const verify = el('button', { type: 'button' }, 'Verify this room');
  const status = el(
    'p',
    { className: 'note' },
    'Verifying builds this one room in a frame, scans its marks and removes it.',
  );
  const host = el('div');
  page.append(
    el('h2', {}, 'Verified in the scene (127, 129)'),
    verify,
    status,
    host,
  );
  const asked167 = new URLSearchParams(location.search).get('verify');
  if (asked167 === '1' || location.hash.startsWith('#row-'))
    await verifyRoom(page, room, status, host, verify);
  else
    verify.addEventListener(
      'click',
      () => void verifyRoom(page, room, status, host, verify),
      { once: true },
    );
}

async function verifyRoom(
  page: HTMLElement,
  room: string,
  status: HTMLElement,
  host: HTMLElement,
  verify: HTMLButtonElement,
) {
  verify.disabled = true;
  status.textContent = 'Building the room…';
  try {
    const t0 = performance.now();
    const audit = await auditInFrame(host, room);
    const kinds = kindCatalogue();
    const makers = new Map(
      kinds.flatMap((k) =>
        k.maker ? [[k.key, brandById(k.maker).name] as const] : [],
      ),
    );
    const view = roomAuditRows(audit, {
      network: auditNetwork(room),
      catalogue: lookCatalogue(room, kinds),
      makerOf: (k) => makers.get(k),
      descriptors: objectDescriptors(),
      copies: boardCopies(),
      world: newWorld(),
    });
    status.textContent = `Opened in ${Math.round(performance.now() - t0)} ms, which includes the frame's module load, the scene build (${audit.timing?.build ?? '?'} ms) and its scan (${audit.timing?.scan ?? '?'} ms); readings at a fresh world (newWorld, time 0). ${auditNetwork(room) ? '' : 'This room has no enhanced network: nothing is flagged unbound or orphan.'}`;
    drawRows(page, view, 'fresh world');
    (window as unknown as { __roomAudit: unknown }).__roomAudit = view;
    if (location.hash)
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView();
  } catch (error) {
    status.textContent = `${room} could not be audited: ${String(error)}`;
    status.className = 'bad';
  }
}
