import { describe, expect, it } from 'vite-plus/test';
import { BRANDS } from '../../components/core/logic/brands';
import './bench-pages';
import {
  buildIndex,
  linkedPath,
  loadState,
  nodeAt,
  pathAndAncestors,
  roomGroup,
  saveState,
  searchIndex,
} from './bench-index';
import type { IndexNode, KeyValue } from './bench-index';
import { DEV_ROOM_NAMES, ROOMS } from './dev-room-links';
import { kindCatalogue } from './kind-catalogue';
import { lookCatalogue, searchWords } from './look-catalogue';
import { registerPage, pagesFor } from './page-registry';

const kinds = kindCatalogue();
const entries = lookCatalogue(undefined, kinds);
const input = {
  rooms: ROOMS,
  roomName: (r: string) =>
    (DEV_ROOM_NAMES as Record<string, string | undefined>)[r] ?? r,
  kinds,
  entries,
  brands: BRANDS,
};
const index = buildIndex(input);
const ids = (nodes: readonly IndexNode[]) => nodes.map((n) => n.id);
const all = (nodes: readonly IndexNode[]): IndexNode[] =>
  nodes.flatMap((n) => [n, ...all(n.children?.() ?? [])]);

describe('the bench index (mission 137)', () => {
  it('opens on Rooms, Things, Brands and Tools', () => {
    expect(ids(index)).toEqual(
      expect.arrayContaining(['rooms', 'things', 'brands', 'tools']),
    );
    expect(index.every((n) => n.count)).toBe(true);
  });

  it('holds every room, kind and brand', () => {
    const rooms = index[0]!.children!().flatMap((g) => g.children?.() ?? []);
    expect(new Set(ids(rooms))).toEqual(new Set(ROOMS));
    const things = nodeAt(index, 'things')!.children!();
    const kindIds = things.flatMap((g) => ids(g.children?.() ?? []));
    expect(new Set(kindIds)).toEqual(new Set(kinds.map((k) => k.key)));
    const brands = ids(nodeAt(index, 'brands')!.children!());
    for (const b of BRANDS) expect(brands).toContain(b.id);
  });

  it('reaches the acceptance pages from the tree alone', () => {
    const hrefs = all(index).flatMap((n) => [
      n.href ?? '',
      ...(n.links?.map((l) => l.href) ?? []),
    ]);
    expect(hrefs).toContain('bench.html?bench=room-audit&room=boiler_house');
    expect(hrefs).toContain('bench.html?bench=item-audit&kind=weather-station');
    expect(hrefs).toContain('bench.html?bench=magic-room&kind=weather-station');
    expect(hrefs).toContain('bench.html?bench=brand-audit&brand=hamwarmy');
    expect(hrefs).toContain('bench.html?bench=unbranded');
    expect(
      hrefs.some((h) => h.startsWith('./?room=boiler_house&look=BH-CP3')),
    ).toBe(true);
  });

  it('opens an installed object page from the main row while keeping look views explicit', () => {
    const controller = nodeAt(index, 'rooms/plant/plant_pool_02/PL2-TC1');
    expect(controller?.href).toBe(
      'bench.html?bench=object-detail&room=plant_pool_02&ref=PL2-TC1',
    );
    expect(controller?.links?.find((l) => l.label === 'front')?.href).toBe(
      './?room=plant_pool_02&look=PL2-TC1',
    );
  });

  it('gives every leaf a usable link', () => {
    const leaves = all(index).filter((n) => !n.children);
    expect(leaves.length).toBeGreaterThan(100);
    for (const leaf of leaves) {
      expect(leaf.href, leaf.label).toBeTruthy();
      const href = new URL(leaf.href!, 'https://example.test/bench.html');
      expect(href.origin).toBe('https://example.test');
      expect(['/', '/bench.html']).toContain(href.pathname);
    }
  });

  it('groups rooms', () => {
    expect(roomGroup('boiler_house')).toBe('plant');
    expect(roomGroup('pool_01')).toBe('pools');
    expect(roomGroup('dev65')).toBe('equipment');
    expect(roomGroup('dev3')).toBe('dev');
    expect(roomGroup('control_room')).toBe('control');
    expect(nodeAt(index, 'rooms/plant/boiler_house')?.label).toBeTruthy();
  });

  it('searches every branch and opens the way to each match', () => {
    const branch = searchIndex(index, searchWords('Rooms'));
    expect(branch.open.has('rooms')).toBe(true);
    const found = searchIndex(index, searchWords('boiler_house'));
    expect(found.matches).toBeGreaterThan(0);
    expect(found.open.has('rooms')).toBe(true);
    expect(found.open.has('rooms/plant')).toBe(true);
    expect(searchIndex(index, searchWords('zzzz-nothing')).matches).toBe(0);
  });

  it('reads a branch from a hash or ?open=', () => {
    expect(linkedPath('#rooms/plant/boiler_house', '')).toBe(
      'rooms/plant/boiler_house',
    );
    expect(linkedPath('', '?open=brands%2Fhamwarmy')).toBe('brands/hamwarmy');
    expect(linkedPath('#row-x', '')).toBeUndefined();
    expect(linkedPath('#rooms/boiler_house', '')).toBe(
      'rooms/plant/boiler_house',
    );
    expect(pathAndAncestors('a/b/c')).toEqual(['a', 'a/b', 'a/b/c']);
  });

  it('remembers state and survives broken storage', () => {
    const map = new Map<string, string>();
    const store: KeyValue = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    };
    saveState(store, { open: ['rooms'], query: 'cm6' });
    expect(loadState(store)).toEqual({ open: ['rooms'], query: 'cm6' });
    const broken: KeyValue = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadState(broken)).toEqual({ open: [], query: '' });
    expect(() => saveState(broken, { open: [], query: '' })).not.toThrow();
  });

  it('adds a branch when a page registers there', () => {
    registerPage({
      id: 'test-sim',
      name: 'Simulation graph',
      branch: 'simulation',
      subject: 'none',
      link: () => 'bench.html?bench=sim-graph',
    });
    expect(pagesFor('simulation', 'none')).toHaveLength(1);
    const withSim = buildIndex({
      ...input,
      rows: { 'test-sim': [{ id: 'n1', label: 'node one' }] },
    });
    const sim = nodeAt(withSim, 'simulation/page:test-sim');
    expect(sim?.children?.()[0]?.label).toBe('node one');
  });
});
