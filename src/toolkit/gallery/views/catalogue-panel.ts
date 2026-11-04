import { auditJsonPath, roomAudit } from '../logic/audit-export/audit-export';
import { ROOMS, DEV_ROOM_NAMES } from '../logic/dev-room-links';
import { kindControls } from '../../../game/descriptors/registry';
import { deprecationOf, itemAuditLink } from '../logic/item-audit';
import { BRANDS } from '../../components/core/logic/brands';
import {
  UNBRANDED_LINK,
  brandAuditLink,
  brandCounts,
  unbranded,
} from '../logic/brand-audit';
import {
  FINDING_WORDS,
  isBadlyNamed,
  isDevRoom,
  kindCatalogue,
} from '../logic/kind-catalogue';
import type {
  CatalogueCopy,
  DevExhibit,
  Finding,
  KindEntry,
  KindModel,
} from '../logic/kind-catalogue';
import {
  auditLink,
  entryFields,
  lookCatalogue,
  lookLink,
  matchesSearch,
  searchWords,
} from '../logic/look-catalogue';
import type { LookEntry } from '../logic/look-catalogue';
import {
  costSummary,
  loadRecord,
  sortByCost,
  usageOfRooms,
  weightOf,
} from '../logic/visual-cost';
import type { CostSort, KeyValueStore } from '../logic/visual-cost';

/**
 * The dev panel's universal catalogue (mission 126): Rooms, each opening
 * into its named things, Game objects, every kind with its copies,
 * usage and naming findings, and Brands (mission 136), each brand's audit
 * page and the unbranded goods. Drawn from data only; a row's contents are
 * drawn when it is opened.
 */

type Category = 'rooms' | 'kinds' | 'brands' | 'simulation';
interface Saved {
  category: Category;
  query: string;
  used: boolean;
  outside: boolean;
  bad: boolean;
  /** Deprecated kinds still placed outside dev rooms: the things to replace (mission 130). */
  deprecated: boolean;
  /** Mission 135: order by visual cost or weight, from measurements already taken. */
  sort: CostSort;
  /** Only kinds measured in their magic rooms in this browser. */
  measured: boolean;
}
const STORE = 'pool.catalogue';
const load = (): Saved => {
  const fallback: Saved = {
    category: 'rooms',
    query: '',
    used: false,
    outside: false,
    bad: false,
    deprecated: false,
    sort: 'name',
    measured: false,
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORE) ?? '{}') };
  } catch {
    return fallback;
  }
};
const save = (s: Saved) => {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    // A private window: the catalogue works, it just forgets.
  }
};

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] => {
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
};

const flags = (findings: readonly Finding[]) =>
  el(
    'span',
    { className: 'cat-flags' },
    ...findings.map((f) =>
      el(
        'span',
        {
          className: isBadlyNamed([f]) ? 'cat-flag is-bad' : 'cat-flag',
        },
        FINDING_WORDS[f],
      ),
    ),
  );

/** The viewer's own magic-room measurements (mission 135): never measured here. */
const viewerStore = (): KeyValueStore | undefined => {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
};
const measuredCost = (kind: string) => loadRecord(viewerStore(), kind)?.high;

const roomName = (room: string) =>
  (DEV_ROOM_NAMES as Record<string, string | undefined>)[room] ?? room;

/** The dev rooms' exhibits and the placed kinds' models: module imports, no scene (the item audit's too). */
export async function loadExhibits(): Promise<{
  exhibits: DevExhibit[];
  models: Record<string, KindModel>;
}> {
  const [{ EXHIBITS }, { MODELS }] = await Promise.all([
    import('../rooms/plant-room'),
    import('./room-equipment'),
  ]);
  const kindOf = new Map(Object.entries(MODELS).map(([k, m]) => [m, k]));
  const exhibits: DevExhibit[] = [];
  const rooms = Object.entries(EXHIBITS);
  const modules = await Promise.all(
    rooms.map(([, loader]) => loader().catch(() => null)),
  );
  rooms.forEach(([room], i) => {
    for (const exhibit of modules[i]?.EXHIBITS ?? []) {
      const kind = kindOf.get(exhibit);
      exhibits.push({
        room,
        title: exhibit.title,
        ...(kind ? { kind } : {}),
        ...(exhibit.maker ? { maker: exhibit.maker } : {}),
      });
    }
  });
  const models = Object.fromEntries(
    Object.entries(MODELS).map(([k, m]) => [
      k,
      {
        title: m.title,
        reference: m.reference,
        ...(m.maker ? { maker: m.maker } : {}),
      },
    ]),
  );
  return { exhibits, models };
}

/** The catalogue, its state remembered per viewer. */
export function createCataloguePanel(): HTMLElement {
  const state = load();
  const root = el('section', { className: 'catalogue' });
  root.setAttribute('aria-labelledby', 'catalogue-heading');
  const status = el('p', { className: 'cat-status' }, 'Gathering…');
  const search = el('input', {
    type: 'search',
    placeholder: 'Search: tag, name, asset id, kind, maker, room',
    value: state.query,
    className: 'cat-search',
  });
  search.setAttribute('aria-label', 'Search the catalogue');
  const tab = (c: Category, label: string) => {
    const b = el('button', { type: 'button', className: 'cat-tab' }, label);
    b.addEventListener('click', () => {
      state.category = c;
      save(state);
      render();
    });
    return b;
  };
  const roomsTab = tab('rooms', 'Rooms');
  const kindsTab = tab('kinds', 'Game objects');
  const brandsTab = tab('brands', 'Brands');
  const simTab = tab('simulation', 'Simulation');
  const check = (
    key: 'used' | 'outside' | 'bad' | 'deprecated' | 'measured',
    label: string,
  ) => {
    const box = el('input', { type: 'checkbox', checked: state[key] });
    box.addEventListener('change', () => {
      state[key] = box.checked;
      save(state);
      render();
    });
    return el('label', { className: 'cat-filter' }, box, ` ${label}`);
  };
  const filters = el(
    'div',
    { className: 'cat-filters' },
    check('used', 'used anywhere'),
    check('outside', 'used outside dev rooms'),
    check('bad', 'badly named'),
    check('deprecated', 'deprecated, still outside dev rooms'),
    check('measured', 'visual cost measured'),
  );
  // Sort by visual cost or weight (mission 135): only figures already
  // measured in magic rooms in this browser; nothing is measured here.
  const sort = el('select', { className: 'cat-sort' });
  sort.setAttribute('aria-label', 'Sort game objects');
  for (const [value, label] of [
    ['name', 'sort: name'],
    ['cost', 'sort: visual cost (HIGH tris)'],
    ['weight', 'sort: weight (copies × cost)'],
  ] as const)
    sort.append(el('option', { value, selected: state.sort === value }, label));
  sort.addEventListener('change', () => {
    state.sort = sort.value as CostSort;
    save(state);
    render();
  });
  filters.append(sort);
  const list = el('div', { className: 'cat-list' });
  root.append(
    el('h2', { id: 'catalogue-heading' }, 'Catalogue'),
    el(
      'div',
      { className: 'cat-bar' },
      el(
        'div',
        { className: 'cat-tabs' },
        roomsTab,
        kindsTab,
        brandsTab,
        simTab,
      ),
      search,
    ),
    filters,
    status,
    list,
  );

  let kinds: KindEntry[] = [];
  let entries: LookEntry[] = [];
  let exhibitsLoaded = false;
  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.query = search.value;
      save(state);
      render();
    }, 150);
  });

  const lookA = (room: string, ref: string, text: string, sure = true) => {
    const a = el(
      'a',
      { href: lookLink(room, ref), className: 'cat-look' },
      text,
    );
    if (!sure) {
      a.classList.add('is-unverified');
      a.title = 'Named in data; not yet known to be marked in its scene (127)';
    }
    return a;
  };

  /** One room's entries, owners first with their parts under them. */
  const roomBody = (room: string, words: readonly string[]) => {
    const mine = entries.filter((e) => e.room === room);
    const box = el('div', { className: 'cat-body' });
    if (!mine.length) {
      box.append(
        el(
          'p',
          { className: 'cat-note' },
          isDevRoom(room) && !exhibitsLoaded
            ? 'Loading its exhibits…'
            : 'Not counted: its contents are not in data yet (mission 127).',
        ),
      );
      return box;
    }
    const tags = new Set(mine.flatMap((e) => (e.tag ? [e.tag] : [])));
    const shown = (e: LookEntry) => matchesSearch(words, entryFields(e));
    const line = (e: LookEntry, depth: number): HTMLElement[] => {
      const kids = mine.filter((k) => k.parent && k.parent === e.tag);
      const rows = kids.flatMap((k) => line(k, depth + 1));
      if (!shown(e) && !rows.length) return [];
      const row = el('div', { className: 'cat-row' });
      row.style.paddingLeft = `${depth * 18 + 8}px`;
      row.append(
        e.look === 'none'
          ? el('span', { className: 'cat-ref' }, e.ref)
          : lookA(e.room, e.ref, e.ref, e.look === 'expected'),
        el('span', { className: 'cat-name' }, e.title),
        el(
          'span',
          { className: 'cat-meta' },
          [e.kindWord, e.assetId].filter(Boolean).join(' · '),
        ),
      );
      if (e.look !== 'none' && !e.parent) {
        const modes = el('span', { className: 'cat-modes' });
        for (const m of ['left', 'right', 'above'] as const)
          modes.append(el('a', { href: lookLink(e.room, e.ref, m) }, m));
        row.append(modes);
      }
      row.append(flags(e.findings));
      return [row, ...rows];
    };
    for (const e of mine)
      if (!e.parent || !tags.has(e.parent)) box.append(...line(e, 0));
    return box;
  };

  const roomMenu = (room: string, details: HTMLDetailsElement) => {
    const menu = el('details', { className: 'cat-menu' });
    const open = el('a', { href: `?room=${encodeURIComponent(room)}` }, 'Open');
    const cat = el('button', { type: 'button' }, 'Catalogue');
    cat.addEventListener('click', () => {
      details.open = true;
      menu.open = false;
      details.scrollIntoView({ block: 'start' });
    });
    const audit = el(
      'a',
      {
        href: auditLink(room),
        title: 'The room audit (mission 129): everything the room holds',
      },
      'Audit',
    );
    const json = el('a', { href: auditJsonPath.room(room) }, 'JSON');
    // Its audit status (mission 167), worked out from data when the menu opens.
    menu.addEventListener('toggle', () => {
      if (!menu.open || audit.dataset.status) return;
      const a = roomAudit(room, { kinds });
      audit.dataset.status = a.signOff;
      audit.textContent = `Audit · ${a.signOff}`;
      audit.title = `The room audit (missions 129, 167): ${a.counts.objects} objects, ${a.findings.filter((f) => f.severity !== 'info').length} unresolved`;
    });
    menu.append(
      el('summary', { title: 'Room menu' }, '⋯'),
      el('div', { className: 'cat-menu-items' }, open, cat, audit, json),
    );
    return menu;
  };

  const renderRooms = (words: readonly string[]) => {
    let shown = 0;
    for (const room of ROOMS) {
      const mine = entries.filter((e) => e.room === room);
      const hits = words.length
        ? mine.filter((e) => matchesSearch(words, entryFields(e))).length
        : mine.length;
      const nameHit = matchesSearch(words, [room, roomName(room)]);
      if (words.length && !hits && !nameHit) continue;
      shown += 1;
      const details = el('details', { className: 'cat-item' });
      const counted = mine.length
        ? `${mine.length}${words.length ? ` · ${hits} match` : ''}`
        : isDevRoom(room) && !exhibitsLoaded
          ? '…'
          : 'not counted';
      const bad = mine.filter((e) => isBadlyNamed(e.findings)).length;
      details.append(
        el(
          'summary',
          {},
          el('span', { className: 'cat-ref' }, room),
          el('span', { className: 'cat-name' }, roomName(room)),
          el('span', { className: 'cat-meta' }, counted),
          ...(bad
            ? [
                el(
                  'span',
                  { className: 'cat-flag is-bad' },
                  `${bad} badly named`,
                ),
              ]
            : []),
        ),
      );
      details.addEventListener('toggle', () => {
        if (details.open && details.childElementCount === 1)
          details.append(roomBody(room, words));
      });
      if (words.length && hits) {
        details.open = true;
        details.append(roomBody(room, words));
      }
      list.append(
        el('div', { className: 'cat-room' }, details, roomMenu(room, details)),
      );
    }
    return shown;
  };

  const copyRow = (c: CatalogueCopy, depth: number) => {
    const row = el('div', { className: 'cat-row' });
    row.style.paddingLeft = `${depth * 18 + 8}px`;
    row.append(
      c.look === 'none'
        ? el('span', { className: 'cat-ref' }, c.ref)
        : lookA(c.room, c.ref, c.ref, c.look === 'expected'),
      el('span', { className: 'cat-name' }, c.name),
      el(
        'span',
        { className: 'cat-meta' },
        [c.room || '(no room)', c.assetId, isDevRoom(c.room) ? 'dev' : '']
          .filter(Boolean)
          .join(' · '),
      ),
      flags(c.findings),
    );
    return row;
  };

  const kindBody = (k: KindEntry, words: readonly string[]) => {
    const box = el('div', { className: 'cat-body' });
    box.append(el('p', { className: 'cat-note' }, k.purpose));
    // Its controls, from its descriptor (mission 131), where it has one.
    const controls = kindControls(k.key);
    if (controls.length)
      box.append(
        el(
          'p',
          { className: 'cat-note' },
          `Controls: ${controls
            .map((c) => `${c.label} (${c.key}: ${c.inputs.join('/')})`)
            .join(', ')}`,
        ),
      );
    // The item audit page (mission 130): what it is, its parts and states,
    // every placement, and its magic room or magic page.
    const itemAudit = el(
      'a',
      {
        href: itemAuditLink(k.key),
        title: 'The item audit page (mission 130)',
      },
      'Item audit',
    );
    const deprecated = deprecationOf(k.key);
    if (deprecated)
      box.append(
        el(
          'p',
          { className: 'cat-note' },
          `Deprecated: ${deprecated.reason}; replace with ${deprecated.replacement}.`,
        ),
      );
    box.append(el('p', { className: 'cat-rooms' }, itemAudit));
    if (k.usage.rooms.length) {
      const rooms = el('p', { className: 'cat-rooms' }, 'In: ');
      k.usage.rooms.forEach((room, i) => {
        const n = k.copies.filter((c) => c.room === room).length;
        if (i) rooms.append(', ');
        rooms.append(
          el(
            'a',
            { href: `?room=${encodeURIComponent(room)}` },
            room || '(no room)',
          ),
          ` ×${n}`,
        );
      });
      box.append(rooms);
    } else
      box.append(
        el('p', { className: 'cat-note' }, 'Not used in any counted room.'),
      );
    // Its copies, each with its parts (copies of other kinds) under it.
    const all = kinds.flatMap((x) => x.copies);
    const partsOf = (c: CatalogueCopy) =>
      c.tag ? all.filter((p) => p.parent === c.tag && p.room === c.room) : [];
    const add = (c: CatalogueCopy, depth: number) => {
      box.append(copyRow(c, depth));
      if (depth < 3) for (const p of partsOf(c)) add(p, depth + 1);
    };
    for (const c of k.copies)
      if (
        matchesSearch(words, [c.ref, c.name, c.assetId, c.room]) ||
        matchesSearch(words, [k.key, k.word, ...k.aliases])
      )
        add(c, 0);
    return box;
  };

  const renderKinds = (words: readonly string[]) => {
    let shown = 0;
    const costs = new Map(kinds.map((k) => [k.key, measuredCost(k.key)]));
    const usageOf = (k: KindEntry) => usageOfRooms(k.copies.map((c) => c.room));
    for (const k of sortByCost(
      kinds,
      state.sort,
      (x) => costs.get(x.key),
      usageOf,
    )) {
      const cost = costs.get(k.key);
      if (state.measured && !cost) continue;
      if (state.used && !k.usage.count) continue;
      if (state.outside && !k.usage.outsideDev) continue;
      if (state.bad && !isBadlyNamed(k.worst)) continue;
      if (state.deprecated && !(deprecationOf(k.key) && k.usage.outsideDev))
        continue;
      const kindHit = matchesSearch(words, [
        k.key,
        k.word,
        k.maker,
        ...k.aliases,
      ]);
      const copyHit = k.copies.some((c) =>
        matchesSearch(words, [c.ref, c.name, c.assetId, c.room]),
      );
      if (!kindHit && !copyHit) continue;
      shown += 1;
      const details = el('details', { className: 'cat-item' });
      details.append(
        el(
          'summary',
          {},
          el('span', { className: 'cat-ref' }, k.key),
          el('span', { className: 'cat-name' }, k.word),
          el(
            'span',
            { className: 'cat-meta' },
            `${k.class}${k.maker ? ` · ${k.maker}` : ''} · ${k.usage.count} in all · ${k.usage.outsideDev} outside dev${cost ? ` · ${costSummary(cost)} · weight ${weightOf(cost, usageOf(k)).triangles.toLocaleString()} tris` : ''}`,
          ),
          k.exempt
            ? el('span', { className: 'cat-flag' }, 'decorative, exempt')
            : flags(k.worst),
        ),
      );
      details.addEventListener('toggle', () => {
        if (details.open && details.childElementCount === 1)
          details.append(kindBody(k, words));
      });
      list.append(details);
    }
    return shown;
  };

  /** Mission 136: each brand's audit page, and the unbranded goods. */
  const renderBrands = (words: readonly string[]) => {
    let shown = 0;
    const u = unbranded(kinds);
    const n = (gs: typeof u.gaps) =>
      gs.reduce((sum, g) => sum + g.items.length, 0);
    if (matchesSearch(words, ['unbranded', 'generic', 'no maker'])) {
      shown += 1;
      list.append(
        el(
          'div',
          { className: 'cat-row' },
          el(
            'a',
            { href: UNBRANDED_LINK, className: 'cat-ref' },
            'Unbranded goods',
          ),
          el(
            'span',
            { className: 'cat-meta' },
            `${n(u.gaps)} gaps · ${n(u.generic)} confirmed generic`,
          ),
        ),
      );
    }
    for (const { brand, kinds: k, copies } of brandCounts(BRANDS, kinds)) {
      if (!matchesSearch(words, [brand.id, brand.name, brand.makes])) continue;
      shown += 1;
      list.append(
        el(
          'div',
          { className: 'cat-row' },
          el(
            'a',
            { href: brandAuditLink(brand.id), className: 'cat-ref' },
            brand.name,
          ),
          el('span', { className: 'cat-name' }, brand.makes),
          el(
            'span',
            { className: 'cat-meta' },
            copies
              ? `${k} kind${k === 1 ? '' : 's'} · ${copies} in all`
              : 'nothing placed yet',
          ),
        ),
      );
    }
    return shown;
  };

  // Mission 138: the simulation graph's nodes, by domain then room, built
  // on first opening (the graph is loaded only then).
  let sim:
    | {
        id: string;
        name: string;
        tag?: string;
        kind: string;
        room: string;
        domain: string;
        link: string;
      }[]
    | undefined;
  let simLoading = false;
  const renderSimulation = (words: readonly string[]) => {
    if (!sim) {
      if (!simLoading) {
        simLoading = true;
        void Promise.all([
          import('../logic/sim-graph/index'),
          import('../logic/sim-graph/node-page'),
        ]).then(([{ simGraph }, { simList, nodeLink }]) => {
          sim = simList(simGraph()).map((x) => ({
            id: x.node.id,
            name: x.node.name,
            ...(x.node.tag ? { tag: x.node.tag } : {}),
            kind: x.node.kind,
            room: x.node.room,
            domain: x.media[0] ?? 'no medium',
            link: nodeLink(x.node.id),
          }));
          render();
        });
      }
      list.append(el('p', { className: 'cat-status' }, 'Building the graph…'));
      return 0;
    }
    const rows = sim.filter((n) =>
      matchesSearch(words, [n.id, n.name, n.tag ?? '', n.kind, n.room]),
    );
    list.append(
      el(
        'div',
        { className: 'cat-row' },
        el(
          'a',
          { href: 'bench.html?bench=sim-graph', className: 'cat-ref' },
          'Every node, filtered',
        ),
        el(
          'span',
          { className: 'cat-meta' },
          'Not simulated: architectural objects, from each room’s Audit',
        ),
      ),
    );
    const domains = [...new Set(rows.map((n) => n.domain))].sort();
    for (const d of domains) {
      const details = el('details', {});
      details.append(el('summary', {}, d));
      for (const room of [
        ...new Set(rows.filter((n) => n.domain === d).map((n) => n.room)),
      ].sort()) {
        const inner = el('details', {});
        inner.append(el('summary', {}, room));
        for (const n of rows.filter((x) => x.domain === d && x.room === room))
          inner.append(
            el(
              'div',
              { className: 'cat-row' },
              el('a', { href: n.link, className: 'cat-ref' }, n.tag ?? n.id),
              el('span', { className: 'cat-name' }, n.name),
              el('span', { className: 'cat-meta' }, n.kind),
            ),
          );
        details.append(inner);
      }
      list.append(details);
    }
    return rows.length;
  };

  function render() {
    roomsTab.classList.toggle('is-on', state.category === 'rooms');
    kindsTab.classList.toggle('is-on', state.category === 'kinds');
    brandsTab.classList.toggle('is-on', state.category === 'brands');
    simTab.classList.toggle('is-on', state.category === 'simulation');
    filters.hidden = state.category !== 'kinds';
    list.replaceChildren();
    if (!kinds.length) return;
    const words = searchWords(state.query);
    const shown =
      state.category === 'rooms'
        ? renderRooms(words)
        : state.category === 'kinds'
          ? renderKinds(words)
          : state.category === 'simulation'
            ? renderSimulation(words)
            : renderBrands(words);
    const bad = kinds.filter((k) => isBadlyNamed(k.worst)).length;
    const counted = new Set(entries.map((e) => e.room)).size;
    status.textContent =
      state.category === 'rooms'
        ? `${shown} of ${ROOMS.length} rooms · ${counted} counted from data, the rest not counted until mission 127${exhibitsLoaded ? '' : ' · loading dev rooms’ exhibits…'}`
        : state.category === 'simulation'
          ? `${shown} simulation nodes (mission 138), by domain then room`
          : state.category === 'brands'
            ? `${BRANDS.length} brands, each with its audit page (mission 136), and the unbranded goods`
            : `${shown} of ${kinds.length} kinds · ${bad} badly named · counts cover the plant rooms${exhibitsLoaded ? ' and the exhibit dev rooms' : ' (dev rooms loading…)'}; museum halls, pool halls and corridors not counted (127)`;
  }

  const build = (input: Parameters<typeof kindCatalogue>[0] = {}) => {
    kinds = kindCatalogue(input);
    entries = lookCatalogue(undefined, kinds);
    render();
  };
  render();
  // After the panel is drawn: data first, then the dev rooms' exhibits.
  setTimeout(() => {
    try {
      build();
    } catch (error) {
      status.textContent = `Catalogue failed: ${String(error)}`;
      return;
    }
    void loadExhibits()
      .then((input) => {
        exhibitsLoaded = true;
        build(input);
      })
      .catch((error) => {
        exhibitsLoaded = true;
        status.textContent += ` · dev rooms' exhibits failed: ${String(error)}`;
      });
  }, 0);
  return root;
}
