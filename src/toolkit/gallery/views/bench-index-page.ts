import { BRANDS } from '../../components/core/logic/brands';
import '../logic/bench-pages';
import '../logic/sim-bench-pages';
import {
  buildIndex,
  linkedPath,
  loadState,
  pagesWithRows,
  saveState,
  searchIndex,
} from '../logic/bench-index';
import type { IndexNode, KeyValue } from '../logic/bench-index';
import { DEV_ROOM_NAMES, ROOMS } from '../logic/dev-room-links';
import { kindCatalogue } from '../logic/kind-catalogue';
import type { KindCatalogueInput } from '../logic/kind-catalogue';
import { lookCatalogue, searchWords } from '../logic/look-catalogue';
import type { RegisteredRow } from '../logic/page-registry';
import { createTreeView } from './tree-view';

/**
 * The bench index (mission 137, `bench.html` with no `bench=`): every room,
 * kind, brand and registered page as one keyboard-navigable tree with one
 * search box, built from data alone. `window.__benchIndex` holds its state.
 */

const viewerStore = (): KeyValue | undefined => {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
};

export async function runBenchIndex(root: HTMLElement): Promise<void> {
  const store = viewerStore();
  const state = loadState(store);
  const roomName = (r: string) =>
    (DEV_ROOM_NAMES as Record<string, string | undefined>)[r] ?? r;

  root.replaceChildren();
  document.title = 'Bench index';
  const h1 = document.createElement('h1');
  h1.textContent = 'Bench index';
  const intro = document.createElement('p');
  intro.textContent =
    "Every room, thing, brand and development page. Arrow keys move, Right opens a branch or reaches a leaf's extra links, Left returns, Enter follows. Link to a branch with #rooms/plant/boiler_house.";
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Search: tag, name, kind, asset id, brand, room';
  search.setAttribute('aria-label', 'Search the index');
  search.value = state.query;
  search.style.cssText = 'width:min(36em,100%);margin:4px 0 8px;padding:4px';
  const status = document.createElement('p');
  status.style.color = '#9a937e';
  const tree = createTreeView({
    label: 'Bench index',
    onToggle: (path, open) => {
      if (searching) return;
      const set = new Set(state.open);
      if (open) set.add(path);
      else set.delete(path);
      state.open = [...set];
      saveState(store, state);
    },
  });
  root.append(h1, intro, search, status, tree.element);

  let searching = false;
  let loading = true;
  let loadError = '';
  let index: IndexNode[] = [];
  const rows: Record<string, readonly RegisteredRow[]> = {};
  const build = (input: KindCatalogueInput = {}) => {
    const kinds = kindCatalogue(input);
    index = buildIndex({
      rooms: ROOMS,
      roomName,
      kinds,
      entries: lookCatalogue(undefined, kinds),
      brands: BRANDS,
      rows,
    });
  };

  const draw = () => {
    const words = searchWords(search.value);
    searching = words.length > 0;
    if (searching) {
      const found = searchIndex(index, words);
      tree.render(found.nodes, found.open);
      status.textContent = `${found.matches} found`;
    } else {
      tree.render(index, new Set(state.open));
      status.textContent = '';
    }
    if (loading)
      status.textContent += `${status.textContent ? ' · ' : ''}Loading the dev rooms' exhibits…`;
    if (loadError)
      status.textContent += `${status.textContent ? ' · ' : ''}${loadError}`;
  };

  const followLink = () => {
    const path = linkedPath(location.hash, location.search);
    if (!path) return;
    if (searching) {
      search.value = '';
      draw();
    }
    tree.reveal(path);
  };

  build();
  draw();
  followLink();

  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.query = search.value;
      saveState(store, state);
      draw();
    }, 150);
  });
  window.addEventListener('hashchange', followLink);
  (window as unknown as { __benchIndex: unknown }).__benchIndex = {
    get index() {
      return index;
    },
    state,
  };

  // Then what needs module imports: the dev rooms' exhibits, and rows that
  // registered pages offer (138's nodes). Redrawn once, keeping the focus path.
  const [{ loadExhibits }, ...offered] = await Promise.all([
    import('./catalogue-panel'),
    ...pagesWithRows().map(async (p) => {
      try {
        rows[p.id] = await p.rows!();
      } catch {
        rows[p.id] = [];
      }
    }),
  ]);
  void offered;
  try {
    build(await loadExhibits());
  } catch (error) {
    loadError = `Dev rooms' exhibits failed: ${String(error)}`;
    build();
  }
  loading = false;
  const focused = (document.activeElement as HTMLElement | null)?.dataset?.path;
  draw();
  if (focused) tree.reveal(focused);
  else followLink();
}
