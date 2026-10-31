import { describe, expect, it } from 'vite-plus/test';
import { waterFrom } from '../water/pool-chemistry';
import type { WaterSpec } from '../water/pool-chemistry';
import { advise, createDoseCache, doseFor } from './aqualis-advisor';
import { trioSettings } from './aqualis-world';
import {
  newDisplay,
  withShownDose,
} from '../../toolkit/components/plant/logic/aqualis-display';
import { TRIO_CHANNELS, readingsOf } from './aqualis-advice.test-support';

/**
 * Show dose worked out only on request (`doc/plans/aqualis-advice-verification.md`,
 * Part 5): the live advice carries `hasDose` and no amount; `doseFor`
 * gives the same amount `advise` with doses would; the cache works it out
 * once for each reading; the screen asks only while it is shown.
 */

const WATERS: Partial<WaterSpec>[] = [
  {},
  { alkalinity: 50, ph: 7.5 },
  { ph: 6.9, hardness: 60, tds: 1800, freeChlorine: 0.6 },
  { freeChlorine: 5, hardness: 1100, sulphate: 400 },
  { alkalinity: 260, ph: 7.7 },
];
const GOOD: WaterSpec = {
  ph: 7.3,
  alkalinity: 120,
  hardness: 250,
  tds: 900,
  temperature: 28,
  freeChlorine: 1.3,
  sulphate: 50,
};
const S = trioSettings('pool_01');

describe('Show dose on request', () => {
  for (const over of WATERS)
    it(`gives the same amounts as worked out at once: ${JSON.stringify(over)}`, () => {
      const r = readingsOf(waterFrom({ ...GOOD, ...over }), GOOD.temperature);
      for (const open of [true, false]) {
        const eager = advise(r, S, TRIO_CHANNELS, undefined, { open });
        const lazy = advise(r, S, TRIO_CHANNELS, undefined, {
          open,
          doses: false,
        });
        expect(lazy.map((a) => a.id)).toEqual(eager.map((a) => a.id));
        lazy.forEach((a, i) => {
          expect(a.dose).toBe(null);
          expect(a.hasDose).toBe(eager[i].dose !== null);
          expect(a.tier).toBe(eager[i].tier);
          expect(
            doseFor(a.id, r, S, TRIO_CHANNELS, undefined, { open }),
          ).toEqual(eager[i].dose);
        });
      }
    });

  it('the cache works it out once for each reading, again for a new one', () => {
    const cache = createDoseCache();
    const r = readingsOf(waterFrom({ ...GOOD, alkalinity: 50 }), 28);
    const a = cache('alkalinity-low', r, S, TRIO_CHANNELS);
    expect(a).not.toBe(null);
    expect(cache('alkalinity-low', r, S, TRIO_CHANNELS)).toBe(a);
    const b = cache(
      'alkalinity-low',
      { ...r, alkalinity: 40 },
      S,
      TRIO_CHANNELS,
    );
    expect(b!.amount).toBeGreaterThan(a!.amount);
  });

  it('the screen asks for it only on the doctor’s page with Show dose pressed', () => {
    const r = readingsOf(waterFrom({ ...GOOD, alkalinity: 50 }), 28);
    const advice = advise(r, S, TRIO_CHANNELS, undefined, { doses: false });
    let asked = 0;
    const fill = () => {
      asked++;
      return doseFor('alkalinity-low', r, S, TRIO_CHANNELS);
    };
    const s = newDisplay();
    expect(withShownDose(s, advice, fill)).toBe(advice);
    expect(withShownDose({ ...s, page: 'doctor' }, advice, fill)).toBe(advice);
    expect(asked).toBe(0);
    const shown = withShownDose(
      { ...s, page: 'doctor', showDose: true },
      advice,
      fill,
    );
    expect(asked).toBe(1);
    expect(shown[0].dose?.text).toMatch(/sodium bicarbonate/);
  });
});
