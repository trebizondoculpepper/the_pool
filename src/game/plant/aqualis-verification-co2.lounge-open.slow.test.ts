import { verificationSuite } from './aqualis-verification-suite.test-support';
import { CO2_WHY, WHY } from './aqualis-verification-known.test-support';

/**
 * Mission 118's variant of the advice verification: the Lounge
 * (`pool_01`), the pool OPEN, with
 * its CO₂ panel on its Trio (CO₂ first, acid trimming). The acid-only
 * suite beside it stays the baseline; its known failures here are the
 * baseline's that remain and those CO₂ brings (`CO2_WHY`), the
 * differences recorded in `doc/plans/co2-system.md`.
 */
verificationSuite(
  'pool_01',
  true,
  {
    'accuracy:chlorine-high': WHY.thioAccuracy,
    'loop:aggressive': WHY.sampleSeesFeed,
    'loop:alkalinity-high': WHY.alkalinityHighSlow,
    'loop:chlorine-high': WHY.thioFalls,
    'loop:chlorine-low': WHY.chlorineOvershoot,
    'loop:hypochlorite-tripped': WHY.chlorineOvershoot,
    'loop:ph-high+alkalinity-low': WHY.phIntegralUndershoot,
    'loop:scaling': WHY.phIntegralUndershoot,
    'twin:acid-off': CO2_WHY.co2CarriesPh,
    'twin:chlorine-high': WHY.thioFalls,
    'twin:combined-high': WHY.shockCaustic,
  },
  true,
);
