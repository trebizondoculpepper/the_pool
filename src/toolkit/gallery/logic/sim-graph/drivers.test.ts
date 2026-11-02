import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../../../../game/world';
import { CHANGES, sampleEvents } from './drivers';

describe('drivers, probed', () => {
  it('the drain-down action moves both the drain valve and the drain-down', () => {
    const w = applyAction(newWorld(), {
      type: 'pool/drain-down',
      pool: 'pool_03',
      open: true,
    });
    expect(w.installedValves['jacuzzi.drain']).toBe(true);
    expect(w.pools.pool_03.drainDown).toBe(true);
  });
  it('the cabinet pump trips on no flow over time', () => {
    let w = applyAction(newWorld(), {
      type: 'plant/valve',
      id: 'jacuzzi.suction',
      open: false,
    });
    for (let t = 0; t < 10; t += 1) w = stepWorld(w, 1);
    expect(w.jacuzziCabinet.trip).toBe('no-flow');
  });
  it('makes a sample event line for each example node from its own source', () => {
    for (const [id, spec] of Object.entries(CHANGES))
      expect(sampleEvents(spec, newWorld()).length, id).toBeGreaterThan(0);
  });
});
