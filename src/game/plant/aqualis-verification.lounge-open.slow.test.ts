import { verificationSuite } from './aqualis-verification-suite.test-support';
import { WHY } from './aqualis-verification-known.test-support';

/**
 * Dr Aqualis's advice verified in the world: the Lounge (`pool_01`), the
 * pool OPEN (`doc/plans/aqualis-advice-verification.md`, Part 4). Known
 * failures are findings recorded in the plan doc, each with its reason.
 */
verificationSuite('pool_01', true, {
  'loop:chlorine-low': WHY.chlorineOvershoot,
  'loop:hypochlorite-tripped': WHY.chlorineOvershoot,
  'loop:chlorine-high': WHY.thioFalls,
  'twin:chlorine-high': WHY.thioFalls,
  'accuracy:chlorine-high': WHY.thioAccuracy,
  'accuracy:alkalinity-low': WHY.acidTakesAlkalinity,
  'accuracy:aggressive': WHY.acidTakesAlkalinity,
  'loop:alkalinity-high': WHY.alkalinityHighSlow,
  'twin:combined-high': WHY.shockCaustic,
  'loop:ph-high+alkalinity-low': WHY.phIntegralUndershoot,
  'loop:alkalinity-low': WHY.bicarbIntegralUndershoot,
  'twin:alkalinity-low': WHY.bicarbIntegralUndershoot,
  'loop:scaling': WHY.phIntegralUndershoot,
});
