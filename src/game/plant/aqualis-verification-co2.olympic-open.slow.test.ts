import { verificationSuite } from './aqualis-verification-suite.test-support';
import { CO2_WHY, WHY } from './aqualis-verification-known.test-support';

/**
 * Mission 118's variant of the advice verification: the Olympic
 * (`pool_02`), the pool OPEN, with
 * its CO₂ panel on its Trio (CO₂ first, acid trimming). The acid-only
 * suite beside it stays the baseline; its known failures here are the
 * baseline's that remain and those CO₂ brings (`CO2_WHY`), the
 * differences recorded in `doc/plans/co2-system.md`.
 */
verificationSuite(
  'pool_02',
  true,
  {
    'loop:chlorine-low': WHY.dmhChlorineOvershoot,
    'twin:chlorine-high': WHY.dmhThioBackfire,
    'loop:hypochlorite-tripped': WHY.dmhChlorineOvershoot,
    'accuracy:chlorine-high': WHY.thioAccuracy,
    'loop:alkalinity-high': WHY.alkalinityHighOlympic,
    'loop:chlorine-high': WHY.thioFalls,
    'loop:scaling': WHY.scalingOlympic,
    'twin:acid-manual': CO2_WHY.co2CarriesPh,
    'twin:acid-off': CO2_WHY.co2CarriesPh,
  },
  true,
);
