# 172: Traits as a hierarchy, managed from the command line

The owner, 2026-11-04. Tools mission (the audit tools' owner, ahnaa_dmitrieva). Ready to build. The design, settled with the owner and reviewed by Codex, is `doc/plans/172-trait-hierarchy.md`: read it, then `AGENTS.md`'s registry rule and `doc/agent-tooling.md`'s "Rules for objects". Builds on 168 and 171; pass 2 (170) uses it.

## In short

- Primitive traits in code, grouped by facet (form, surface, support, connection, handling, use, role, service, and `decorative`), each with its meaning, implied metadata and defaults, and conflicts; composite traits as data, one JSON file each in `src/game/plant/traits/` with an index, built from primitives and other composites. Addition only.
- Implied metadata with defaults and precedence (kind, then nearest composite, then primitive); a floor-standing kind's floor is its local y = 0 plane by default; an origin audit finds builders that differ.
- Service traits are derived from the model's ports, never set by hand: an index for finding alike devices.
- A resolver makes a kind's expanded traits drive its affordances, with a migration gate for kinds not yet classified.
- The command line does everything without a browser: `traits`, `trait show | define | edit | rename | remove` (refused while used, listing users; `--replace-with`; `--dry-run`), `kinds --with`, `unclassified`, `set traits+= / traits-= / <metadata>=`, `unset`, `check`, `find`; `help` documents all of it. Every edit validates the whole graph.
- Renames: `portable` → `holdable`, `chair-like` → `sittable`.

## Acceptance

As in the plan: the validator, resolver and every command tested; `check` equals CI's validation; `help` complete; the engineers' office and a large cuboidal tank classified as worked examples in tests.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` and the command's `help`; a diary entry.
