# 148: Pool temperature controller model and mode switch

## Model choice

The single motorised LTHW valve is the fitting on each exchanger's primary-flow link. Remove the duplicate `temperature-control-valve` machine node and its control link. Add a `controlledBy` source node and output port to the schematic fitting, carry it through plumbing expansion, and expose it as a directed signal edge in the simulation graph. The fitting retains its existing id and derived tag, so the scene, world valve state and saved games keep their identities.

The owner also asked for command quantisation while this mission was in progress: round the command after interlocks to 0.1 of valve travel (the ten-segment bar's scale), while the actual actuator still travels over its finite stroke. The output law and valve movement remain separate.

The existing world calculates controller measurement from the pool's bulk water temperature. Keep that behaviour and model the Pt100 at the pool-water inlet to the exchanger, a representative pool return. Move its visual from the outlet to the inlet run, rename its schematic node, fixture and catalogue wording to pool-return Pt100, and connect the process sample from the pool-return source. Do not claim a separate exchanger-outlet measurement that the world does not calculate.

Keep asset-0166/PL1-TC1 and asset-0167/PL2-TC1. Remove the repeated `pool` from the two layout labels and update their register keys. The analogue/digital layout key suffixes remain only as compatibility keys for this migration; both placements build the same Water Margin controller chosen in mission 146.

## Mode and controls

Give OFF a saved world state rather than a view-only latch: it requests zero output and the existing finite-stroke valve closes. AUTO resumes proportional demand; HAND uses the saved manual output. `WORLD_VERSION` 77 was reserved on agent-inbox; its migration preserves old AUTO/HAND saves while new OFF saves persist. The view dispatches all three positions. The root click fault is the bound selector: from AUTO, the first turn requests OFF, but the old room binding discarded that edit, so the knob immediately reread AUTO from the world and snapped back. The set point and band dials must also be reached by room use raycasts and show their new values. The band dial had a second model fault: it changed a view-local number while the world used the legacy fixed 0.1 K thermostat band. Give the world a saved 1–10 K band, default 2 K to match the new controller, and make it drive the proportional output.

## Verification

Run schematic and plumbing checks, world and save tests, graph relation/state tests, room binding tests and focused component click tests with at most two workers. Check the room audit and simulation node pages for both plants. Use the shared dev server's Look links to inspect the installed controller and valve; test left and right clicks through HAND, OFF and AUTO and confirm controller state and valve demand follow. Then run typecheck, lint, formatting, build and the one announced full test run. Stage only mission 148 hunks from the shared checkout.

The browser room audit confirmed PL1-TC1, PL1-TE1 and PL1-HX1-CV1 have model bindings, no orphan, unbound or duplicate flags; the PL2 controller initially lost its model identity when the generic installed-object tag overwrote the special builder's identity. Preserving the built model identity removed its unbound flag. The control-bus conduit initially failed the scene-binding test in PL2 because its node lives in Olympic plumbing outside `SCHEMATICS`; it now binds to that node. PL2-TC1's corrected south-wall Look view sees 9/9 rays; both valve Look views resolve.

## Coordination

Mission 144's placement edits and mission 146's controller edits are presently uncommitted. Work in model and test files first; edit claimed view files when their owners release them. Reserve the world version by mailbox before changing `world.ts` or `save.ts`.
