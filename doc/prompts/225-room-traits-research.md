# 225: Research composable room traits for development rooms

This research mission is tracked in [issue #96](https://github.com/trebizondoculpepper/the_pool/issues/96); any implementation needs its own issue. The owner, 2026-11-07, wants the special-purpose behavior now embedded in development rooms identified and expressed as reusable, composable room features. Inspect the existing game, propose the trait vocabulary and migration path, and make no behavior changes.

## Question to answer

Which behaviors are currently selected by a room's identity or wired into an individual room, and what room traits would let any appropriate room opt into those behaviors without copying code or checking its name? The proposed room traits should follow the compositional intent of the existing object trait and facet system, while keeping equipment behavior with object kinds and world-wide player behavior with shared systems.

## Owner's starting examples

- Dev0 has an overlay in the upper left that logs button and equipment actions. Investigate a reusable room trait provisionally called `dev-button-log-overlay`: what events it consumes, how it is displayed, when it is cleared, and whether its logging source is already shared.
- Dev71 runs the phone interaction experiment: a message arrives 20 seconds after room entry and another at two minutes. Investigate the owner's requested `dev-mobile-phone-experiment-zero` as a dev-only composite or configured scenario trait, and identify any smaller reusable timing and inbox-delivery capabilities it should compose. Preserve the experiment's timing and restart behavior in the proposal.
- Prefix traits that exist only to support development or testing rooms with `dev-`. Give general traits names that describe their gameplay behavior, without a `dev-` prefix. Treat these names as proposals to verify against the code, except for the owner's requirement that the dev71 experiment carry the “Dev Mobile Phone Experiment Zero” name.

## Investigation

1. Enumerate every numbered dev room from `dev-room-links.ts` and the `?dev` catalogue, then trace its construction and lifecycle. Use `doc/agent-tooling.md` and its look, catalogue, descriptor and audit tools before inspecting a room visually or hunting scene objects. Inspect `src/main.ts`, room factories, room controllers, shared systems, world and save wiring, and the dev-room modules. Search for room-ID branches, per-room callbacks, scripts, overlays, custom control binding, timers, simulation stepping, rendering effects and exceptional state sharing. Include special behavior outside the dev-room modules when it is selected by a dev-room ID.
2. Build a source-backed inventory with one row per special behavior: room(s), user-visible purpose, trigger and lifecycle, state owner, source file and line, existing test coverage, and the reason it is special. Record ordinary room content or equipment placement separately so the inventory does not treat every different scene as a new trait. Check any approved `One-off (the owner, <date>):` rationale and say whether it still holds.
3. Classify each finding as a candidate room trait, a configuration of a reusable trait, object-kind/model behavior, a global system, ordinary room content, or a justified one-off. Explain the boundary decision. In particular, distinguish the existing `src/toolkit/gallery/views/room-traits.ts` (which projects object traits into rooms) from the proposed room-level trait registry; recommend whether that name or API should change to avoid confusion.
4. For each proposed room trait, specify its stable ID, gameplay reason, possible facet, typed configuration and defaults, owner of code and state, setup/step/teardown lifecycle, event inputs and outputs, save behavior, and how it composes with other traits. State dependencies, conflicts, ordering requirements and whether it can run in a non-dev room. Prefer a small set of parameterized capabilities over one trait per room, while retaining named composite experiments where that makes the room's purpose clear.
5. Map every inventoried behavior to its proposed home and every dev room to the traits it would declare. Show how room construction would resolve these declarations without adding room-name tests to shared code. Identify behavior that should remain where it is, migration prerequisites, risky interactions, and a safe implementation order. Account for issue #93's hand-kept starter list without silently absorbing unrelated routing work.

## Research deliverable

Write a reviewable report under `doc/research/` or `doc/plans/` with the inventory, proposed trait catalogue, dev-room-to-trait matrix, code evidence, alternatives considered, migration sequence, and unresolved owner decisions. Link the report from the research issue. Include a worked decomposition of dev0 and dev71, and at least one example of two traits composed in the same room. State acceptance checks that could prove a later implementation preserves behavior: dev0's log entries and lifecycle, dev71's two deliveries and reset on revisit, save-slot rules, input ownership, and a check that no new room-ID special cases were introduced. Do not implement the runtime or migrate rooms as part of this research assignment.

## Acceptance

The report is a complete, source-backed proposal covering every dev room and every identified exception, with clear boundaries between room traits, object traits, global systems, content and justified one-offs. It is sufficient for the owner to choose the initial trait set before implementation begins.
