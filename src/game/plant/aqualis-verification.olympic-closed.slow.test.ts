import { verificationSuite } from './aqualis-verification-suite.test-support';
import { WHY } from './aqualis-verification-known.test-support';

/**
 * Dr Aqualis's advice verified in the world: the Olympic (`pool_02`), the
 * pool CLOSED (`doc/plans/aqualis-advice-verification.md`, Part 4). Known
 * failures are findings recorded in the plan doc, each with its reason.
 */
verificationSuite('pool_02', false, {
  'accuracy:chlorine-high': WHY.thioAccuracy,
  'accuracy:ph-low': WHY.sodaAshTakenBack,
  'loop:alkalinity-high': WHY.alkalinityHighOlympic,
  'loop:combined-high': WHY.shockOscillates,
  'loop:ph-low+alkalinity-low': WHY.bicarbLiftsPh,
  'loop:aggressive': WHY.bicarbLiftsPh,
  'loop:scaling': WHY.scalingOlympic,
  'accuracy:scaling': WHY.scalingAccuracy,
});
