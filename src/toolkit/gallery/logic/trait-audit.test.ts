import { describe, expect, test } from 'vite-plus/test';
import { traitDetail } from '../../../game/plant/trait-index';
import { kindCatalogue } from './kind-catalogue';
import {
  addCommand,
  fixCommand,
  sourceWords,
  traitAuditLink,
  traitContext,
  traitObjects,
} from './trait-audit';

describe('links and commands', () => {
  test('the page’s links', () => {
    expect(traitAuditLink()).toBe('bench.html?bench=trait-audit');
    expect(traitAuditLink('box-like')).toBe(
      'bench.html?bench=trait-audit&trait=box-like',
    );
  });

  test('a fix command for each way a kind has a trait', () => {
    expect(fixCommand('desk', 'box-like', { by: 'named' })).toBe(
      'npm run -s audit -- set desk traits-=box-like',
    );
    expect(
      fixCommand('desk', 'holdable', { by: 'composite', via: ['boxed-item'] }),
    ).toMatch(/traits-=boxed-item/);
    expect(
      fixCommand('tank', 'supportable', { by: 'implied', from: 'walkable' }),
    ).toMatch(/remove that instead/);
    expect(
      fixCommand('tank', 'water-fed', { by: 'ports', media: ['water'] }),
    ).toMatch(/change the model/);
    expect(addCommand('desk', 'operable')).toBe(
      'npm run -s audit -- set desk traits+=operable',
    );
    expect(sourceWords({ by: 'composite', via: ['a', 'b'] })).toBe('via a › b');
  });
});

describe('the registry’s worked example: the balance tank', () => {
  const ctx = traitContext();

  test('box-like lists the balance tank through tank-like; supportable is implied by walkable', () => {
    expect(
      traitDetail('box-like', ctx).kinds.find((k) => k.kind === 'balance-tank')
        ?.sources,
    ).toEqual([{ by: 'composite', via: ['tank-like'] }]);
    expect(
      traitDetail('supportable', ctx).kinds.find(
        (k) => k.kind === 'balance-tank',
      )?.sources,
    ).toEqual([{ by: 'implied', from: 'walkable' }]);
  });

  test('its objects are joined from the catalogue’s placements, grouped by room', () => {
    const o = traitObjects(['balance-tank'], kindCatalogue());
    expect(o.objects).toBeGreaterThanOrEqual(3);
    expect(o.rooms.map((r) => r.room)).toContain('plant_pool_01');
    expect(o.outsideDev).toBe(
      o.rooms.filter((r) => !r.dev).reduce((n, r) => n + r.copies.length, 0),
    );
  });

  test('a trait no kind has gives no objects', () => {
    expect(traitObjects([], kindCatalogue())).toEqual({
      rooms: [],
      objects: 0,
      roomCount: 0,
      outsideDev: 0,
    });
  });
});
