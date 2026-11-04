# 171: Migrate the object registry to one file per kind, then retire the hard-coded registry

The owner, 2026-11-04. Brief only; not started until the owner says. Needs 168 (the tools: file format, index, loader, validator, commands). Read `doc/plans/168-audit-proposals.md` first.

## What

1. **Migrate:** a one-off script (`scripts/registry-to-files.ts`) writes `src/game/plant/kinds/<kind>.json` for every kind in today's hard-coded `EQUIPMENT_KINDS` (`src/game/plant/equipment-kinds.ts`), and the index `kinds/index.ts`, in the form 168's writers produce.
2. **Validate:**
   - a test that the registry compiled from the files equals today's `EQUIPMENT_KINDS`, entry for entry and field for field;
   - 168's validator passes on every file, and the index matches the directory;
   - **random spot checks** (the owner): a handful of kinds chosen at random, compared by hand between old and new through `npm run -s audit -- show <kind>` and the old source, recorded in the diary with the seed used;
   - the full suite, build, and a look at a few rooms' hover names and the item audit pages.
3. **Switch:** `equipment-kinds.ts` reads the compiled files (`EQUIPMENT_KINDS`, `PLACED_KINDS`, `OTHER_KINDS`, `KindId` from the index), keeping its exported names and functions so no caller changes.
4. **Retire:** remove the hard-coded entries from `equipment-kinds.ts` once validated; from then on kinds are changed only through `npm run audit -- register | set | unset | unregister | bind`.

## Coordination

`equipment-kinds.ts` is read by every mission and had another agent's uncommitted edit (the `sign` kind, 2026-11-04): claim it on the mailbox, migrate only from a committed state, and ask agents not to add kinds by hand during the switch. One push for migrate, validate and switch; the retirement may be the same push or the next.

## Acceptance

- Every kind is a file, the index matches, the compiled registry equals the old one, the spot checks are recorded, and the suite and build pass.
- `equipment-kinds.ts` holds no hand-written kind entries.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` (kinds are changed only by the command); a diary entry with the spot-check seed and results.
