import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { overConsent } from './sewer-monitor';
import { WET_HALL_PLANT as P } from './wet-hall';

/**
 * The sewer outfall's flowmeter and recorder in the world (the owner,
 * 2026-10-26): what the plant puts down the sewer, read and recorded
 * where it leaves.
 */
describe('the sewer outfall, in the world', () => {
  it('keeps the pit within the consent, both its pumps in HAND interlocked to one', () => {
    let w = newWorld();
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 50 } };
    for (const pump of [0, 1] as const)
      w = applyAction(w, {
        type: 'pit-pumps',
        action: { act: 'mode', pump, mode: 'hand' },
      });
    w = advance(w, 60, 1);
    expect(w.wetHall.pitPumps.running.filter(Boolean)).toHaveLength(1);
    expect(overConsent(w.sewer, P.sewerConsent)).toBe(false);
    expect(w.sewer.flow).toBeCloseTo(P.dischargeRate);
  });

  it('records BOOST at twice the normal discharge and over the sewer consent', () => {
    let w = newWorld();
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 50 } };
    w = applyAction(w, { type: 'pit-pumps', action: { act: 'boost' } });
    w = advance(w, 60, 1);
    expect(w.wetHall.pitPumps.running).toEqual([true, true]);
    expect(w.sewer.flow).toBeCloseTo(P.dischargeRate * 2);
    expect(overConsent(w.sewer, P.sewerConsent)).toBe(true);
  });
});
