import { brandById } from '../../components/core/logic/brands';
import { newWorld } from '../../../game/world';
import { ROOM_NAMES } from '../../../game/plant/room-names';
import { kindCatalogue } from '../logic/kind-catalogue';
import { lookCatalogue, lookLink } from '../logic/look-catalogue';
import type { LookEntry } from '../logic/look-catalogue';
import { runAnchor, resolveRef, viaText } from '../logic/sim-graph/graph';
import type { ConnectorRun, NodeId } from '../logic/sim-graph/graph';
import { simGraph } from '../logic/sim-graph/index';
import { markScanned, roomCoverage } from '../logic/sim-graph/coverage';
import { SIM_FLAGS, SIM_FLAG_WORDS } from '../logic/sim-graph/flags';
import {
  auditRowLink,
  nodeLink,
  nodePage,
  simList,
} from '../logic/sim-graph/node-page';
import type { NodePage, PortRow } from '../logic/sim-graph/node-page';
import { CONTROL_ROOM_MODE } from '../logic/sim-graph/sources/leaves';
import { auditInFrame, el, table } from './look-audit-page';

/**
 * The simulation graph's pages (mission 138, `doc/plans/138-simulation-graph-audit.md`):
 * `bench.html?bench=sim-node&node=<id>`, one node's seven sections;
 * `bench.html?bench=sim-graph`, the searchable list (by room, domain,
 * tier, flag); `bench.html?bench=sim-object&room=<room>&ref=<ref>`, an
 * architectural object's page, not simulated. The simulation's own view, a
 * development tool: the no-peeking rule does not apply. Nothing runs idle.
 */

const STYLE = `
.sg { max-width: 1200px; margin: 0 auto; padding: 0 16px 48px; }
.sg h1 { font-size: 20px; } .sg h2 { font-size: 16px; margin-top: 24px; border-top: 1px solid #3a3d42; padding-top: 12px; }
.sg h3 { font-size: 14px; margin: 12px 0 4px; }
.sg table { border-collapse: collapse; width: 100%; font-size: 13px; }
.sg th, .sg td { border-bottom: 1px solid #3a3d42; padding: 4px 6px; text-align: left; vertical-align: top; }
.sg a { color: #9fc6ff; } .sg .note { color: #a8a291; } .sg .bad { color: #ff9b8a; } .sg .soft { color: #d8c27a; } .sg .ok { color: #9be39b; }
.sg .scroll { overflow-x: auto; } .sg ul { margin: 0; padding-left: 16px; }
.sg dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; font-size: 13px; }
.sg dt { color: #a8a291; } .sg dd { margin: 0; }
.sg section:target, .sg div:target { background: #2d3a2d; }
.sg .run { margin: 6px 0; padding: 6px 8px; background: #23262b; border-radius: 4px; font-size: 13px; }
.sg .pieces { display: none; } .sg.show-connectors .pieces { display: block; }
.sg label { display: inline-flex; gap: 6px; align-items: center; min-height: 40px; margin-right: 12px; }
.sg input[type=search], .sg select { min-height: 32px; }
`;

const page = (root: HTMLElement, title: string) => {
  document.title = title;
  root.replaceChildren(el('style', {}, STYLE));
  const p = el('div', { className: 'sg' });
  root.append(p);
  return p;
};
const a = (href: string, text: string) => el('a', { href }, text);
const nodeA = (id: NodeId, text?: string) =>
  a(nodeLink(id), text ?? simGraph().nodes.get(id)?.name ?? id);
const ul = (items: (Node | string)[]) =>
  items.length
    ? el('ul', {}, ...items.map((i) => el('li', {}, i)))
    : el('p', { className: 'note' }, 'none');
const dl = (pairs: [string, Node | string][]) =>
  el(
    'dl',
    {},
    ...pairs.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]),
  );
const portText = (p: string | null) => p ?? 'no port in the model';

let catalogue: LookEntry[] | undefined;
let makers: Map<string, string> | undefined;
function data() {
  if (!catalogue) {
    const kinds = kindCatalogue();
    catalogue = lookCatalogue(undefined, kinds);
    makers = new Map(
      kinds.flatMap((k) =>
        k.maker ? [[k.key, brandById(k.maker).name] as const] : [],
      ),
    );
  }
  return { catalogue, makerOf: (k: string) => makers!.get(k) };
}

/** A connector ref's targets, each linked (never one picked). */
function refTargets(room: string, ref: string): Node {
  const t = resolveRef(room, ref);
  if (!t.length)
    return el('span', { className: 'note' }, `${ref} (not in the model)`);
  return el(
    'span',
    {},
    ...t.flatMap((x, i) => [
      i ? ' · ' : '',
      a(
        nodeLink(x.page, x.anchor),
        t.length > 1 ? `run ${i} → ${x.label}` : x.label,
      ),
    ]),
  );
}

function runBlock(run: ConnectorRun, far: Node) {
  const pieces = run.pieces.map((p) => {
    const entry = catalogue?.find((e) => e.room === run.room && e.model === p);
    return el(
      'li',
      {},
      p,
      entry
        ? el(
            'span',
            {},
            ' · ',
            a(auditRowLink(run.room, entry.ref), `row ${entry.ref}`),
          )
        : el('span', { className: 'note' }, ' · not drawn'),
    );
  });
  return el(
    'div',
    { className: 'run', id: runAnchor(run) },
    el('b', {}, run.id),
    ` · ${run.medium} · ${run.from.ref}:${run.from.port} → ${run.to.ref}:${run.to.port} · far side: `,
    far,
    run.justified
      ? ''
      : el(
          'span',
          { className: 'bad' },
          ' · unjustified: joins no two active nodes',
        ),
    el('ul', { className: 'pieces' }, ...pieces),
  );
}

const portRow = (p: PortRow): (Node | string)[] => [
  portText(p.port),
  p.direction,
  p.medium ?? '—',
  p.edge,
  el(
    'span',
    {},
    nodeA(p.far, p.farName),
    el('span', { className: 'note' }, ` · ${portText(p.farPort)}`),
  ),
  p.run ? a(`#${encodeURIComponent(runAnchor(p.run))}`, 'run') : '',
  el('span', { className: 'note' }, p.via),
];

function drawPage(root: HTMLElement, p: NodePage) {
  const g = simGraph();
  const sw = document.createElement('input');
  sw.type = 'checkbox';
  sw.addEventListener('change', () =>
    root.classList.toggle('show-connectors', sw.checked),
  );
  const flagWord = (v: string) =>
    el(
      'span',
      { className: v === 'yes' ? 'bad' : v === 'no' ? 'ok' : 'soft' },
      v,
    );
  const w = p.what;
  const parts: (Node | string)[] = [
    el('h1', {}, `${w.name}`),
    el(
      'p',
      { className: 'note' },
      p.id,
      ' · mission 138 · ',
      a('?bench=sim-graph', 'every node'),
    ),
    el('h2', {}, '1. What is it'),
    dl([
      ['path', p.id],
      ['domain', w.domain.join(', ') || '—'],
      ['kind', `${w.kind} (${w.tier})`],
      ['room', `${w.roomName} (${w.room})`],
      ['tag', w.tag ?? '—'],
      ['description', w.description ?? '—'],
      ['maker', w.maker ?? '—'],
      ['part of', w.parent ? nodeA(w.parent) : '—'],
      ['members', w.members.length ? ul(w.members.map((m) => nodeA(m))) : '—'],
    ]),
    el('h2', {}, '2. How does it connect'),
    el('label', {}, sw, 'Show connectors'),
    table(
      ['port', 'dir', 'medium', 'edge', 'far side', '', 'via'],
      p.connect.ports.map(portRow),
    ),
    el('h3', {}, 'Connector runs'),
    ...(p.connect.runs.length
      ? p.connect.runs.map((r) =>
          runBlock(
            r.run,
            el(
              'span',
              {},
              r.far.node
                ? nodeA(r.far.node, r.far.name)
                : `${r.far.name} (${r.far.end})`,
              ...(r.across.length
                ? [
                    ' → across the boundary: ',
                    ...r.across.flatMap((x, i) => [i ? ', ' : '', nodeA(x)]),
                  ]
                : r.far.end === 'boundary'
                  ? [
                      el(
                        'span',
                        { className: 'note' },
                        ' · its other end not found in the code (dangling)',
                      ),
                    ]
                  : []),
            ),
          ),
        )
      : [el('p', { className: 'note' }, 'none in its room’s network')]),
    el('h2', {}, '3. What state does it hold'),
    p.state.adapter
      ? table(
          [
            'field',
            'where',
            'type',
            'values',
            'normal',
            'fresh world',
            'saved',
          ],
          p.state.fields.map((f) => [
            f.name,
            f.path,
            f.type + (f.unit ? `, ${f.unit}` : ''),
            (f.values ?? []).join(' · '),
            f.normal ?? '—',
            JSON.stringify(f.value),
            f.saved ? 'yes' : 'no (derived)',
          ]),
        )
      : el('p', { className: 'bad' }, 'state not found in the world'),
    el('h2', {}, '4. What makes it change'),
    p.change.declared
      ? el(
          'div',
          {},
          ul(
            p.change.drivers.map((d) =>
              el(
                'span',
                {},
                `${d.what} · ${d.how} `,
                el('span', { className: 'note' }, d.viaText),
              ),
            ),
          ),
          el('h3', {}, 'Faults and trips'),
          ul([...p.change.faults]),
          el(
            'h3',
            {},
            `Event lines (${p.change.eventSource ?? '—'}, a sample)`,
          ),
          p.change.note ? el('p', { className: 'note' }, p.change.note) : '',
          ul(p.change.events.map((e) => `${e.subject}: ${e.text}`)),
        )
      : el(
          'p',
          { className: 'note' },
          'drivers not yet declared for this node',
        ),
    el('h2', {}, '5. What is it related to'),
    el('h3', {}, 'Upstream'),
    ul(
      p.related.upstream.map((u) =>
        el(
          'span',
          {},
          nodeA(u.far, u.farName),
          ` · ${u.edge} · ${u.medium ?? 'alarm'}`,
        ),
      ),
    ),
    el('h3', {}, 'Downstream'),
    ul(
      p.related.downstream.map((u) =>
        el(
          'span',
          {},
          nodeA(u.far, u.farName),
          ` · ${u.edge} · ${u.medium ?? 'alarm'}`,
        ),
      ),
    ),
    el('h3', {}, 'Controls acting on it'),
    ul(
      p.related.controls.map((c) =>
        el(
          'span',
          {},
          a(auditRowLink(c.room, c.ref.replace(/\/[^/]*$/, '')), c.ref),
          ` ${c.label} · ${c.room} `,
          el('span', { className: 'note' }, c.via),
        ),
      ),
    ),
    ...(p.what.parent
      ? [
          el('h3', {}, 'Acting on its parent'),
          ul(
            p.related.parentControls.map((c) =>
              el(
                'span',
                {},
                a(auditRowLink(c.room, c.ref.replace(/\/[^/]*$/, '')), c.ref),
                ` ${c.label} · ${c.room}`,
              ),
            ),
          ),
        ]
      : []),
    el('h3', {}, 'Readings reading it'),
    ul(
      p.related.readings.map((r) =>
        el(
          'span',
          {},
          a(auditRowLink(r.room, r.ref), `${r.ref}/${r.label}`),
          ` · ${r.room}`,
        ),
      ),
    ),
    el('h3', {}, 'Board copies'),
    ul(
      p.related.copies.map((c) =>
        el(
          'span',
          {},
          `${c.role === 'copy' ? 'copied by ' : 'copy of '}`,
          nodeA(c.other),
        ),
      ),
    ),
    el('h3', {}, 'Alarms it can raise, and on which annunciators'),
    p.related.alarms.length
      ? ul(
          p.related.alarms.map((x) =>
            el(
              'span',
              {},
              nodeA(x.alarm),
              ` · on ${x.boards.map((b) => `${b.ref} (${b.room})`).join(', ')}`,
              x.both
                ? ''
                : el(
                    'span',
                    { className: 'bad' },
                    ' · not on both control rooms',
                  ),
            ),
          ),
        )
      : el(
          'p',
          { className: 'note' },
          p.related.alarmsDeclared
            ? 'none'
            : 'no alarm sources declared for it yet (unknown)',
        ),
    el('h2', {}, '6. Where does it appear in the world'),
    dl([
      ['home', p.world.home ?? '— (world-wide)'],
      ['shown in', p.world.shownIn.join(', ') || '—'],
      [
        'unknown in',
        p.world.unknownIn
          .map((r) => `${r} (${Object.values(roomCoverage(r)).join(', ')})`)
          .join('; ') || '—',
      ],
      ['touches', p.world.touches.join(', ') || '—'],
      ['player can see it', p.world.canSee],
      ['player can act on it', p.world.canAct ? 'yes' : 'no'],
    ]),
    table(
      ['room', 'object (its audit row)', 'why'],
      p.world.representations.map((r) => [
        ROOM_NAMES[r.room] ?? r.room,
        a(r.link, `${r.ref} · ${r.name}`),
        r.why,
      ]),
    ),
    scanButtons(root, p),
    el('h2', {}, '7. Is anything wrong with it'),
    table(
      ['flag', 'value'],
      SIM_FLAGS.map((f) => [SIM_FLAG_WORDS[f], flagWord(p.flags[f])]),
    ),
  ];
  root.append(...parts);
  void g;
}

/** 127's scanner, one room on demand, for bindings known only from a scene. */
function scanButtons(root: HTMLElement, p: NodePage) {
  const box = el('div', {});
  for (const room of p.world.unknownIn) {
    const b = el('button', { type: 'button' }, `Scan ${room}`);
    b.addEventListener('click', async () => {
      b.disabled = true;
      b.textContent = `Scanning ${room}…`;
      try {
        const audit = await auditInFrame(el('div'), room);
        markScanned(room);
        const ref = p.id.slice(p.id.indexOf('/') + 1);
        for (const t of audit.targets)
          if (room === p.node.room && t.model === ref)
            catalogue!.push({
              room,
              ref: t.ref,
              title: t.name ?? t.ref,
              kind: t.kind ?? '',
              kindWord: '',
              model: t.model,
              aliases: [],
              parts: [],
              modes: [],
              look: 'expected',
              findings: [],
            });
        root.replaceChildren(el('style', {}, STYLE));
        const again = nodePage(simGraph(), p.id, {
          world: newWorld(),
          ...data(),
        });
        if (again) drawPage(root, again);
      } catch (error) {
        b.textContent = `${room}: ${String(error)}`;
      }
    });
    box.append(b);
  }
  return box;
}

export function runSimNodePage(root: HTMLElement) {
  const id = new URLSearchParams(location.search).get('node') ?? '';
  const p = page(root, 'Simulation node');
  const built = nodePage(simGraph(), id, { world: newWorld(), ...data() });
  if (!built) {
    p.append(
      el('h1', {}, 'Simulation node'),
      el('p', { className: 'bad' }, `No node ${id || '(none named)'}. `),
      a('?bench=sim-graph', 'Every node'),
    );
    return;
  }
  document.title = `${built.what.name} · simulation`;
  drawPage(p, built);
  (window as unknown as { __simNode: unknown }).__simNode = built;
  if (location.hash)
    document
      .getElementById(decodeURIComponent(location.hash.slice(1)))
      ?.scrollIntoView();
}

export function runSimGraphPage(root: HTMLElement) {
  const p = page(root, 'Simulation graph');
  const q = new URLSearchParams(location.search);
  const g = simGraph();
  const list = simList(g);
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'id, tag, name, kind';
  search.value = q.get('q') ?? '';
  const pick = (name: string, values: string[]) => {
    const s = document.createElement('select');
    s.setAttribute('aria-label', name);
    for (const v of ['', ...values]) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v || `any ${name}`;
      o.selected = q.get(name) === v && !!v;
      s.append(o);
    }
    return s;
  };
  const rooms = [...new Set(list.map((x) => x.node.room))].sort();
  const room = pick('room', rooms);
  const domain = pick('domain', [
    'water',
    'heat',
    'power',
    'chemical',
    'gas',
    'air',
    'oil',
    'flue',
    'signal',
  ]);
  const tier = pick('tier', ['active', 'group-one', 'group-many', 'unknown']);
  const body = el('div');
  const draw = () => {
    const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = list.filter(
      (x) =>
        (!room.value ||
          x.node.room === room.value ||
          x.touches.includes(room.value)) &&
        (!domain.value || x.media.includes(domain.value as never)) &&
        (!tier.value || x.node.tier === tier.value) &&
        words.every((w) =>
          [x.node.id, x.node.tag ?? '', x.node.name, x.node.kind]
            .join(' ')
            .toLowerCase()
            .includes(w),
        ),
    );
    body.replaceChildren(
      el(
        'p',
        { className: 'note' },
        `${rows.length} nodes; room matches home or touches`,
      ),
      table(
        ['node', 'tag', 'kind', 'tier', 'domain', 'touches'],
        rows.map((x) => [
          nodeA(x.node.id, `${x.node.name}`),
          x.node.tag ?? '',
          x.node.kind,
          x.node.tier,
          x.media.join(', '),
          x.touches.join(', '),
        ]),
      ),
    );
  };
  for (const c of [search, room, domain, tier])
    c.addEventListener('input', draw);
  p.append(
    el('h1', {}, 'Simulation graph'),
    el(
      'p',
      { className: 'note' },
      'Every node with a page, from data (mission 138). No counts are recorded.',
    ),
    el('div', {}, search, room, domain, tier),
    body,
  );
  draw();
}

const isControlRoomDoor = (ref: string, name?: string) =>
  /door/i.test(`${ref} ${name ?? ''}`) &&
  /control.?room/i.test(`${ref} ${name ?? ''}`);

export async function runSimObjectPage(root: HTMLElement) {
  const q = new URLSearchParams(location.search);
  const room = q.get('room') ?? '';
  const ref = q.get('ref') ?? '';
  const p = page(root, 'Architectural object');
  p.append(
    el('h1', {}, ref || 'Architectural object'),
    el(
      'p',
      { className: 'note' },
      `${room} · mission 138 · `,
      a('?bench=sim-graph', 'every node'),
    ),
  );
  const status = el(
    'p',
    { className: 'note' },
    'Building the room for its 127 record…',
  );
  const host = el('div');
  p.append(status, host);
  try {
    const audit = await auditInFrame(host, room);
    const t = audit.targets.find(
      (x) => x.ref.toLowerCase() === ref.toLowerCase(),
    );
    status.remove();
    if (!t) {
      p.append(
        el('p', { className: 'bad' }, `No ${ref} in ${room}'s look audit.`),
      );
      return;
    }
    p.append(
      dl([
        ['name', t.name ?? t.tag ?? t.ref],
        ['kind', t.kind ?? '—'],
        ['class', t.class],
        ['room', `${ROOM_NAMES[room] ?? room} (${room})`],
        ['its audit row (129)', a(auditRowLink(room, t.ref), t.ref)],
        ['its look', a(`./${lookLink(room, t.ref)}`, 'look link')],
        ['simulation', el('b', {}, 'not simulated: no node, no edges')],
      ]),
      ...(isControlRoomDoor(t.ref, t.name)
        ? [
            el(
              'p',
              {},
              'Where it leads is decided by the world leaf ',
              nodeA(CONTROL_ROOM_MODE),
              '.',
            ),
          ]
        : []),
    );
    (window as unknown as { __simObject: unknown }).__simObject = {
      room,
      ref: t.ref,
      class: t.class,
      simulated: false,
    };
  } catch (error) {
    status.textContent = `${room} could not be built: ${String(error)}`;
    status.className = 'bad';
  }
}

/** For a connector ref in other pages (129's model column). */
export { refTargets, viaText };
