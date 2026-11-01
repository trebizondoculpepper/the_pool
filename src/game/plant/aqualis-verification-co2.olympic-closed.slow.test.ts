import { verificationSuite } from './aqualis-verification-suite.test-support';
import { CO2_WHY, WHY } from './aqualis-verification-known.test-support';

/**
 * Mission 118's variant of the advice verification: the Olympic
 * (`pool_02`), the pool CLOSED, with
 * its CO₂ panel on its Trio (CO₂ first, acid trimming). The acid-only
 * suite beside it stays the baseline; its known failures here are the
 * baseline's that remain and those CO₂ brings (`CO2_WHY`), the
 * differences recorded in `doc/plans/co2-system.md`.
 */
verificationSuite(
  'pool_02',
  false,
  {
    'accuracy:chlorine-high': WHY.thioAccuracy,
    'accuracy:scaling': WHY.scalingAccuracy,
    'loop:alkalinity-high': WHY.alkalinityHighOlympic,
    'loop:combined-high': WHY.shockOscillates,
    'loop:ph-high+alkalinity-low': CO2_WHY.chlorineRoundOlympic,
    'loop:scaling': WHY.scalingOlympic,
    'twin:acid-manual': CO2_WHY.co2CarriesPh,
    'twin:acid-off': CO2_WHY.co2CarriesPh,
  },
  true,
);
