import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';

// Hours of world time each: 3 to 4 s on CI's runner, near its 5 s limit.
describe('a pool’s thermostat, over hours', () => {
  it('heats the jacuzzi up to a higher setting, over hours', () => {
    const start = applyAction(newWorld(), {
      type: 'pool/setpoint',
      pool: 'pool_03',
      celsius: 39,
    });
    const later = advance(start, 4 * 3600, 5);
    expect(later.pools.pool_03.temperature).toBeGreaterThan(
      start.pools.pool_03.temperature + 1,
    );
    expect(later.pools.pool_03.temperature).toBeLessThan(39.3);
  });

  it('lets it cool to a lower one', () => {
    const start = applyAction(newWorld(), {
      type: 'pool/setpoint',
      pool: 'pool_03',
      celsius: 32,
    });
    const later = advance(start, 6 * 3600, 5);
    expect(later.pools.pool_03.temperature).toBeLessThan(
      start.pools.pool_03.temperature - 1,
    );
  });
});
