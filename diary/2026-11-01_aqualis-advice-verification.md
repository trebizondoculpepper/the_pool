# Development Diary Entry - 2026-11-01

## Request

The owner wanted tests that tell whether Dr Aqualis's water advice actually works, and fixes to whatever they show is wrong: hand doses that go in gradually, the pool OPEN or CLOSED, safety-first ranking, Show dose's solver run only on request, and a suite of tests covering diagnosis, prescription, ranking and the closed loop. Plan: `doc/plans/aqualis-advice-verification.md`.

## Implementation

The reference cases came first, at the owner's order: bicarbonate, soda ash, calcium chloride, acid at three alkalinities, hypochlorite, thiosulphate, the LSI and dilution, each against hand-worked trade and textbook figures. All agreed with the chemistry, so the model was left alone. Hand doses were first made to dissolve on their own. At the owner's change they now go in at once, or are fed at a rate (`dose … 1kg/min`); Show dose gives a rate to type in. That needed the Trio's pH control to be given an integral, so that the pH it leaves after a bicarbonate feed stays inside its alarm. The pool's OPEN or CLOSED is in the Trio's settings and unified with First Aid. The advice is ranked in three tiers, alkalinity before pH. Show dose's arithmetic is now worked out only when asked for, about 70 times cheaper for a live cabinet.

The suite (an operator reading the Trio and acting through world actions, follow against not follow, and negative controls) found a dozen bad instructions, each fixed. The worst were soda ash for a pH that rises on its own; thiosulphate the Trio chased with its own hypochlorite; bicarbonate fed into water already high in pH, past its alarm; and the Olympic's undersized acid pump left to work alone.

## Verification

The fast suite (diagnosis, 300 random waters, probe error, negative controls) passes. In the world, 188 checks pass. 45 known failures are each run as `it.fails` with their reason: most come from the model's fast CO₂ loss, the Olympic's undersized pumps by the owner's choice, and the Lounge's chlorine overshoot (a controller tuning trade that was tried and reverted). Hall 4's tests and authoring solver were re-run with the chemistry unchanged.
