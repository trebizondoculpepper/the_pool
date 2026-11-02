import type { RoomAudit, RoomSummary, TargetRecord } from '../logic/look-audit';
import { summaryOf, totalsOf } from '../logic/look-audit';
import { lookLink } from '../logic/look-catalogue';
import { ROOMS, resolveRoomId } from '../logic/dev-room-links';

/**
 * The look audit's screens (mission 127, `bench.html?bench=lookables`):
 * one room (`&room=<id>`), built by the game in a frame of its own through
 * the room-build adapter (`?audit=look`) and scanned once, every finding
 * and every target's record listed; or every room's summary, from the
 * committed report (`doc/look-audit.json`), with a button to audit them all
 * again here, one at a time. Nothing runs while idle; no canvas is drawn
 * by the page itself.
 */

const STYLE = `
.la { max-width: 1200px; margin: 0 auto; padding: 0 16px 48px; }
.la h1 { font-size: 20px; } .la h2 { font-size: 16px; margin-top: 24px; }
.la table { border-collapse: collapse; width: 100%; font-size: 13px; }
.la th, .la td { border-bottom: 1px solid #3a3d42; padding: 4px 6px; text-align: left; vertical-align: top; }
.la td.n, .la th.n { text-align: right; font-variant-numeric: tabular-nums; }
.la a { color: #9fc6ff; }
.la .bad { color: #ff9b8a; } .la .ok { color: #9be39b; } .la .note { color: #a8a291; }
.la .counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.la .count { background: #262a2f; border-radius: 6px; padding: 8px 12px; min-width: 96px; }
.la .count b { display: block; font-size: 20px; }
.la .scroll { overflow-x: auto; }
.la iframe { width: 480px; max-width: 100%; aspect-ratio: 16 / 9; border: 1px solid #3a3d42; }
.la button { font: inherit; padding: 8px 14px; min-height: 40px; }
`;

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
};

const table = (
  head: string[],
  rows: (Node | string)[][],
  numeric: number[] = [],
) =>
  el(
    'div',
    { className: 'scroll' },
    el(
      'table',
      {},
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          ...head.map((h, i) =>
            el('th', numeric.includes(i) ? { className: 'n' } : {}, h),
          ),
        ),
      ),
      el(
        'tbody',
        {},
        ...rows.map((r) =>
          el(
            'tr',
            {},
            ...r.map((c, i) =>
              el('td', numeric.includes(i) ? { className: 'n' } : {}, c),
            ),
          ),
        ),
      ),
    ),
  );

const count = (label: string, n: number, bad = false) =>
  el(
    'div',
    { className: 'count' },
    el('b', { className: n && bad ? 'bad' : '' }, String(n)),
    label,
  );

const roomLink = (room: string) =>
  el('a', { href: `?bench=lookables&room=${encodeURIComponent(room)}` }, room);

/** Build `room` in a frame through the adapter and wait for its audit. */
export async function auditInFrame(
  host: HTMLElement,
  room: string,
  timeout = 120_000,
): Promise<RoomAudit> {
  const frame = el('iframe', {
    src: `./?${new URLSearchParams({ room, audit: 'look', shot: '1' })}`,
    title: `${room}, built for its audit`,
  });
  host.append(frame);
  try {
    const until = performance.now() + timeout;
    while (performance.now() < until) {
      await new Promise((r) => setTimeout(r, 400));
      const got = (
        frame.contentWindow as unknown as {
          __poolLookAudit?: {
            done: boolean;
            error?: string;
            audit?: RoomAudit;
          };
        } | null
      )?.__poolLookAudit;
      if (got?.done) {
        if (got.audit) return got.audit;
        throw new Error(got.error ?? 'not audited');
      }
    }
    throw new Error(`timed out after ${timeout / 1000} s`);
  } finally {
    frame.remove();
  }
}

const frontText = (t: TargetRecord) =>
  t.front
    ? `${t.front.seen}/9${t.front.wallAhead ? ', wall ahead' : ''}${t.front.noclip ? ', noclip' : ''}`
    : '';

/** One room's audit, drawn. */
function drawRoom(root: HTMLElement, a: RoomAudit) {
  const c = a.counts;
  root.append(
    el(
      'p',
      { className: 'note' },
      `${a.hook ? 'Look links served' : 'No look hook: scanned after a settle'} · built in ${a.timing?.build ?? '?'} ms (module load and scene build), scanned in ${a.timing?.scan ?? '?'} ms · `,
      el('a', { href: `./?room=${a.room}` }, 'open the room'),
    ),
    el(
      'div',
      { className: 'counts' },
      count('failing', a.failing, true),
      count('targets', c.targets),
      count('architectural', c.architectural),
      count('unlabelled', c.unlabelled, true),
      count('unreachable', c.unreachable, true),
      count('unverified missing', c.unverified, true),
      count('duplicate tags', c.duplicateTags, true),
      count('duplicate names', c.duplicateNames),
      count('bad fronts', c.badFronts, true),
      count('signs marked decorative', c.hiddenSigns, true),
      count('controls not marked', c.unmarkedControls, true),
    ),
  );
  const section = (title: string, n: number, body: () => Node) => {
    root.append(el('h2', {}, `${title} (${n})`));
    if (n) root.append(body());
  };
  section(
    'Unlabelled: drawn, no marked owner, 5 cm across or more; largest first',
    a.unlabelled.length,
    () =>
      table(
        ['Under', 'Meshes', 'Volume m³', 'Largest m', 'Accepted'],
        a.unlabelled.map((g) => [
          g.under,
          String(g.meshes),
          g.volume.toFixed(3),
          g.size.toFixed(2),
          g.exception ?? '',
        ]),
        [1, 2, 3],
      ),
  );
  section(
    'Unreachable: expected by the catalogue or register, not in the scene',
    a.unreachable.length,
    () =>
      table(
        ['Ref', 'Title', 'From', 'Why'],
        a.unreachable.map((u) => [u.ref, u.title, u.source, u.reason]),
      ),
  );
  section('Unverified catalogue entries not found', a.unverified.length, () =>
    table(
      ['Ref', 'Title', 'Why'],
      a.unverified.map((u) => [u.ref, u.title, u.reason]),
    ),
  );
  section(
    'Duplicate tags: two separate things answering to one tag',
    a.duplicateTags.length,
    () =>
      table(
        ['Tag', 'Pieces'],
        a.duplicateTags.map((d) => [d.tag, String(d.pieces)]),
        [1],
      ),
  );
  section('Duplicate names: reached by #n', a.duplicateNames.length, () =>
    table(
      ['Name', 'Count'],
      a.duplicateNames.map((d) => [d.name, String(d.count)]),
      [1],
    ),
  );
  section(
    'Bad fronts: under half the rays, or facing a wall within 0.3 m',
    a.badFronts.length,
    () =>
      table(
        ['Ref', 'Front'],
        a.targets
          .filter((t) => t.findings.includes('bad-front'))
          .map((t) => [
            el('a', { href: lookLink(a.room, t.ref) }, t.ref),
            frontText(t),
          ]),
      ),
  );
  section('Worded signs marked decorative', a.hiddenSigns.length, () =>
    table(
      ['Name'],
      a.hiddenSigns.map((s) => [s]),
    ),
  );
  section(
    'Controls the descriptors name (131) whose refs do not resolve',
    a.unmarkedControls.length,
    () =>
      table(
        ['Control', 'Why'],
        a.unmarkedControls.map((u) => [u.ref, u.reason]),
      ),
  );
  section('Every look target', a.targets.length, () =>
    table(
      [
        'Ref',
        'Name',
        'Class',
        'Kind',
        'Model',
        'Catalogue',
        'Owners',
        'Parts',
        'Front',
        'Findings',
      ],
      a.targets.map((t) => [
        el('a', { href: lookLink(a.room, t.ref) }, t.ref),
        t.name ?? '',
        t.class,
        t.kind ?? '',
        t.model ?? '',
        t.catalogue,
        String(t.owners),
        t.parts.length
          ? `${t.parts.length}: ${t.parts.slice(0, 4).join(', ')}${t.parts.length > 4 ? '…' : ''}`
          : '',
        frontText(t),
        el(
          'span',
          { className: t.findings.length ? 'bad' : '' },
          t.findings.join(', '),
        ),
      ]),
      [6],
    ),
  );
}

interface Report {
  written?: string;
  rooms: (RoomSummary & { error?: string })[];
}

/** Every room's summary, from the committed report or a fresh run. */
function drawSummary(root: HTMLElement, report: Report, note: string) {
  const rows = report.rooms;
  const t = totalsOf(rows.filter((r) => r.counts));
  const body = el('div');
  body.append(
    el('p', { className: 'note' }, note),
    el(
      'div',
      { className: 'counts' },
      count('rooms', rows.length),
      count('passing', t.passing),
      count('not audited', rows.filter((r) => r.error).length, true),
      count('targets', t.targets),
      count('unlabelled', t.unlabelled, true),
      count('unreachable', t.unreachable, true),
      count('unverified missing', t.unverified, true),
      count('duplicate tags', t.duplicateTags, true),
      count('bad fronts', t.badFronts, true),
    ),
    table(
      [
        'Room',
        'Targets',
        'Unlabelled',
        'Unreachable',
        'Unverified',
        'Dup. tags',
        'Bad fronts',
        'Failing',
      ],
      rows.map((r) =>
        r.counts
          ? [
              roomLink(r.room),
              String(r.counts.targets),
              String(r.counts.unlabelled),
              String(r.counts.unreachable),
              String(r.counts.unverified),
              String(r.counts.duplicateTags),
              String(r.counts.badFronts),
              el(
                'span',
                { className: r.failing ? 'bad' : 'ok' },
                String(r.failing),
              ),
            ]
          : [
              roomLink(r.room),
              el(
                'span',
                { className: 'bad' },
                `not audited: ${r.error ?? '?'}`,
              ),
              '',
              '',
              '',
              '',
              '',
              '',
            ],
      ),
      [1, 2, 3, 4, 5, 6, 7],
    ),
  );
  root.replaceChildren(body);
}

export async function runLookAuditPage(root: HTMLElement) {
  document.title = 'Look audit';
  root.replaceChildren(el('style', {}, STYLE));
  const page = el('div', { className: 'la' });
  root.append(page);
  const asked = new URLSearchParams(location.search).get('room');
  const room =
    asked && asked !== 'all' ? (resolveRoomId(asked) ?? asked) : null;
  if (room) {
    page.append(
      el('h1', {}, `Look audit · ${room}`),
      el(
        'p',
        {},
        el('a', { href: '?bench=lookables' }, 'All rooms'),
        ' · mission 127',
      ),
    );
    const status = el('p', { className: 'note' }, 'Building the room…');
    const host = el('div');
    page.append(status, host);
    try {
      const audit = await auditInFrame(host, room);
      status.remove();
      drawRoom(page, audit);
      (window as unknown as { __lookAudit: unknown }).__lookAudit = audit;
    } catch (error) {
      status.textContent = `${room} could not be audited: ${String(error)}`;
      status.className = 'bad';
    }
    return;
  }
  page.append(el('h1', {}, 'Look audit · every room'));
  const run = el('button', { type: 'button' }, 'Audit every room now');
  const host = el('div');
  const summary = el('div');
  page.append(
    el(
      'p',
      {},
      'Mission 127. Each room is built by the game and scanned once. ',
      run,
    ),
    host,
    summary,
  );
  const report: Report = await fetch('./doc/look-audit.json')
    .then((r) => (r.ok ? (r.json() as Promise<Report>) : { rooms: [] }))
    .catch(() => ({ rooms: [] }));
  drawSummary(
    summary,
    report,
    report.written
      ? `From the committed report (doc/look-audit.json, ${report.written}).`
      : 'No committed report yet: audit every room.',
  );
  run.addEventListener('click', async () => {
    run.disabled = true;
    const fresh: Report = { rooms: [] };
    for (const [i, r] of ROOMS.entries()) {
      run.textContent = `Auditing ${r} (${i + 1} of ${ROOMS.length})…`;
      try {
        fresh.rooms.push(summaryOf(await auditInFrame(host, r)));
      } catch (error) {
        fresh.rooms.push({ room: r, error: String(error) } as RoomSummary);
      }
      drawSummary(
        summary,
        fresh,
        `This run, ${i + 1} of ${ROOMS.length} rooms.`,
      );
    }
    run.textContent = 'Audit every room now';
    run.disabled = false;
  });
}
