import { verificationSuite } from './aqualis-verification-suite.test-support';
import { WHY } from './aqualis-verification-known.test-support';

/**
 * Dr Aqualis's advice verified in the world: the Olympic (`pool_02`), the
 * pool OPEN (`doc/plans/aqualis-advice-verification.md`, Part 4). Known
 * failures are findings recorded in the plan doc, each with its reason.
 */
verificationSuite('pool_02', true, {
  'loop:chlorine-high': WHY.thioFalls,
  'accuracy:chlorine-high': WHY.thioAccuracy,
  'accuracy:ph-low': WHY.sodaAshTakenBack,
  'accuracy:alkalinity-low': WHY.acidTakesAlkalinity,
  'loop:alkalinity-high': WHY.alkalinityHighOlympic,
  'loop:hardness-high': WHY.dilutionThinsChlorine,
  'loop:tds-high': WHY.dilutionThinsChlorine,
  'loop:combined-high': WHY.shockOscillates,
  'loop:ph-high+alkalinity-low': WHY.phHighOlympicSlow,
  'order:settles': WHY.phHighOlympicSlow,
  'loop:aggressive': WHY.bicarbOvershootsOlympic,
  'loop:scaling': WHY.scalingOlympic,
  'accuracy:scaling': WHY.scalingAccuracy,
});
