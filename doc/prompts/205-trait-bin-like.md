# 205: the `bin-like` trait: things thrown at a bin land in it

The owner, 2026-11-05: "our skips and bins need a trait, which is the behavior that you can throw objects into them, and those objects form a sort of magic parabolic arc to have them land perfectly in the bin every time"; "I think we need a bin-like trait that applies to skips and dustbins." `nicole_buruaah` wrote this brief and takes it, after mission 159 (one room factory) and after the holding traits (189 `holdable`, 181 `supportable`, 177 `box-like`), which it builds on. Read `CLAUDE.md` (the trait rules: every trait has a gameplay reason, its behaviour lives in code for the trait, never per kind or room), `src/toolkit/controls/CLAUDE.md` (carrying) and `doc/plans/176-completion-rulings.md`.

## Gameplay reason

Clearing up is part of the job: the player throws rubbish, broken parts and the skimmer's finds into a bin or skip from a step or two away, and it always goes in, landing on whatever is already there, with a clang or a thud. Aim matters a little (face the bin, be within reach); skill at throwing does not.

## What there is now (checked 2026-11-05)

- The rule is pure and tested: `src/toolkit/components/site-dressing/logic/bin-toss.ts` (`aimsAtBin`, `overBin`, `BIN_REACH` 1.5 m, `BIN_MAGNET_REACH` 2 m from the opening's nearest edge, `BIN_FACING` 40°, `binArc`, `arcSeconds`, `binRest` as the bin fills).
- The behaviour is one part, `createBinTossing` in `site-dressing/parts/bin-tossing.ts` (a let-go object near a bin flies a parabola into it, turns to lie flat, lands on the pile with a clang, and stays, locked), wired to the walker through `createFirstPerson`'s `divert`.
- Each room adds its own bins by hand (`tossing.add({...})`): dev5's skip (`rooms/bin-room.ts`), the repair room's skip, the skimmer reveal's skip (finds only, `takes`), Hall 5's bins (`museum/hall-5-day-in-the-life.ts`); `settling-room.ts` and `museum/exhibit-carrying.ts` use it too.
- None of these bins is a registered kind, so under the registry rule they are decoration. Bin models in the components: `createSkip` (`site-dressing/views/skip.ts`), `createWasteBin` (`waste-bin.ts`), `createLitterBin` (`courtyard-props.ts`), `createWheelieBin`, `createGritBin`, `createCigaretteBin` (`loading-dock/views/yard-kit.ts`), `createBinTrolley` (`cleaning-props.ts`).

## What to build

1. **The trait:** `bin-like`, a primitive in the role facet (beside `container`, which is about stock that runs out and is refilled, not about taking things thrown at it), words "things thrown at it from within reach fly in and stay", with metadata and defaults: reach (1.5 m), magnet reach (2 m), facing (40°), what it takes (everything, or a filter by trait such as `holdable`), its landing sound (steel clang, plastic thud). A composite `skip-like`/`dustbin-like` only if the kinds need one. Added through `npm run -s audit -- trait define` or in `traits.ts` with its test; the kinds through the audit command.
2. **The kinds:** `skip` and `dustbin` at least (and `wheelie-bin`, `litter-bin`, `grit-bin` only where a placement exists and they take things; a grit bin or cigarette bin that takes nothing is not bin-like), each with its form, support and handling (a skip `box-like, floor-standing, fixed, bin-like`; a wheelie bin `box-like, floor-standing, luggable, bin-like`), bound to their placements (`audit bind`).
3. **The behaviour from the trait:** the room factory (159) finds every placed `bin-like` object and gives it to one shared bin tossing, with its shape and footprint derived from its body (its opening's rim and its floor, as 175 derives surfaces) and its metadata; no room calls `tossing.add` by hand. What may be thrown is `holdable` (189); a room's special filter (the skimmer's finds) becomes the kind's or placement's `takes` metadata.
4. **Remove the hand wiring:** dev5, the repair room, the skimmer reveal and Hall 5 keep working the same with their `tossing.add` calls gone; the behaviour unchanged for the player.
5. **Audit:** the trait page for `bin-like` lists every bin in the world; the item audit shows each bin's derived opening and reach.

## Tests and checks

- Pure: the trait's facet and metadata defaults; the bin's opening and floor derived from a synthetic body; `takes` by trait; the existing `bin-toss` tests unchanged.
- Room-level: in dev5, a board let go facing the skip within reach lands in it; one let go elsewhere falls to the floor; the skimmer reveal's skip still refuses anything that is not a find.
- In the browser: throw something into each bin in dev5, the repair room, the skimmer reveal and Hall 5.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, targeted tests (`--maxWorkers=2`), `npm run build`, one full `npm test` announced on agent-inbox.

## Records

A plan in `doc/plans/205-trait-bin-like.md`; the CHANGELOG under Unreleased; `TODO.md` under "Each trait in code"; `doc/agent-tooling.md` if the audits change.
