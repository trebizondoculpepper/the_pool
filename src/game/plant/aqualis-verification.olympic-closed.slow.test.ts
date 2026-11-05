import { verificationSuite } from './aqualis-verification-suite.test-support';

/**
 * Dr Aqualis's advice verified in the world: the Olympic (`pool_02`), the
 * pool CLOSED (`doc/plans/aqualis-advice-verification.md`, Part 4). Known
 * failures are findings recorded in the plan doc, each with its reason.
 */
verificationSuite('pool_02', false, {});
