import { verificationSuite } from './aqualis-verification-suite.test-support';

/**
 * Mission 118's variant of the advice verification: the Lounge
 * (`pool_01`), the pool CLOSED, with
 * its CO₂ panel on its Trio (CO₂ first, acid trimming). The acid-only
 * suite beside it stays the baseline; differences are recorded in
 * `doc/plans/co2-system.md`.
 */
verificationSuite('pool_01', false, {}, true);
