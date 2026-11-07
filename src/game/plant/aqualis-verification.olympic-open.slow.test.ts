import { verificationSuite } from './aqualis-verification-suite.test-support';

/**
 * Dr Aqualis's advice verified in the world: the Olympic (`pool_02`), the
 * pool OPEN (`doc/plans/aqualis-advice-verification.md`, Part 4). Known
 * failures are findings recorded in the plan doc, each with its reason.
 */
verificationSuite('pool_02', true, {
  'twin:alkalinity-high':
    'diluting the Olympic scores worse at mixing: its pump-held free chlorine and pH, disturbed by the fresh water, outweigh the alkalinity and TDS gained (#74)',
});
