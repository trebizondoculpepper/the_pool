import { describe, expect, it } from 'vite-plus/test';
import { BRANDS, brandById } from '../../components/core/logic/brands';
import type { BrandId } from '../../components/core/logic/brands';
import {
  CONFIRMED_GENERIC,
  brandAudit,
  brandAuditLink,
  brandCounts,
  brandModels,
  groupByClass,
  isUnbranded,
  unbranded,
} from './brand-audit';
import { kindCatalogue } from './kind-catalogue';
import type { CatalogueCopy, KindClass, KindEntry } from './kind-catalogue';

const copy = (room: string, maker?: BrandId): CatalogueCopy => ({
  room,
  kind: 'k',
  name: 'n',
  ref: 'r',
  source: 'layout',
  look: 'expected',
  exempt: false,
  findings: [],
  ...(maker ? { maker } : {}),
});

const kind = (
  key: string,
  cls: KindClass,
  copies: CatalogueCopy[],
  maker?: BrandId,
): KindEntry => ({
  key,
  word: key,
  class: cls,
  ...(maker ? { maker } : {}),
  purpose: '',
  registered: true,
  copies,
  usage: {
    count: copies.length,
    rooms: [...new Set(copies.map((c) => c.room))],
    outsideDev: copies.length,
  },
  findings: [],
  worst: [],
  exempt: cls === 'decorative',
  aliases: [],
});

const KINDS = [
  kind('pump', 'plant', [copy('a'), copy('b'), copy('b')], 'grundflow'),
  kind('motor', 'plant', [copy('a', 'grundflow'), copy('a', 'voltara')]),
  kind('sign', 'architectural', [copy('a')]),
  kind('plant-pot', 'decorative', [copy('a')]),
  kind('fuse', 'plant', [copy('c')]),
  kind('alarm', 'architectural', [], 'warden'),
];

describe('brand models', () => {
  it('takes a kind whose maker is the brand whole, and a shared kind by its copies', () => {
    const models = brandModels('grundflow', KINDS);
    expect(models.map((m) => [m.kind.key, m.copies.length, m.whole])).toEqual([
      ['pump', 3, true],
      ['motor', 1, false],
    ]);
    expect(models[0].rooms).toEqual(['a', 'b']);
  });

  it('groups by class in order, each by its word', () => {
    const groups = groupByClass(KINDS, (k) => k);
    expect(groups.map((g) => g.class)).toEqual([
      'plant',
      'architectural',
      'decorative',
    ]);
    expect(groups[0].items.map((k) => k.key)).toEqual([
      'fuse',
      'motor',
      'pump',
    ]);
  });

  it('shows a brand with nothing placed as such', () => {
    const warden = brandAudit(brandById('warden')!, KINDS);
    expect(warden.kinds).toBe(1);
    expect(warden.nothingPlaced).toBe(true);
    const none = brandAudit(brandById('neumann-dynamik')!, KINDS);
    expect(none).toMatchObject({ kinds: 0, copies: 0, nothingPlaced: true });
    expect(none.groups).toEqual([]);
    expect(brandAudit(brandById('grundflow')!, KINDS)).toMatchObject({
      kinds: 2,
      copies: 4,
      nothingPlaced: false,
    });
  });

  it('links each brand to its page', () => {
    expect(brandAuditLink('grundflow')).toBe(
      'bench.html?bench=brand-audit&brand=grundflow',
    );
  });
});

describe('unbranded goods', () => {
  it('lists every kind with no maker, decoration aside, split into gaps and confirmed generic', () => {
    expect(isUnbranded(KINDS[1])).toBe(false);
    const u = unbranded(KINDS, [
      { kind: 'fuse', reason: 'a fuse is a commodity' },
      { kind: 'pump', reason: 'stale' },
    ]);
    expect(
      u.gaps.map((g) => [g.class, g.items.map((e) => e.kind.key)]),
    ).toEqual([['architectural', ['sign']]]);
    expect(u.generic[0].items).toEqual([
      { kind: KINDS[4], generic: 'a fuse is a commodity' },
    ]);
    expect(u.stale.map((g) => g.kind)).toEqual(['pump']);
  });
});

describe('the game’s brands', () => {
  const kinds = kindCatalogue();
  it('gives every brand a page and counts', () => {
    const counts = brandCounts(BRANDS, kinds);
    expect(counts).toHaveLength(BRANDS.length);
    expect(
      counts.find((c) => c.brand.id === 'grundflow')!.kinds,
    ).toBeGreaterThan(1);
  });

  it('keeps the confirmed-generic list to kinds that exist and have no maker', () => {
    expect(unbranded(kinds).stale).toEqual([]);
    for (const g of CONFIRMED_GENERIC) expect(g.reason).not.toBe('');
  });

  it('lists each unbranded kind once, either a gap or generic', () => {
    const u = unbranded(kinds);
    const keys = [...u.gaps, ...u.generic].flatMap((g) =>
      g.items.map((e) => e.kind.key),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(
      kinds.filter((k) => !k.exempt && isUnbranded(k)).length,
    );
  });
});
