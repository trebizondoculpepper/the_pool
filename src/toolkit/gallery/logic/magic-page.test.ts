import { describe, expect, it } from 'vite-plus/test';
import { objectDescriptors } from '../../../game/descriptors/registry';
import { plantInventory } from '../../../game/plant/equipment-catalogue';
import { kindCatalogue } from './kind-catalogue';
import type { KindEntry } from './kind-catalogue';
import { magicPage, magicPageText } from './magic-page';
import { auditNetwork } from './room-audit';
import { simGraph } from './sim-graph/index';

const input = () => ({
  inventory: plantInventory(),
  descriptors: objectDescriptors(),
  network: auditNetwork,
});

describe('magicPage', () => {
  it('describes a model block with no drawing of its own from the model', () => {
    const pump = kindCatalogue().find((k) => k.key === 'pump')!;
    const page = magicPage(pump, input());
    expect(page.title).toContain(pump.word);
    const text = magicPageText(page);
    expect(text).toContain(pump.purpose);
    // Every copy, by its tag, with its model description.
    for (const c of pump.copies) expect(text).toContain(c.tag ?? c.ref);
    // A copy nested in its cabinet says so.
    const nested = pump.copies.find((c) => c.parent);
    if (nested) expect(text).toContain(`part of ${nested.parent}`);
    expect(page.sections.map((s) => s.heading)).toContain('What works it');
  });

  it('says plainly where the model does not say', () => {
    const bare: KindEntry = {
      key: 'nothing',
      word: 'Nothing',
      class: 'unclassified',
      purpose: 'Stands for nothing.',
      registered: false,
      copies: [],
      usage: { count: 0, rooms: [], outsideDev: 0 },
      findings: [],
      worst: [],
      exempt: false,
      aliases: [],
    };
    const text = magicPageText(magicPage(bare, input()));
    expect(text).toContain('None counted from data.');
    expect(text).toContain('Not in the kinds’ register.');
    expect(text).toContain('No descriptor gives it presets yet');
  });

  it('finds the temperature controller in the executing graph', () => {
    const kind = kindCatalogue().find(
      (k) => k.key === 'pool-temperature-controller',
    )!;
    const page = magicPage(kind, { ...input(), graph: simGraph() });
    const text = magicPageText(page);
    expect(text).toContain('plant_pool_02/node:temperature-controller');
    expect(text).not.toContain('No executing graph or room-network connection');
  });
});
