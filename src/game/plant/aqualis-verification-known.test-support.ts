/**
 * The advice verification suite's known failures, by cause
 * (`doc/plans/aqualis-advice-verification.md`, Part 4, "Findings"): each a
 * finding in the model, the plant or the Trio's controller that the
 * advice cannot put right, with its reason. The suite runs each as
 * `it.fails`.
 */
export const WHY = {
  chlorineOvershoot:
    'once the hypochlorite pump is dosing again the Lounge’s chlorine overshoots to about 2 mg/l: the Trio’s quarter-hour chlorine correction against a turnover’s dead time (controller tuning)',
  thioFalls:
    'after the thiosulphate the chlorine goes on falling on its own, below its band, before the pump catches it',
  thioAccuracy:
    'the chlorine falls on its own as well, so followed less not, a turnover after the feed, is off the thiosulphate’s aim',
  acidTakesAlkalinity:
    'the acid pump takes back a third or more of the bicarbonate’s alkalinity as it holds the pH up against the model’s fast CO₂ loss',
  alkalinityHighSlow:
    'left to the acid pump, which works to the pH: the alkalinity comes down only as the CO₂ the acid makes leaves, a round’s score rising as the pH does',
  alkalinityHighOlympic:
    'the Olympic’s undersized acid pump (the owner’s choice) cannot bring alkalinity 250 into its band in ten rounds',
  shockCaustic:
    'the shock’s hypochlorite carries caustic soda: the pH leaves its band while the pool is closed for it',
  shockOscillates:
    'after the shock and its thiosulphate the chlorine swings low as the undersized hypochlorite pump catches up',
  bicarbLiftsPh:
    'the bicarbonate, with the model’s fast CO₂ loss, takes a low pH up past the top of its band',
  bicarbOvershootsOlympic:
    'the bicarbonate lifts the pH past its alarm limit on the Olympic, whose undersized acid pump cannot keep pace',
  acidRestartTakesAlkalinity:
    'the restarted acid pump takes the alkalinity, already drifting down with the CO₂ loss, out of its band',
  phIntegralUndershoot:
    'the acid pump’s integral, wound up bringing the pH down, takes it below its band before it unwinds',
  phHighOlympicSlow:
    'the Olympic’s undersized acid pump takes the pH down too slowly for the bicarbonate to follow within ten rounds',
  sodaAshTakenBack:
    'the soda ash’s lift is taken back: the pH rises on its own as CO₂ leaves and the acid pump holds it at 7.3 either way',
  dilutionThinsChlorine:
    'the fresh water thins the chlorine, which the Olympic’s undersized hypochlorite pump cannot make up at once: a round’s score rises',
  scalingOlympic:
    'the Olympic’s undersized acid pump, even helped by hand, cannot hold the pH at alkalinity 190 against the CO₂ loss: the pH swings',
  scalingAccuracy:
    'the hand acid only stands in for the acid the pump would have given: followed less not is a third of its aim',
} as const;
