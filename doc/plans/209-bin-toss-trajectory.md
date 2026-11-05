# 209: Bin-toss trajectory plan

The settled behaviour is in [the mission brief](../prompts/209-bin-toss-trajectory.md). This plan concerns the `bin-like` trait's shared toss, not the general throw of 211.

## Data and targeting

Extend the bin declaration in `src/toolkit/components/site-dressing/parts/bin-tossing.ts` with a circular target zone expressed by local Y-height and radius; derive its horizontal centre from the bin's declared inside. Give the skip, registered dustbin and engineer's office carton target zones. The carton is fixed on the office floor and combines `bin-like` with `box-like`; register or bind it through the audit command as required by the object's rules.

Use the same target and reach resolution as ordinary USE. When a held `holdable` item aims at a bin in that range, either USE or LET GO starts the guaranteed toss. Remove the near-bin magnet: aiming merely near a bin does not change the action. Keep all bin targeting and tossing in the shared trait and controls systems, not in a room-specific handler.

## Flight and landing

Replace the fixed-lift `binArc` with pure ballistic logic that chooses a plausible underarm launch through the circular target zone. Gravity determines the duration; crossing the target zone is required, while a near-vertical entry is only preferred. Do not test or avoid ceilings and ducts in this version. Turn the item toward a flat resting pose during flight. After its centre crosses the target zone, keep it within the bin's internal bounds, reflect impacts with about 20–30% momentum loss, and settle it on the existing pile. Every holdable is accepted, with no capacity check. Oversized items may visually overlap the bin until fit rules are designed. Items stay pick-upable.

## Verification

Test the pure arc and interior response for circular target crossing, gravity-dependent duration, rebound loss, and eventual rest. Exercise the skip, dustbin and carton from valid use positions. Verify USE and LET GO target the same bin, near misses do not trigger the bin toss, and all bin contents remain retrievable. Run the project checks before committing.
