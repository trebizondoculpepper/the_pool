import { describe, expect, it } from 'vite-plus/test';
import { NETWORK_ROOMS, roomNet } from './graph';
import { graphTier } from './tiers';

describe('graph tiers', () => {
  it('classifies every schematic and Olympic node and fitting kind (unknowns listed: none)', () => {
    const unknown = new Set<string>();
    for (const room of NETWORK_ROOMS) {
      const net = roomNet(room)!;
      for (const n of net.nodes.values())
        if (graphTier('node', n.kind) === 'unknown')
          unknown.add(`node ${n.kind}`);
      for (const f of net.fittings.values())
        if (graphTier('fitting', f.kind) === 'unknown')
          unknown.add(`fitting ${f.kind}`);
    }
    expect([...unknown]).toEqual([]);
  });
  it('makes links connectors and parts, alarms and leaves active', () => {
    expect(graphTier('link', 'x')).toBe('connector');
    expect(graphTier('alarm', 'x')).toBe('active');
    expect(graphTier('node', 'no-such-kind')).toBe('unknown');
    expect(graphTier('node', 'boiler-cascade')).toBe('group-many');
  });
});
