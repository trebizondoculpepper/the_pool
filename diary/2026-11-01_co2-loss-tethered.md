# Development Diary Entry - 2026-11-01

## Request

The owner's top priority, before CO₂ dosing (mission 118): the model lost carbon dioxide from the water far too fast, so the acid pumps worked several times as hard as a real pool's, the Lounge's pH left its band, the spas could not hold any alkalinity in band, and most of the advice suite's known failures followed from it. His rule: tether it to reality first, then fix it. Plan and log: `doc/plans/aqualis-advice-verification.md` ("CO₂ loss reference cases" and "Mission 118: the CO₂ loss").

## Implementation

Wojtowicz's own paper (JSPSI 1(3), 1995) was read directly. Two things were wrong with how the model used it. His test pool's surface/volume was 0.919 m⁻¹, not the 0.67 the model took. His quadratic in turnovers rests on three pump duty cycles only (0, 2.47 and 7.41 turnovers a day), and the model ran it to 160. The reference cases (`co2-loss-reference.test.ts`) check his measured constants, his general equation in his range, transfer velocities against calm and stirred water, his Table 2 pH drifts and a hot tub's jets; 19 of 23 failed on the old model. The fix holds the turnovers at 7.41, corrects the reference, and adds a spa's jets and blower as aeration of their own, fitted to a hot tub's pH 7.6 to 8.0 in 2 to 4 hours. `SETTLED` was re-run on the bench (Lounge 77, Olympic 75, Jacuzzi 111, Footbath 62), and a new game now starts every pool at the Trio's 120.

## Challenges

No citable figure for a commercial indoor pool's daily acid use was found, so the acid figures are derived from Wojtowicz's law within its range rather than checked against a trade number. The slower loss uncovered a controller effect the fast loss had hidden: bicarbonate fed into the Lounge's balance tank lifts the Trio's sample, its pH integral winds up the acid, and the acid's CO₂ now lingers, holding the pool's pH low for hours. It was recorded as known failures for the owner, not tuned away, since the Trio's controller is being changed for CO₂ dosing. Two Hall 4 cards keep their authored alkalinity so their puzzles stand.

## Outcome

The Lounge's acid on the same water fell from 37 to 13 l/day and its alkalinity drift from 34 to 11 mg/l a day. The spas start in the PWTAG band with LSI near nought. The advice suite has 9 known failures fixed, 8 new ones found, and 44 left. Every Hall 4 card is solvable at its unchanged pars.
