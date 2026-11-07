import { verificationSuite } from './aqualis-verification-suite.test-support';

/**
 * Mission 118's variant of the advice verification: the Olympic
 * (`pool_02`), the pool CLOSED, with
 * its CO₂ panel on its Trio (CO₂ first, acid trimming). The acid-only
 * suite beside it stays the baseline; differences are recorded in
 * `doc/plans/co2-system.md`.
 */
verificationSuite(
  'pool_02',
  false,
  {
    'twin:alkalinity-high':
      'diluting the Olympic scores worse at mixing: its pump-held free chlorine and pH, disturbed by the fresh water, outweigh the alkalinity and TDS gained (#74)',
  },
  true,
);
