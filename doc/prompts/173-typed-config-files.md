# 173: Kinds and traits as typed TypeScript configuration, edited by the command

The owner, 2026-11-04. Tools mission (the audit tools' owner, ahnaa_dmitrieva). Read `doc/plans/172-trait-hierarchy.md`, `AGENTS.md`'s registry rule and `doc/agent-tooling.md`'s "Rules for objects" first.

## Why

Missions 168–172 made kinds and composite traits JSON, because a command can change data more easily than code. A prototype (2026-11-04, outside the repository) showed a refactoring library makes the same edits to TypeScript just as easily: `magicast` (UnJS) and `ts-morph` each loaded a `defineKind({ … })` file, added a trait, added a `meta` block and changed a field in 13–21 ms, keeping comments, the project's formatter tidying the rest. TypeScript files bring compile-time type safety to every kind and trait (an unknown class, status, brand or trait name is a type error at once), comments, and go-to-definition. The owner chose TypeScript.

## What

1. **Add `magicast`** as a development dependency (the owner approved this tooling change, 2026-11-04, by taking the recommendation; stage `package.json`'s dependency change alone, with the lock file, per AGENTS.md).
2. **`defineKind` and `defineTrait`** (pure, typed, in `src/game/plant/`): identity functions whose parameter types carry the vocabulary: class, status, template, brand (`BrandId`), group, and trait names typed as primitive names or composite ids (from the composites' index), metadata as the union of the primitives' keys. What types cannot express (metadata implied by the kind's own traits, facet counts, conflicts, cycles) stays in the runtime validator and `check`.
3. **Migrate** every `kinds/<kind>.json` to `kinds/<kind>.ts` and every `traits/<trait>.json` to `traits/<trait>.ts` by a one-off script, the indexes gathering `*.ts`; validate as 171 did (the compiled registry equal to the JSON one, field for field; the validator; random spot checks with a recorded seed); remove the JSON files.
4. **The command edits the `.ts` files through magicast**: `register`, `unregister`, `set`, `unset`, `bind`, `trait define | edit | rename | remove` all write TypeScript, then run the formatter; atomic writes, whole-graph validation and `--dry-run` as now. Agents still never edit kind or trait files by hand.
5. **The JSON exports** (`audit/*.json`, mission 167) are unchanged: outsiders still get JSON.

## Later (the owner's direction, not this mission)

The owner wants world and level design to move to configuration edited by this kind of tool: the configuration of world objects, eventually every room's layout, and possibly control panels' layouts. This mission covers only the kind and trait tree and the registration of objects.

## Acceptance

- Every kind and composite trait is a `.ts` file using `defineKind`/`defineTrait`; a misspelt trait, class, status or brand fails the typecheck; the runtime validator and `check` still pass; the registry equals the JSON one.
- Each command edits the TypeScript files correctly (tested on a scratch directory), keeps comments, and leaves them formatted.
- `npm run -s audit -- help`, `AGENTS.md` and `doc/agent-tooling.md` describe `.ts` files.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry with the spot-check seed.
