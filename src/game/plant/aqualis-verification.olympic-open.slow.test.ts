import { verificationSuite } from './aqualis-verification-suite.test-support';
import { WHY } from './aqualis-verification-known.test-support';

/**
 * Dr Aqualis's advice verified in the world: the Olympic (`pool_02`), the
 * pool OPEN (`doc/plans/aqualis-advice-verification.md`, Part 4). Known
 * failures are findings recorded in the plan doc, each with its reason.
 */
verificationSuite('pool_02', true, {
  'loop:chlorine-low': WHY.dmhChlorineOvershoot,
  'loop:chlorine-high': WHY.thioFalls,
  'twin:chlorine-high': WHY.dmhThioBackfire,
  'accuracy:chlorine-high': WHY.thioAccuracy,
  'loop:alkalinity-high': WHY.alkalinityHighOlympic,
  'loop:hypochlorite-tripped': WHY.dmhChlorineOvershoot,
  'loop:scaling': WHY.scalingOlympic,
});
