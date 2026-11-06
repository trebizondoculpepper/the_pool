import { describe, expect, it } from 'vite-plus/test';
import { solveLounge } from './lounge-hydraulics';
import type {
  LoungeFilterValves,
  LoungeNetworkInput,
} from './lounge-hydraulics';
import { LOUNGE_SIZE, filterSizing } from './ideal-filter';

const ref = filterSizing(LOUNGE_SIZE).dirtRef;
/** A bed loaded to `share` of its dirt reference, and fissured `fissuring`. */
const bed = (share = 0, fissuring = 0) => ({
  dirt: share * ref,
  fissuring,
  unsettled: 0,
});
const SERVICE: LoungeFilterValves = {
  inlet: 1,
  outlet: 1,
  backwash: 0,
  drain: 0,
};
const BACKWASH: LoungeFilterValves = {
  inlet: 0,
  outlet: 1,
  backwash: 1,
  drain: 0,
};
const RINSE: LoungeFilterValves = {
  inlet: 1,
  outlet: 0,
  backwash: 0,
  drain: 1,
};
const design = (
  over: Partial<LoungeNetworkInput> = {},
): LoungeNetworkInput => ({
  pumps: [1, 0],
  filters: [SERVICE, SERVICE],
  beds: [bed(), bed()],
  wasteOpen: true,
  ...over,
});

describe('the Lounge circulation, one network (#59)', () => {
  it('shares its design flow equally between two clean filters, at their clean pressure difference', () => {
    const n = solveLounge(design());
    expect(n.toPool).toBeCloseTo(90, 0);
    for (const b of n.branches) {
      expect(b.outlet).toBeCloseTo(45, 0);
      expect(b.dp).toBeCloseTo(0.34, 2);
    }
  });

  it('sends less through a fouled filter and more through its partner: about 2:1 at four times the resistance', () => {
    // Dirt at three times its reference: four times a clean bed's resistance.
    const n = solveLounge(design({ beds: [bed(), bed(3)] }));
    const [clean, fouled] = n.branches.map((b) => b.outlet);
    expect(clean / fouled).toBeCloseTo(Math.sqrt(4), 0);
    expect(clean).toBeGreaterThan(45);
    expect(fouled).toBeLessThan(45);
    // The total falls along the pump's curve as the circuit resists more.
    expect(n.toPool).toBeLessThan(90);
    // Each gauge reads the loss across its own bed, the fouled one's higher.
    expect(n.branches[1].dp).toBeGreaterThan(n.branches[0].dp);
  });

  it('lets a pitted bed take more than its dirt alone would: water channels round the sand', () => {
    const dirty = solveLounge(design({ beds: [bed(), bed(1.5)] })).branches[1]
      .outlet;
    const pitted = solveLounge(design({ beds: [bed(), bed(1.5, 0.4)] }))
      .branches[1].outlet;
    expect(pitted).toBeGreaterThan(dirty);
  });

  it('gives less to the pool as both beds foul, more with both pumps', () => {
    expect(solveLounge(design({ beds: [bed(2), bed(2)] })).toPool).toBeLessThan(
      75,
    );
    expect(solveLounge(design({ pumps: [1, 1] })).toPool).toBeGreaterThan(95);
  });

  it('backwashes a filter with the other filter’s water, the two in series, the washed one reversed', () => {
    const n = solveLounge(design({ filters: [BACKWASH, SERVICE] }));
    const [washed, feeding] = n.branches;
    // Up through the washed bed at about its wash rate, out to waste.
    expect(washed.bed).toBeLessThan(-30);
    expect(washed.backwash).toBeCloseTo(-washed.bed, 1);
    // The other carries both the wash and what still goes to the pool.
    expect(feeding.outlet).toBeCloseTo(-washed.outlet + n.toPool, 0);
  });

  it('washes nothing with both filters set to backwash: there is no filtered water to wash them with', () => {
    const n = solveLounge(design({ filters: [BACKWASH, BACKWASH] }));
    expect(n.toPool).toBe(0);
    for (const b of n.branches) expect(b.backwash).toBe(0);
  });

  it('rinses a filter down to waste at about its service flow', () => {
    const n = solveLounge(design({ filters: [RINSE, SERVICE] }));
    expect(n.branches[0].drain).toBeCloseTo(45, 0);
    expect(n.branches[0].outlet).toBe(0);
  });

  it('settles in every valve setting, conserving water, with no flow where no head drives it', () => {
    for (let a = 0; a < 16; a++)
      for (let b = 0; b < 16; b++) {
        const v = (m: number): LoungeFilterValves => ({
          inlet: m & 1,
          outlet: (m >> 1) & 1,
          backwash: (m >> 2) & 1,
          drain: (m >> 3) & 1,
        });
        const n = solveLounge(
          design({
            filters: [v(a), v(b)],
            beds: [bed(0.6, 0.1), bed(0.6, 0.1)],
          }),
        );
        // Water is conserved at every filter: in at its inlet, out of its
        // outlet, backwash and drain (to 0.1 m³/h), and nothing runs wild.
        for (const x of n.branches) {
          for (const q of [x.inlet, x.outlet, x.bed, x.backwash, x.drain]) {
            expect(Number.isFinite(q), `${a},${b}`).toBe(true);
            expect(Math.abs(q), `${a},${b}`).toBeLessThan(150);
          }
          expect(
            x.inlet - x.outlet - x.backwash - x.drain,
            `${a},${b}`,
          ).toBeCloseTo(0, 1);
        }
      }
    // No pump running: nothing moves.
    expect(solveLounge(design({ pumps: [0, 0] })).toPool).toBe(0);
  });
});
