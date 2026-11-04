# 168: The audit command edits the registry

The owner, 2026-11-04. Brief only; not started until the owner says. Audit tooling (the designer's responsibility, ahnaa_dmitrieva). Read `CLAUDE.md`, mission 167 (the audit model and `npm run audit`), and `doc/agent-tooling.md`'s "Audit data and JSON". The two audit passes that use it are 169 (registration) and 170 (traits).

## Why

Agents auditing rooms keep getting stuck: the data runs out, they read code across many files or build scenes in Chrome, and they invent their own report formats (one ran to 5,384 lines). The owner's answer (2026-11-04): push as much of the work as possible back into dumb code, and drop proposals altogether. The audit command changes the configuration directly; git is the review (a bad change is rolled back) and CI validates. Agents never edit files by hand. Each registered kind is one JSON file in `src/game/plant/kinds/`, compiled into the registry at build (the owner, 2026-11-04). **This brief's earlier proposal and review-page design is superseded by the plan, `doc/plans/168-audit-proposals.md`, which is authoritative.**

## The command line

- `npm run -s audit -- propose-register <room> <thing> <kind|new:<kind>>` (pass 1, 169): this unregistered thing in this room is an existing kind, or needs a new one.
- `npm run -s audit -- propose-traits <kind> <trait,trait,…> [mount=…] --reason "…"` (pass 2, 170): this kind's traits and mounting.
- `npm run -s audit -- proposals [<room>|kinds]`, `withdraw <id>`.
- Every proposal is validated before it is written, with a clear error otherwise: the room and thing exist; the kind exists (or the new kind's name is free and well formed); traits are from the vocabulary and pass the consistency rules (170); it is not a duplicate or a no-op. The command attaches the evidence itself (the source scan below) and the effect (which rooms and copies it touches); the agent supplies only a short reason.
- Proposals are written by the command, deterministically, one file per room for pass 1 (`audit/proposals/rooms/<room>.json`) and one for pass 2's kinds (`audit/proposals/kinds.json`). Nothing else writes them.

## Source evidence, from Node

The command finds each kind's builder (its explicit adapter, model exhibit, the rooms' item builder, or standalone builder, as `adapterFor` resolves it) and scans its source files for behaviour: `uses.set`, `markUsable`, `parts.uses`, `declareSeat`, pick-up wiring. Each hit is `observed in source` with file and line. This answers most of what the data leaves `unknown` without a browser (the engineers' office trial found the PC's power button, the cupboards' drawers and doors, the simulator's door, the switch-fuse's handle and the chair this way). The audit's `default` evidence state is added: a value nobody declared is shown as `default`, never `declared`.

## The review page

`bench.html?bench=audit-review`: rooms with pending proposals, smallest first, then kinds; one card per proposal with the thing or kind, current and proposed values, the evidence with source links, its effect, and **Yes** / **No**. A click posts to a dev-server-only endpoint in the existing audit plugin (`scripts/audit-json-plugin.ts`), which records the decision in the proposal file; the static build has the page read-only.

## Applying

Kind registrations and traits move into a plain data file the registry reads (for example `src/game/plant/kind-affordances.json`), so applying an approval is writing a value, never editing TypeScript. **Yes** applies at once (the owner, 2026-11-04); the whole registry moves to JSON first (the owner, 2026-11-04). The plan: `doc/plans/168-audit-proposals.md`.

## Acceptance

- `propose-register`, `propose-traits`, `proposals` and `withdraw` work from Node alone, reject invalid input with clear messages, and write deterministic proposal files; tests cover each rejection.
- The source scan reports behaviour with file and line for the engineers' office's objects; defaults show as `default`.
- The review page shows the office's proposals and records Yes/No through the dev server; the static build shows them read-only.
- An approval reaches the registry's data file and the next `npm run audit` reflects it.

## Records

`doc/agent-tooling.md`; `TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
