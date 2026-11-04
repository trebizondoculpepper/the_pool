# 168 plan: the audit command edits the registry, one file per kind

Brief: [168](../prompts/168-audit-proposals.md). The owner's rulings (2026-11-04): **no proposals, no review page**. The audit command changes the configuration directly; git is the review (a bad change is rolled back) and CI validates. The LLM never edits files by hand: it reads with the command and changes data with the command. Each registered kind is one JSON file in one directory, compiled into the registry at build.

## Contents

- Stage A: one JSON file per kind
- Stage B: the command edits it
- Stage C: source evidence and honest defaults
- Validation
- Tests and risks

## Stage A: one JSON file per kind

The owner (2026-11-04): each registered kind is **one JSON file in one directory**. Registering a kind is adding its file; unregistering is removing it; recategorising, traits, mounting and the floor plane are edits to that one file. Until the build it is just data; the build compiles the directory into the registry the game reads.

- `src/game/plant/kinds/<kind>.json`, the file name the kind's id, keys in a fixed order, two-space indented, one trailing newline (the only form any writer produces):

```json
{
  "group": "placed",
  "type": "Desk",
  "code": "DK",
  "class": "non-plant",
  "status": "none",
  "purpose": "…",
  "traits": ["box-like", "operable"],
  "mount": { "on": "floor", "face": "-y" }
}
```

- **Compiled at build:** `equipment-kinds.ts` gathers the directory with Vite's `import.meta.glob('./kinds/*.json', { eager: true })`, so the dev server, the build, the tests and the Node command (`runnerImport`) all see the files as one object with no extra step; `EQUIPMENT_KINDS`, `PLACED_KINDS`, `OTHER_KINDS` derive from it. A one-file change is picked up at once by the dev server.
- **`KindId`:** today a union of the registry's literal keys, used in 19 files. With a directory, the compiler cannot see the keys, so `KindId` becomes a checked string (`isKindId` at run time, the validator in CI). If the owner wants the compile-time union back, the command can write a generated `kind-ids.generated.ts` on every register and unregister, checked in sync by CI; not planned unless asked.
- Migration once, by `scripts/registry-to-files.ts`, writing one file per kind from today's TypeScript, with a test that the gathered registry equals today's object entry for entry. Coordinate first: `equipment-kinds.ts` has another agent's uncommitted edit (the `sign` kind); claim the file and migrate after it lands.
- Things with behaviour but no identity of their own in the scene (the desk's chair, its PC) are tied to their kind by a `bindings` list in the kind's own file (`"bindings": [{ "room": "engineers_office", "thing": "desk-chair" }]`); the audit counts them registered and lists the builder that still has to mark them in code.

## Stage B: the command edits it

All through `npm run -s audit --`, Node only, each one change, written at once:

| Command                                                                                  | Does                                                                                           |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `show <kind>`                                                                            | prints the kind's document, its placements and its source evidence                             |
| `register <kind> --type "…" --class … --purpose "…" [--code XY] [--group placed\|other]` | adds a new kind's document (code derived from the type if omitted)                             |
| `set <kind> <field>=<value> …`                                                           | changes fields: `traits=box-like,operable`, `mount=floor:-y`, `type=…`, `class=…`, `purpose=…` |
| `unset <kind> <field>`                                                                   | removes an optional field                                                                      |
| `bind <room> <thing> <kind>`                                                             | ties a thing with no identity of its own to its kind                                           |
| `room <room>`, `kind <kind>`, `index`, `rooms --by-size`                                 | read, as now (167)                                                                             |

Every change touches one file and prints what it changed (the field's old and new value). Nothing else writes the kinds' files, and agents never edit them by hand.

## Stage C: source evidence and honest defaults

- **Finding a kind's code:** `adapterFor` says how a kind is built; its builder's name leads to its definition (`export function <name>`), and the scan takes that file and the component files it imports, one level, within `src/toolkit/components/`. A layout-built kind uses `modelFor`'s branch for its key.
- **The scan** (pure, `logic/audit-export/source-scan.ts`, tested on fixtures): `uses.set(`, `markUsable(`, `parts.uses`, `declareSeat(`, pick-up wiring and named parts, each with file, line and the nearest name, as evidence `observed in source`, shown by `show` and in the room and kind audits. A hit naming a sub-object with no kind (the desk's chair) is listed as a candidate to `register` and `bind`.
- **`default` evidence:** a value nobody set is reported as `default`, never `declared`; an interaction left to default is `unknown`, not guessed from plant class.

## Validation

One pure validator (`validateRegistry`, tested) checks every document: required fields; known `class`, `status`, `brand`; unique `code` per group; traits from 170's vocabulary and its consistency rules (decorative never with operable, chair-like, portable or luggable; portable and luggable never together; decorative with box-like flagged); a mounting `on` of floor, wall or ceiling with a face of `±x`, `±y` or `±z`; every binding naming a room, a thing and a kind that exist. The command runs it before writing, so an obviously bad value is refused at once with the field and the reason (cheap, and it saves a CI round trip); CI runs it with the tests on every push (the owner: validation is CI's job).

## Tests and risks

Tests: the per-file registry equals today's (round trip); the validator's refusals; each command's effect on a copy of the registry and its printed change; byte-identical output across runs; the scan on fixture sources (desk, cupboard, switch-fuse).

Risks: the migration touches what every mission reads, so it goes in one push with the round-trip test; the scan is heuristic and only adds evidence; with one file per kind, two agents rarely touch the same file; the command still writes atomically (a temporary file, then a rename) and re-reads before each change.
