import { kindAudit } from '../logic/audit-export/audit-export';
import { kindDataSection } from './audit-data-section';
import type { Object3D } from 'three';
import { Group } from 'three';
import { brandById } from '../../components/core/logic/brands';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import {
  kindControls,
  objectDescriptors,
} from '../../../game/descriptors/registry';
import { plantInventory } from '../../../game/plant/equipment-catalogue';
import { DEV_ROOM_NAMES, ROOMS } from '../logic/dev-room-links';
import { kindCatalogue } from '../logic/kind-catalogue';
import type { CatalogueCopy, KindEntry } from '../logic/kind-catalogue';
import {
  deprecationOf,
  groupPlacements,
  itemAuditLink,
  magicPageLink,
  magicRoomLink,
  scanMatches,
  uncountedRooms,
} from '../logic/item-audit';
import type { Placements, ScannedThing } from '../logic/item-audit';
import { auditLink, lookLink } from '../logic/look-catalogue';
import { magicPage } from '../logic/magic-page';
import { objectDetailLink } from '../logic/object-detail';
import { auditNetwork } from '../logic/room-audit';
import { simGraph } from '../logic/sim-graph/index';
import { loadExhibits } from './catalogue-panel';
import { auditInFrame, el, table } from './look-audit-page';
import { adapterFor } from './magic-adapters';
import type { MagicAdapter } from './magic-adapters';

/**
 * The item audit page (mission 130, `bench.html?bench=item-audit&kind=<kind>`):
 * one kind of game object, from data: what it is, its parts, its states
 * (its adapter's curated looks and pages, 131's presets and controls),
 * every placement grouped by room with look links (125) and room-audit
 * rows (129), the rooms not counted from data (each scannable on demand
 * by 127's adapter), the dev rooms that hold it, and its magic room or
 * magic page. Nothing is scanned until asked. Also the magic page,
 * `bench.html?bench=magic-page&kind=<kind>`.
 */

const STYLE = `
.ia { max-width: 1200px; margin: 0 auto; padding: 0 16px 48px; }
.ia h1 { font-size: 20px; } .ia h2 { font-size: 16px; margin-top: 24px; }
.ia h3 { font-size: 14px; margin: 16px 0 4px; }
.ia table { border-collapse: collapse; width: 100%; font-size: 13px; }
.ia th, .ia td { border-bottom: 1px solid #3a3d42; padding: 4px 6px; text-align: left; vertical-align: top; }
.ia td.n, .ia th.n { text-align: right; font-variant-numeric: tabular-nums; }
.ia a { color: #9fc6ff; } .ia .note { color: #a8a291; } .ia .bad { color: #ff9b8a; }
.ia .scroll { overflow-x: auto; }
.ia iframe { width: 480px; max-width: 100%; aspect-ratio: 16 / 9; border: 1px solid #3a3d42; }
.ia button { min-height: 32px; margin: 2px 6px 2px 0; }
.ia .tag { font-size: 11px; padding: 0 4px; border-radius: 3px; background: #33373d; margin-left: 4px; }
.ia ul { padding-left: 18px; }
`;

/** What a section added by a later mission is given. */
export interface ItemAuditContext {
  kind: KindEntry;
  adapter?: MagicAdapter;
  placements: Placements;
}

/**
 * Sections later missions add (133's CAD views, 135's HIGH/LOW poly and
 * visual cost): each drawn after the built-in sections, or near the top
 * (before the first heading) when its `dataset.auditPlace` is `top`, or
 * left out when it returns null.
 */
export const ITEM_AUDIT_SECTIONS: ((
  ctx: ItemAuditContext,
) => HTMLElement | null)[] = [];

const roomName = (room: string) =>
  (DEV_ROOM_NAMES as Record<string, string | undefined>)[room] ?? room;
const benchHref = (href: string) => href.replace(/^bench\.html/, '');
const roomAuditRow = (room: string, ref: string) =>
  `${benchHref(auditLink(room))}#${encodeURIComponent(`row-${ref}`)}`;

/** The kind, with the dev rooms' exhibits counted as the catalogue counts them. */
async function kindOf(key: string) {
  const input = await loadExhibits().catch(() => ({}));
  const kinds = kindCatalogue(input);
  return { kinds, kind: kinds.find((k) => k.key === key) };
}

/** The named parts of the item as built (its worked parts' nearest names); unnamed ones flagged. */
function builtParts(adapter: MagicAdapter) {
  const kit = createPanelKit();
  const built = adapter.build(kit);
  const out: { name: string; named: boolean }[] = [];
  for (const o of built.parts?.uses.keys() ?? []) {
    let at: Object3D | null = o;
    while (at && !at.name) at = at.parent;
    out.push(
      at && at !== built.object
        ? { name: at.name, named: true }
        : { name: '(unnamed part)', named: false },
    );
  }
  built.parts?.dispose();
  built.dispose?.();
  const root = new Group();
  root.add(built.object);
  disposeKit(kit, root);
  return [...new Map(out.map((p) => [p.name, p])).values()];
}

function copyRow(c: CatalogueCopy) {
  const lookable = c.look !== 'none' && !!c.room;
  return [
    lookable ? el('a', { href: `./${lookLink(c.room, c.ref)}` }, c.ref) : c.ref,
    c.name,
    c.tag ?? '',
    c.assetId ?? '',
    c.look,
    c.room ? el('a', { href: roomAuditRow(c.room, c.ref) }, 'audit row') : '',
    c.findings.join(', '),
  ];
}

function placementsSection(page: HTMLElement, p: Placements) {
  page.append(
    el('h2', {}, 'Its placements'),
    el(
      'p',
      {},
      `${p.count} counted in ${p.rooms.length} rooms: ${p.outsideDev} outside dev rooms, ${p.inDev} in them (as the catalogue counts, 126). The room-audit row is the copy’s row in that room’s audit (129), where 127's scan marks it.`,
    ),
  );
  for (const r of p.rooms) {
    page.append(
      el(
        'h3',
        {},
        el(
          'a',
          { href: `./?room=${encodeURIComponent(r.room)}` },
          roomName(r.room),
        ),
        ` ×${r.copies.length}`,
        r.dev ? el('span', { className: 'tag' }, 'dev') : '',
        ' · ',
        el('a', { href: benchHref(auditLink(r.room)) }, 'room audit'),
      ),
      table(
        [
          'Ref (look link)',
          'Name',
          'Tag',
          'Asset id',
          'Look',
          'Room audit',
          'Findings',
        ],
        r.copies.map(copyRow),
      ),
    );
  }
}

/** The rooms not counted from data, each scannable on demand by 127's adapter. */
function uncountedSection(
  page: HTMLElement,
  kind: KindEntry,
  adapter: MagicAdapter | undefined,
  counted: Iterable<string>,
) {
  const rooms = uncountedRooms(ROOMS, counted);
  const first = (adapter?.devRooms ?? []).map((d) => d.room);
  const ordered = [
    ...first.filter((r) => rooms.includes(r as (typeof ROOMS)[number])),
    ...rooms.filter((r) => !first.includes(r)),
  ];
  const names = [kind.word, adapter?.title ?? ''];
  const out = el('div');
  const host = el('div');
  const scan = async (room: string, button: HTMLButtonElement) => {
    button.disabled = true;
    button.textContent = `Scanning ${room}…`;
    try {
      const audit = await auditInFrame(host, room);
      const found = scanMatches(
        audit.targets as ScannedThing[],
        kind.key,
        names,
      );
      button.textContent = `${room}: ${found.length} found`;
      if (found.length)
        out.append(
          el(
            'h3',
            {},
            `${roomName(room)} ×${found.length} (scanned, not counted from data)`,
          ),
          table(
            ['Ref (look link)', 'Name', 'Tag', 'Asset id', 'Room audit'],
            found.map((t) => [
              el('a', { href: `./${lookLink(room, t.ref)}` }, t.ref),
              t.name ?? '',
              t.tag ?? '',
              t.assetId ?? '',
              el('a', { href: roomAuditRow(room, t.ref) }, 'audit row'),
            ]),
          ),
        );
    } catch (error) {
      button.textContent = `${room}: ${String(error)}`;
      button.className = 'bad';
    }
  };
  const details = el(
    'details',
    {},
    el(
      'summary',
      {},
      `${ordered.length} rooms not counted from data (named, not counted until 127's coverage is in data): scan one to find its copies there`,
    ),
  );
  for (const room of ordered) {
    const b = el('button', { type: 'button' }, `Scan ${room}`);
    b.addEventListener('click', () => void scan(room, b));
    details.append(b);
  }
  page.append(
    el('h2', {}, 'Rooms not counted from data'),
    ...(first.length
      ? [
          el(
            'p',
            {},
            'Known to hold it: ',
            ...(adapter?.devRooms ?? []).flatMap((d, i) => [
              i ? ', ' : '',
              el(
                'a',
                { href: `./?room=${encodeURIComponent(d.room)}` },
                d.room,
              ),
              ` (${d.words})`,
            ]),
            '.',
          ),
        ]
      : []),
    details,
    out,
    host,
  );
}

export async function runItemAuditPage(root: HTMLElement) {
  document.title = 'Item audit';
  root.replaceChildren(el('style', {}, STYLE));
  const page = el('div', { className: 'ia' });
  root.append(page);
  const key = new URLSearchParams(location.search).get('kind') ?? '';
  const status = el('p', { className: 'note' }, 'Counting…');
  page.append(el('h1', {}, `Item audit · ${key || '(no kind)'}`), status);
  const { kinds, kind } = await kindOf(key);
  if (!kind) {
    status.textContent = `No kind '${key}' in the catalogue. Name one: ?bench=item-audit&kind=weather-station, or use a kind’s Item audit link in the catalogue (?dev, Game objects).`;
    return;
  }
  status.remove();
  document.title = `Item audit · ${kind.word}`;
  const adapter = adapterFor(kind.key);
  const deprecated = deprecationOf(kind.key);
  const placements = groupPlacements(kind.copies);
  page.append(
    el(
      'p',
      {},
      adapter
        ? el(
            'a',
            { href: benchHref(magicRoomLink(kind.key)) },
            'Its magic room',
          )
        : el(
            'a',
            { href: benchHref(magicPageLink(kind.key)) },
            'Its magic page',
          ),
      ' · ',
      el('a', { href: './?dev' }, 'The catalogue'),
      ' · mission 130',
    ),
  );

  // Mission 167: the kind's audit from data, the same as audit/kind/<kind>.json.
  const data = kindAudit(kind.key, { kinds });
  (window as unknown as { __itemAuditData: unknown }).__itemAuditData = data;
  page.append(kindDataSection(data));

  // What it is.
  const maker = kind.maker ? (brandById(kind.maker)?.name ?? kind.maker) : '';
  page.append(
    el('h2', {}, 'What it is'),
    table(
      ['', ''],
      [
        ['Kind', `${kind.word} (${kind.key})`],
        ['Class', kind.class],
        ['Maker', maker || 'none recorded'],
        ['Modelled after', adapter?.reference ?? 'no model exhibit'],
        ['Purpose', kind.purpose],
        ['In the register', kind.registered ? 'yes' : 'no'],
        [
          'Deprecated',
          deprecated
            ? el(
                'span',
                { className: 'bad' },
                `yes: ${deprecated.reason}; replace with ${deprecated.replacement}`,
              )
            : 'no',
        ],
        [
          '3D form',
          adapter
            ? `yes: a magic room (${adapter.source === 'explicit' ? 'its own adapter' : adapter.source === 'model' ? 'from its model exhibit' : adapter.source === 'layout' ? 'built by the rooms’ own item builder' : 'from its standalone builder'}), ${adapter.size.w} × ${adapter.size.d} × ${adapter.size.h} m, ${adapter.size.mount}`
            : 'none the magic room can build: a magic page',
        ],
      ],
    ),
  );

  // Its parts: the catalogue's (copies nesting under its copies' tags) and the built item's.
  const tags = new Set(kind.copies.flatMap((c) => (c.tag ? [c.tag] : [])));
  const nested = kinds
    .flatMap((k) => k.copies)
    .filter((c) => c.parent && tags.has(c.parent));
  page.append(el('h2', {}, 'Its parts'));
  if (adapter) {
    const parts = builtParts(adapter);
    page.append(
      el('p', {}, 'Worked parts of the item as its builder makes it:'),
      parts.length
        ? table(
            ['Part', 'Named'],
            parts.map((p) => [
              p.name,
              p.named ? 'yes' : el('span', { className: 'bad' }, 'unnamed'),
            ]),
          )
        : el('p', { className: 'note' }, 'None it can be worked by.'),
    );
  }
  page.append(
    nested.length
      ? table(
          ['Part (catalogue)', 'Kind', 'Of', 'Room'],
          nested.map((c) => [c.tag ?? c.ref, c.kind, c.parent ?? '', c.room]),
        )
      : el(
          'p',
          { className: 'note' },
          'No catalogue part nests under its copies’ tags. A part named only in its view is listed above where it has an adapter; 127’s shared part inventory is not in data yet (incomplete).',
        ),
  );

  // Its main states.
  page.append(el('h2', {}, 'Its main states'));
  const choices = [
    ...(adapter?.looks ?? []).map((l) => ['look', l.label, l.words]),
    ...(adapter?.pages ?? []).map((p) => ['page', p.label, p.words]),
  ];
  page.append(
    choices.length
      ? table(['Knob', 'Position', 'Shows'], choices)
      : el(
          'p',
          { className: 'note' },
          'No curated looks yet (incomplete): its adapter gives none.',
        ),
  );
  const presets = objectDescriptors().filter((d) => d.kind === kind.key);
  const controls = kindControls(kind.key);
  if (presets.length || controls.length)
    page.append(
      el('p', {}, 'From its control descriptors (131):'),
      table(
        ['Object', 'Presets', 'Controls'],
        presets.map((d) => [
          `${d.ref} (${d.room})`,
          d.presets.map((p) => p.label).join(', '),
          d.controls
            .map((c) => `${c.label} (${c.inputs.join('/')})`)
            .join(', '),
        ]),
      ),
    );
  else
    page.append(
      el(
        'p',
        { className: 'note' },
        'No control descriptor describes it yet (131).',
      ),
    );

  // Its placements, and the rooms not counted from data.
  placementsSection(page, placements);
  uncountedSection(
    page,
    kind,
    adapter,
    kinds.flatMap((k) => k.copies.map((c) => c.room)),
  );

  // The dev rooms that hold it working: where it is worked fully.
  const devRooms = [
    ...new Set([
      ...placements.rooms.filter((r) => r.dev).map((r) => r.room),
      ...(adapter?.devRooms ?? []).map((d) => d.room),
    ]),
  ];
  page.append(
    el('h2', {}, 'Worked fully in'),
    devRooms.length
      ? el(
          'p',
          {},
          ...devRooms.flatMap((r, i) => [
            i ? ', ' : '',
            el('a', { href: `./?room=${encodeURIComponent(r)}` }, roomName(r)),
          ]),
        )
      : el('p', { className: 'note' }, 'No dev room is known to hold it.'),
  );

  const ctx: ItemAuditContext = {
    kind,
    ...(adapter ? { adapter } : {}),
    placements,
  };
  for (const section of ITEM_AUDIT_SECTIONS) {
    const drawn = section(ctx);
    if (!drawn) continue;
    const first = page.querySelector('h2');
    if (drawn.dataset.auditPlace === 'top' && first) first.before(drawn);
    else page.append(drawn);
  }
  (window as unknown as { __itemAudit: unknown }).__itemAudit = {
    kind: kind.key,
    adapter: adapter?.source ?? null,
    placements: placements.rooms.map((r) => ({
      room: r.room,
      count: r.copies.length,
    })),
  };
}

/** The magic page: a kind with no 3D form, in words, from the model and 131's descriptors. */
export async function runMagicPage(root: HTMLElement) {
  document.title = 'Magic page';
  root.replaceChildren(el('style', {}, STYLE));
  const page = el('div', { className: 'ia' });
  root.append(page);
  const key = new URLSearchParams(location.search).get('kind') ?? '';
  const { kind } = await kindOf(key);
  if (!kind) {
    page.append(
      el('h1', {}, `Magic page · ${key}`),
      el('p', {}, `No kind '${key}' in the catalogue.`),
    );
    return;
  }
  const written = magicPage(kind, {
    inventory: plantInventory(),
    descriptors: objectDescriptors(),
    network: auditNetwork,
    graph: simGraph(),
  });
  document.title = `Magic page · ${kind.word}`;
  page.append(
    el('h1', {}, written.title),
    el(
      'p',
      {},
      el('a', { href: benchHref(itemAuditLink(kind.key)) }, 'Its item audit'),
      ' · ',
      el('a', { href: './?dev' }, 'The catalogue'),
      ' · ',
      adapterFor(kind.key)
        ? el(
            'a',
            { href: benchHref(magicRoomLink(kind.key)) },
            'Its magic room',
          )
        : kind.copies.some((copy) => copy.look !== 'none')
          ? 'Installed 3D copies exist; no isolated magic-room builder is registered.'
          : 'No 3D form of its own: written from the model and its descriptors (mission 130).',
    ),
    ...(kind.copies.some((copy) => copy.look !== 'none')
      ? [
          el('h2', {}, 'Installed instances'),
          el(
            'ul',
            {},
            ...kind.copies
              .filter((copy) => copy.room)
              .map((copy) =>
                el(
                  'li',
                  {},
                  el(
                    'a',
                    {
                      href: benchHref(objectDetailLink(copy.room, copy.ref)),
                    },
                    `${copy.ref} · ${copy.room}`,
                  ),
                ),
              ),
          ),
        ]
      : []),
    ...written.sections.flatMap((s) => [
      el('h2', {}, s.heading),
      el('ul', {}, ...s.lines.map((l) => el('li', {}, l))),
    ]),
  );
  (window as unknown as { __magicPage: unknown }).__magicPage = written;
}
