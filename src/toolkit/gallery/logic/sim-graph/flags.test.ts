import { describe, expect, it } from 'vite-plus/test';
import { simFlags } from './flags';
import type { FlagInputs } from './flags';

const base: FlagInputs = {
  node: {
    id: 'x/node:y',
    room: 'x',
    sort: 'node',
    kind: 'sand-filter',
    name: 'y',
    tier: 'active',
  },
  hasState: true,
  upstream: 1,
  downstream: 1,
  controls: 0,
  described: false,
  representations: 0,
  unknownIn: ['x'],
  alarms: [],
  alarmsDeclared: false,
  tagExpected: false,
  duplicateTag: false,
};

describe('flags', () => {
  it('an uncovered room makes invisible unknown, not a finding', () => {
    expect(simFlags(base).invisible).toBe('unknown');
    expect(simFlags({ ...base, unknownIn: [] }).invisible).toBe('yes');
    expect(simFlags({ ...base, representations: 1 }).invisible).toBe('no');
  });
  it('flags no state, no source and no effect', () => {
    const f = simFlags({
      ...base,
      hasState: false,
      upstream: 0,
      downstream: 0,
    });
    expect([f['no-state'], f['no-source'], f['no-effect']]).toEqual([
      'yes',
      'yes',
      'yes',
    ]);
  });
});
