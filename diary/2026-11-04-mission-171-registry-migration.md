# Development Diary Entry - 2026-11-04

## Context

- **Date**: 2026-11-04
- **Branch**: main
- **Contributors**: ahnaa_dmitrieva (Claude Code) + the owner

## Problem Statement

The owner wanted the object registry to be data rather than code: every object a registered kind, each kind one JSON file, changed only by a command so that no LLM edits the registry by hand (missions 168 and 171). Mission 168 built the tools; 171 migrates the hard-coded `equipment-kinds.ts` into the files, validates the migration, switches the game over and removes the hard-coded entries. The owner told me to do the migration myself and to carry another agent's uncommitted `sign` registration into it as it was.

## Our Approach

A one-off script (`scripts/registry-to-files.ts`) wrote each of the 106 kinds in `PLACED_KINDS` and `OTHER_KINDS` as `src/game/plant/kinds/<kind>.json`, with the index `kinds/index.ts` listing the placed and the other kinds (two lists, because `health.ts` checks at compile time that it covers every placed kind). Before switching, a temporary test compared the registry compiled from the files with the hard-coded one, field for field, and ran the validator over every file and the index. Then `equipment-kinds.ts` was changed to read the files, keeping every export.

## Implementation

- `src/game/plant/kinds/*.json` (106) and `kinds/index.ts`; `equipment-kinds.ts` now 168 lines, with no hand-written kinds.
- `kind-files.ts`: the index gathers the files (`import.meta.glob` in `kinds/index.ts`), so the test runner's persistent transform cache (`node_modules/.vitest-cache`, keyed by a module's text) cannot keep a stale list: the index changes whenever a kind comes or goes. The first attempt put the glob in `kind-files.ts`, which the cache had transformed while the directory was empty, and the registry read back as empty.
- The validator's rule that tag codes are unique was wrong: codes are shared by family (every tank is `T`, every control panel `CP`); 67 kinds share codes by design. The rule was removed and a new kind's code is simply its type's initials.
- `npm run -s audit -- help` prints every command, option, field, trait and mounting, the traits' meanings taken from `TRAIT_WORDS`.

## Outcomes

- Field-for-field comparison: all 106 kinds equal, groups included; the validator and the index check pass.
- **Random spot checks** (Python `random.seed(171)`, `random.sample` of the sorted kind ids, 5 kinds): `temperature-sensor`, `valve`, `mimic-wet`, `generator-point`, `hypo-tank`. Each compared by hand, the old TypeScript entry against its JSON file: type, code, class, status, template and purpose identical, and each in the right group (`valve` other, the rest placed).
- The plant tests (163 files) passed after the switch; the full suite and build were run before the push.

## Next Steps

Hand pass 1 (mission 169) to another agent: register what is unregistered, room by room, smallest first (`npm run -s audit -- rooms --by-size`), only through the command. Only 14 of the 135 rooms have catalogue data; the rest need their contents catalogued, or a browser check, before pass 1 can cover them.
