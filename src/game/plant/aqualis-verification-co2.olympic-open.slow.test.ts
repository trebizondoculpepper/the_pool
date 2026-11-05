import { verificationSuite } from './aqualis-verification-suite.test-support';

/**
 * Mission 118's variant of the advice verification: the Olympic
 * (`pool_02`), the pool OPEN, with
 * its CO₂ panel on its Trio (CO₂ first, acid trimming). The acid-only
 * suite beside it stays the baseline; differences are recorded in
 * `doc/plans/co2-system.md`.
 */
verificationSuite('pool_02', true, {}, true);
