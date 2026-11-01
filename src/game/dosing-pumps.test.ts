import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from './world';

describe('the Olympic DMH installed in the world', () => {
  it('keeps its modeled relief and bleed valve in step with the pump action', () => {
    const fresh = newWorld();
    expect(fresh.dosingPumps.pool_02.hypochlorite.kind).toBe('motor');
    expect(fresh.installedValves['PL2.hypo.return.bleed']).toBe(false);
    const open = applyAction(fresh, {
      type: 'dosing-pump',
      action: {
        act: 'bleed',
        pool: 'pool_02',
        chemical: 'hypochlorite',
        open: true,
      },
    });
    expect(open.installedValves['PL2.hypo.return.bleed']).toBe(true);
    expect(open.dosingPumps.pool_02.hypochlorite.state).toMatchObject({
      bleedOpen: true,
    });
  });
});
