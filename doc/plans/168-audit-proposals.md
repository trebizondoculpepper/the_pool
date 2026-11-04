# 168 plan: the audit command edits the registry

Brief: [168](../prompts/168-audit-proposals.md). The owner's rulings (2026-11-04): **no proposals, no review page**. The audit command changes the configuration directly; git is the review (a bad change is rolled back) and CI validates. The LLM never edits files by hand: it reads with the command and changes data with the command. The whole object registry is JSON, and each kind's configuration is one JSON document.

## Contents

- Stage A: the registry as JSON
- Stage B: the command edits it
- Stage C: source evidence and honest defaults
- Validation
- Tests and risks

## Stage A: the registry as JSON

- `src/game/plant/kind-registry.json`: one document per kind, keyed by kind, keys sorted, two-space indented, one trailing newline (the only form any writer produces, so diffs stay small):

```json
"desk": {
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

- `equipment-kinds.ts` keeps its types and functions and reads the JSON (`resolveJsonModule` is on); `EQUIPMENT_KINDS`, `PLACED_KINDS`, `OTHER_KINDS` and `KindId` derive from it. 170 adds `traits` and `mount`; the flags 158–165 use derive from traits.
- Migration once, by `scripts/registry-to-json.ts`, with a test that the derived registry equals today's object entry for entry. Coordinate first: `equipment-kinds.ts` has another agent's uncommitted edit (the `sign` kind); claim the file and migrate after it lands.
- Things that have behaviour but no identity of their own in the scene (the desk's chair, its PC) are tied to their kind in `src/game/plant/kind-bindings.json` (room, thing, kind); the audit counts them registered, and lists the builder that still has to mark them in code.

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

Every change prints what it changed (the field's old and new value). Nothing else writes the registry or the bindings.

## Stage C: source evidence and honest defaults

- **Finding a kind's code:** `adapterFor` says how a kind is built; its builder's name leads to its definition (`export function <name>`), and the scan takes that file and the component files it imports, one level, within `src/toolkit/components/`. A layout-built kind uses `modelFor`'s branch for its key.
- **The scan** (pure, `logic/audit-export/source-scan.ts`, tested on fixtures): `uses.set(`, `markUsable(`, `parts.uses`, `declareSeat(`, pick-up wiring and named parts, each with file, line and the nearest name, as evidence `observed in source`, shown by `show` and in the room and kind audits. A hit naming a sub-object with no kind (the desk's chair) is listed as a candidate to `register` and `bind`.
- **`default` evidence:** a value nobody set is reported as `default`, never `declared`; an interaction left to default is `unknown`, not guessed from plant class.

## Validation

One pure validator (`validateRegistry`, tested) checks every document: required fields; known `class`, `status`, `brand`; unique `code` per group; traits from 170's vocabulary and its consistency rules (decorative never with operable, chair-like, portable or luggable; portable and luggable never together; decorative with box-like flagged); a mounting `on` of floor, wall or ceiling with a face of `±x`, `±y` or `±z`; every binding naming a room, a thing and a kind that exist. The command runs it before writing, so an obviously bad value is refused at once with the field and the reason (cheap, and it saves a CI round trip); CI runs it with the tests on every push (the owner: validation is CI's job).

## Tests and risks

Tests: the registry round trip; the validator's refusals; each command's effect on a copy of the registry and its printed change; byte-identical output across runs; the scan on fixture sources (desk, cupboard, switch-fuse).

Risks: the migration touches what every mission reads, so it goes in one push with the round-trip test; the scan is heuristic and only adds evidence; several agents running `set` at once on one shared checkout write the same file, so the command writes atomically (write a temporary file and rename) and re-reads before each change.
