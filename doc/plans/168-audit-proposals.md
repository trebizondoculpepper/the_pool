# 168 plan: audit proposals

Brief: [168](../prompts/168-audit-proposals.md). Owner's rulings (2026-11-04): agents propose through the audit command, never by writing files; the owner approves Yes/No on a web page; **Yes applies straight away**; **the whole object registry moves to JSON** so applying is writing data, never editing TypeScript.

## Contents

- Stage A: the registry as JSON
- Stage B: proposals from the command line
- Stage C: source evidence and honest defaults
- Stage D: the review page and applying
- Files, schemas and tests
- Risks

## Stage A: the registry as JSON

- `src/game/plant/kind-registry.json`: one object keyed by kind, each entry `{ group: "placed" | "other", type, code, class, status, template?, purpose, brand?, affordances? }`, keys sorted, two-space indented, one trailing newline (the form every writer uses, so diffs stay small). Pass 2 (170) later adds `traits` and `mount`.
- `equipment-kinds.ts` keeps its types and functions and reads the JSON (`resolveJsonModule` is on): `EQUIPMENT_KINDS`, `PLACED_KINDS` and `OTHER_KINDS` are derived from it, `KindId` stays the union of its keys, and a pure `validateRegistry` (tested) checks every entry at load: known `class`, `status`, `template` and `brand`; unique `code` within its group; non-empty `type` and `purpose`.
- Migration by script, once: `scripts/registry-to-json.ts` writes the JSON from today's TypeScript, and a test proves the derived `EQUIPMENT_KINDS` equals the old object, entry for entry. Coordinate first: `equipment-kinds.ts` has another agent's uncommitted edit (the `sign` kind, 2026-11-04); claim the file on the mailbox and migrate after it lands.

## Stage B: proposals from the command line

Commands (all through `npm run -s audit --`, Node only):

| Command                                                                                                                | Pass | Effect                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------ |
| `propose-register <room> <thing> <kind>`                                                                               | 1    | this thing is an existing kind                                                             |
| `propose-register <room> <thing> new:<kind> --type "…" --class plant\|non-plant\|decorative --purpose "…" [--code XY]` | 1    | register a new kind for it; the code is derived from the type if omitted, and must be free |
| `propose-traits <kind> <trait,…> [mount=floor:-y\|wall:-z\|ceiling:+y]`                                                | 2    | its traits and mounting (170's vocabulary and consistency rules)                           |
| `proposals [<room>\|kinds] [--pending]`                                                                                |      | list                                                                                       |
| `withdraw <id>`                                                                                                        |      | remove a pending proposal                                                                  |

Every option is validated before anything is written; a bad request exits with status 2 and one line saying what is wrong and what would be accepted (the room's things, the kinds that exist, the trait vocabulary). Duplicates and no-ops are refused. `--reason "…"` is required and short (one line, at most 200 characters); `--by` defaults to the mailbox identity in `agent-inbox.toml`, else `unknown`.

Files, written only by the command and the review endpoint, deterministic:

- `proposals/rooms/<room>.json` (pass 1, one per room, as the owner asked), `proposals/kinds.json` (pass 2).
- Each: `{ schemaVersion, subject, proposals: [...] }`; a proposal is `{ id, op: "register" | "traits", room?, thing?, kind, newKind?, traits?, mount?, reason, by, created, evidence: [{ at: "path:line", what }], effect: { rooms, copies }, status: "pending" | "approved" | "rejected", decided? }`. `id` is a short hash of op, subject and value, so the same proposal has the same id. Sorted by id.

## Stage C: source evidence and honest defaults

- **Finding a kind's code:** `adapterFor` (mission 130's adapters, 167's builders) says how a kind is built; its builder function's name leads to its definition (`export function <name>`), and the scan takes that file and the component files it imports, one level, within `src/toolkit/components/`. A layout-built kind uses `modelFor`'s branch for its key.
- **The scan** (pure, in `logic/audit-export/source-scan.ts`, tested on fixtures): `uses.set(`, `markUsable(`, `parts.uses`, `declareSeat(`, `createOfficeChair(`, pick-up wiring (`portable`, `objects`), and named parts, each hit with its file, line and the nearest name, as evidence `observed in source`.
- **Things with no kind:** a hit inside a kind's builder that names its own sub-object (the desk's chair, its PC) is offered as a pass-1 candidate: something with behaviour that may need its own kind.
- **`default` evidence:** a flag nobody declared is reported as `default`, never `declared`; an interaction left to default is `unknown`, no longer guessed from plant class.

## Stage D: the review page and applying

- `bench.html?bench=audit-review`: rooms with pending proposals, smallest first (by object count), then kinds. One card per proposal: subject, current and proposed values, reason, evidence with source links, effect, and **Yes** / **No**. Decided ones collapse below.
- **Endpoint** (dev server only, in `scripts/audit-json-plugin.ts`): `POST audit/decide` `{ file, id, decision }`. Writes are serialised. On **Yes** it applies at once: a `register` with `newKind` adds the entry to `kind-registry.json`; a `traits` writes the kind's `traits` and `mount`; then it marks the proposal approved with the date. On **No**, marked rejected. It answers with the updated proposal and the room's new audit; Vite reloads modules that read the registry.
- **Identity for things that have none:** registering a kind is data, but making the scene part carry it (the chair's hover name, its seat flag) needs its builder to mark it. The endpoint therefore also records the binding (`proposals/bindings.json`: room, thing, kind), the audit counts a bound thing as registered-pending-code, and `TODO.md`'s registry list names the builder to mark. The code change stays a person's or agent's job; everything else is data.
- **Static build:** the page is read-only (no endpoint), showing proposals and their decisions.

## Files, schemas and tests

New: `kind-registry.json`, `scripts/registry-to-json.ts`, `logic/audit-export/proposals.ts` (pure: validation, ids, file form), `logic/audit-export/source-scan.ts`, `views/audit-review-page.ts`; changed: `equipment-kinds.ts`, `scripts/audit.ts`, `scripts/audit-json-plugin.ts`, `audit-export.ts`, `doc/agent-tooling.md`.

Tests: the registry round trip and `validateRegistry`'s refusals; each command's refusals (unknown room, thing, kind, trait; taken code; duplicate; no-op; missing reason); ids stable; files byte-identical across runs; the scan on fixture sources (desk, cupboard, switch-fuse); applying a register and a traits proposal to a copy of the registry; the endpoint refusing in a static build.

## Risks

- The migration touches the registry every mission reads: do it in one push with the round-trip test, after the `sign` edit lands.
- The source scan is heuristic: it can miss behaviour wired in an unusual way. It only adds evidence; nothing is signed off on its silence.
- Writes from the browser to tracked files: limited to the endpoint, two files and fixed forms, dev server only.
