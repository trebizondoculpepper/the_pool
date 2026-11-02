import { BRANDS, brandById } from '../../components/core/logic/brands';
import type { Brand, BrandId } from '../../components/core/logic/brands';
import {
  BRAND_SHEET_ASPECT,
  drawBrandSheet,
} from '../../components/core/views/brand-logo';
import { DEV_ROOM_NAMES } from '../logic/dev-room-links';
import {
  CLASS_WORDS,
  UNBRANDED_LINK,
  brandAudit,
  brandAuditLink,
  brandCounts,
  unbranded,
} from '../logic/brand-audit';
import type { ClassGroup } from '../logic/brand-audit';
import { itemAuditLink } from '../logic/item-audit';
import {
  FINDING_WORDS,
  isDevRoom,
  kindCatalogue,
} from '../logic/kind-catalogue';
import type { KindEntry } from '../logic/kind-catalogue';
import { loadExhibits } from './catalogue-panel';
import { el, table } from './look-audit-page';
import { adapterFor } from './magic-adapters';

/**
 * The brand audit (mission 136, `bench.html?bench=brand-audit&brand=<id>`):
 * a brand's sheet as dev8 draws it (`drawBrandSheet`, the same drawing,
 * never redrawn), its details, and every model in the game carrying it,
 * grouped by what they are, each with its copies and rooms and a link to
 * its item audit (130) and CAD views (133). Without `brand`, every brand.
 * Also the unbranded goods (`bench.html?bench=unbranded`). From data alone:
 * no scene is built.
 */

const STYLE = `
.ba { max-width: 1200px; margin: 0 auto; padding: 0 16px 48px; }
.ba h1 { font-size: 20px; } .ba h2 { font-size: 16px; margin-top: 24px; }
.ba table { border-collapse: collapse; width: 100%; font-size: 13px; }
.ba th, .ba td { border-bottom: 1px solid #3a3d42; padding: 4px 6px; text-align: left; vertical-align: top; }
.ba td.n, .ba th.n { text-align: right; font-variant-numeric: tabular-nums; }
.ba a { color: #9fc6ff; } .ba .note { color: #a8a291; } .ba .bad { color: #ff9b8a; }
.ba .scroll { overflow-x: auto; }
.ba canvas.sheet { width: 600px; max-width: 100%; border: 1px solid #3a3d42; display: block; }
.ba .empty { border: 1px dashed #a8a291; padding: 8px 12px; color: #e9e1c8; }
`;

const benchHref = (href: string) => href.replace(/^bench\.html/, '');
const roomName = (room: string) =>
  (DEV_ROOM_NAMES as Record<string, string | undefined>)[room] ?? room;

/** The kinds as the catalogue counts them, dev rooms' exhibits included. */
async function catalogue() {
  const input = await loadExhibits().catch(() => ({}));
  return kindCatalogue(input);
}

function start(root: HTMLElement, title: string) {
  document.title = title;
  root.replaceChildren(el('style', {}, STYLE));
  const page = el('div', { className: 'ba' });
  root.append(page);
  const status = el('p', { className: 'note' }, 'Counting…');
  page.append(el('h1', {}, title), status);
  return { page, status };
}

const nav = () =>
  el(
    'p',
    {},
    el('a', { href: '?bench=brand-audit' }, 'Every brand'),
    ' · ',
    el('a', { href: benchHref(UNBRANDED_LINK) }, 'Unbranded goods'),
    ' · ',
    el('a', { href: './?room=dev8' }, 'dev8 · Brands and logos'),
    ' · ',
    el('a', { href: './?dev' }, 'The catalogue'),
    ' · mission 136',
  );

/** The rooms a kind's copies are in, each linked, with its count. */
function roomsCell(rooms: readonly string[], counts: (room: string) => number) {
  const cell = el('span');
  rooms.forEach((room, i) => {
    if (i) cell.append(', ');
    cell.append(
      el(
        'a',
        { href: `./?room=${encodeURIComponent(room)}` },
        room ? roomName(room) : '(no room)',
      ),
      ` ×${counts(room)}${isDevRoom(room) ? ' (dev)' : ''}`,
    );
  });
  return rooms.length ? cell : el('span', { className: 'note' }, 'none');
}

/** A kind's links: its item audit, which opens with its CAD views where it has a 3D form. */
function kindLinks(kind: KindEntry) {
  const audit = benchHref(itemAuditLink(kind.key));
  return el(
    'span',
    {},
    el('a', { href: audit }, 'Item audit'),
    ...(adapterFor(kind.key)
      ? [' · ', el('a', { href: audit, title: 'Mission 133' }, 'CAD views')]
      : []),
  );
}

/** The brand's sheet, drawn by dev8's own drawing onto a canvas. */
function sheet(brand: Brand) {
  const canvas = el('canvas', { className: 'sheet' });
  canvas.width = 1200;
  canvas.height = Math.round(1200 / BRAND_SHEET_ASPECT);
  const ctx = canvas.getContext('2d');
  if (ctx) drawBrandSheet(ctx, brand);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${brand.name}: its mark and logotype`);
  return canvas;
}

function groupsTable<T>(
  groups: readonly ClassGroup<T>[],
  head: string[],
  row: (item: T) => (Node | string)[],
) {
  return groups.flatMap((g) => [
    el('h2', {}, `${CLASS_WORDS[g.class]} (${g.items.length})`),
    table(head, g.items.map(row), [2]),
  ]);
}

/** Every brand, with its kinds and copies, each linked to its page. */
function brandIndex(page: HTMLElement, kinds: readonly KindEntry[]) {
  page.append(
    table(
      ['Brand', 'Makes', 'Kinds', 'Copies'],
      brandCounts(BRANDS, kinds).map(({ brand, kinds: k, copies }) => [
        el('a', { href: benchHref(brandAuditLink(brand.id)) }, brand.name),
        brand.makes,
        String(k),
        copies
          ? String(copies)
          : el('span', { className: 'note' }, 'nothing placed'),
      ]),
      [2, 3],
    ),
  );
}

export async function runBrandAuditPage(root: HTMLElement) {
  const id = new URLSearchParams(location.search).get('brand') ?? '';
  const brand = id ? brandById(id as BrandId) : undefined;
  const { page, status } = start(
    root,
    brand ? `Brand audit · ${brand.name}` : 'Brand audit · every brand',
  );
  const kinds = await catalogue();
  status.remove();
  page.append(nav());
  if (!brand) {
    if (id)
      page.append(
        el('p', { className: 'bad' }, `No brand '${id}' in brands.ts.`),
      );
    brandIndex(page, kinds);
    (window as unknown as { __brandAudit: unknown }).__brandAudit = {
      brand: null,
      brands: brandCounts(BRANDS, kinds),
    };
    return;
  }
  const audit = brandAudit(brand, kinds);
  page.append(
    sheet(brand),
    table(
      ['', ''],
      [
        ['Name', brand.name],
        ['Logotype', `${brand.wordmark ?? brand.name} (${brand.type})`],
        ['Mark', brand.mark],
        ['Motto', `“${brand.tagline}”`],
        ['Promise', brand.promise],
        [
          'Founded',
          brand.defunct
            ? `${brand.founded}, defunct ${brand.defunct}`
            : String(brand.founded),
        ],
        ['Country', brand.country],
        ['Makes', brand.makes],
        ['Colours', brand.colours.join(' · ')],
      ],
    ),
  );
  page.append(
    el(
      'h2',
      {},
      `Its models in the game: ${audit.kinds} kind${audit.kinds === 1 ? '' : 's'}, ${audit.copies} cop${audit.copies === 1 ? 'y' : 'ies'}`,
    ),
  );
  if (audit.nothingPlaced)
    page.append(
      el(
        'p',
        { className: 'empty' },
        audit.kinds
          ? 'A brand in the lore with nothing placed yet: its kinds below have no copy in any counted room.'
          : 'A brand in the lore with nothing placed yet: no kind in the game carries it.',
      ),
    );
  page.append(
    ...groupsTable(
      audit.groups,
      ['Kind', 'What it is', 'Copies', 'Rooms', 'Pages'],
      (m) => [
        m.kind.key,
        m.whole ? m.kind.word : `${m.kind.word} (shared with other makers)`,
        String(m.copies.length),
        roomsCell(m.rooms, (r) => m.copies.filter((c) => c.room === r).length),
        kindLinks(m.kind),
      ],
    ),
  );
  (window as unknown as { __brandAudit: unknown }).__brandAudit = {
    brand: brand.id,
    kinds: audit.kinds,
    copies: audit.copies,
    nothingPlaced: audit.nothingPlaced,
    groups: audit.groups.map((g) => ({
      class: g.class,
      kinds: g.items.map((m) => m.kind.key),
    })),
  };
}

export async function runUnbrandedPage(root: HTMLElement) {
  const { page, status } = start(root, 'Unbranded goods');
  const kinds = await catalogue();
  status.remove();
  const u = unbranded(kinds);
  const count = (gs: readonly ClassGroup<unknown>[]) =>
    gs.reduce((n, g) => n + g.items.length, 0);
  page.append(
    nav(),
    el(
      'p',
      { className: 'note' },
      'Every kind with no maker, the kind’s or any copy’s (decoration exempt). A gap is a finding: an engineering item that should be given a maker. Confirmed generic kinds are the owner’s list (CONFIRMED_GENERIC in logic/brand-audit.ts), each with its reason.',
    ),
    el('h2', {}, `Gaps (${count(u.gaps)})`),
  );
  const row = (e: { kind: KindEntry; generic?: string }) => [
    e.kind.key,
    e.generic ??
      (e.kind.worst.includes('no-maker')
        ? el('span', { className: 'bad' }, FINDING_WORDS['no-maker'])
        : e.kind.word),
    String(e.kind.usage.count),
    roomsCell(
      e.kind.usage.rooms,
      (r) => e.kind.copies.filter((c) => c.room === r).length,
    ),
    kindLinks(e.kind),
  ];
  page.append(
    ...groupsTable(
      u.gaps,
      ['Kind', 'Finding', 'Copies', 'Rooms', 'Pages'],
      row,
    ),
    el('h2', {}, `Confirmed generic (${count(u.generic)})`),
  );
  if (!count(u.generic))
    page.append(
      el(
        'p',
        { className: 'note' },
        'None confirmed yet: the owner’s to name.',
      ),
    );
  page.append(
    ...groupsTable(
      u.generic,
      ['Kind', 'Why generic', 'Copies', 'Rooms', 'Pages'],
      row,
    ),
  );
  if (u.stale.length)
    page.append(
      el('h2', {}, 'Stale generic entries'),
      el(
        'p',
        { className: 'bad' },
        u.stale.map((g) => g.kind).join(', ') +
          ': now branded, or no longer in the catalogue.',
      ),
    );
  (window as unknown as { __unbranded: unknown }).__unbranded = {
    gaps: u.gaps.flatMap((g) => g.items.map((e) => e.kind.key)),
    generic: u.generic.flatMap((g) => g.items.map((e) => e.kind.key)),
    stale: u.stale,
  };
}
