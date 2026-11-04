# 169: Audit pass 1: everything is a registered kind

The owner, 2026-11-04. Ready to implement. Read `AGENTS.md` (the rule "Every object is a registered kind…"), then `doc/agent-tooling.md`, section "Rules for objects", and run `npm run -s audit -- help`. Pass 2 (traits and mounting) is 170, not this mission.

## The rule

In the new world everything is a registered kind (the owner, 2026-11-04). Many things were modelled but never registered because nothing ever asked (the engineers' office's safety notice, its desk's chair and PC, the software boxes). This pass finds them and registers them. It does not judge a kind's traits or mounting: that is pass 2.

## Tools: the audit command only

Kinds are typed TypeScript files since mission 173 (`src/game/plant/kinds/<kind>.ts`, `defineKind`). Never edit them or `kinds/index.ts` by hand, never use Chrome, never run whole-game audits.

- `npm run -s audit -- help`: every command and option.
- `npm run -s audit -- rooms --by-size`: rooms, smallest first.
- `npm run -s audit -- room <room> --summary`: what the room holds, and its findings.
- `npm run -s audit -- show <kind>`: a kind's file, placements and source evidence (each click use, seat, pick-up and part, with file and line).
- `npm run -s audit -- register <kind> --type "…" --class plant|non-plant|decorative --purpose "…" [--group placed|other]`.
- `npm run -s audit -- bind <room> <thing> <kind>`.

## Method: one room at a time, smallest first

Start with `air_plant`, `loading_bay`, `main_corridor`, `switch_room`, `engineers_office`, then up the `rooms --by-size` list.

1. Run `room <room> --summary`. List anything unregistered, and anything the findings or the `show` evidence of its kinds reveal that has behaviour (a click use, a seat, a pick-up) but no kind of its own: in the engineers' office, the desk's chair and PC and the software boxes.
2. For each: if an existing kind fits, `bind` it; otherwise `register` a new kind (a lower-case hyphenated id, a short type, a one-sentence purpose), then `bind` it.
3. Do not set traits or mounting (pass 2).
4. Re-run `room <room> --summary`: the room is done when nothing in it is unregistered.
5. Commit that room's changes alone (only the files the command wrote), its name in the message, after the project's checks (`AGENTS.md`); push. One room per commit.

## Known traps (2026-11-04)

- **A new kind needs a 3D form.** `src/toolkit/gallery/views/magic-adapters.test.ts` requires every kind to have a magic room or a recorded reason it has none, and that is code (`views/magic-builders.ts`), not something the command writes. When you register a kind the room layouts do not place, run `npx vp test run src/toolkit/gallery/views/magic-adapters.test.ts`; if it fails for your new kind, do not edit `magic-builders.ts` yourself: mail ahnaa_dmitrieva (the audit tools' owner) the kind and its builder from `show`, and wait for it before pushing that room. `office-chair`, `office-computer` and `software-box` already have builders.
- **Bindings, not manifest edits.** A thing in a room's manifest (the office's software boxes) is registered by `bind`; the room audit then counts it registered. Do not edit `logic/audit-export/manifests.ts`.
- **One room per commit, small.** Run the targeted tests above and `npm run -s audit -- check` before the full suite; push each room as soon as it is green, so nothing is left uncommitted.

## Coordination

Claim the work on agent-inbox before starting and announce each pushed room. Ask the owner one question at a time where a classification is genuinely unclear. A room with "no catalogue data" (121 of 135 today) is skipped and listed in the final report, not built in a browser.

## Acceptance

- Each audited room reports nothing unregistered; the engineers' office and the switch room are done first, as worked examples.
- A final report: rooms done, kinds registered, things bound, rooms skipped and why.

## Records

`TODO.md` (rooms done, by date); a diary entry per working session.
