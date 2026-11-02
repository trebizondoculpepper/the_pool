import { describe, expect, it } from 'vite-plus/test';
import './sim-bench-pages';
import { pagesFor } from './page-registry';

describe('simulation pages in the bench index', () => {
  it('links to the graph, its nodes and known architectural objects', async () => {
    const page = pagesFor('simulation', 'none').find(
      (p) => p.id === 'sim-graph',
    );
    expect(page?.link('')).toBe('bench.html?bench=sim-graph');
    const rows = await page!.rows!();
    const nodes = rows
      .filter((r) => r.id !== 'architectural')
      .flatMap((r) => r.children ?? []);
    expect(nodes.length).toBeGreaterThan(100);
    expect(nodes.every((n) => n.href?.includes('bench=sim-node'))).toBe(true);
    const objects = rows.find((r) => r.id === 'architectural')?.children ?? [];
    expect(objects.length).toBeGreaterThan(0);
    expect(
      objects
        .flatMap((r) => r.children ?? [])
        .every((n) => n.href?.includes('bench=sim-object')),
    ).toBe(true);
  });
});
