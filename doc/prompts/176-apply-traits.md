# 176: Audit pass 2, phase 2: apply the approved traits, then enforce them

The owner, 2026-11-04. Brief only; not started until the owner says. Phase 2 of pass 2; phase 1 is mission 170, whose approved trait list (`doc/plans/170-trait-vocabulary.md`) this mission starts from. Uses the audit command (`npm run -s audit -- help`; missions 168, 172, 173) and the trait pages (174).

## What

1. **Define the approved composites** with the command only: `npm run -s audit -- trait define <name> --extends … --description "…" [--set k=v]`, exactly as approved.
2. **Apply them to the kinds**, kind by kind, simplest and most common first: `npm run -s audit -- set <kind> traits=…`, with metadata only where it differs from the defaults (`origin=centre`, `axis=x` …). Never edit kind or trait files by hand.
3. **Check as you go:** `npm run -s audit -- check` (facet rules: one form at most, exactly one support, exactly one handling), `unclassified` and `kinds --without support` show what is left; the item audit's traits and the trait audit pages (174) show each kind's result and what else shares a trait, so a misfit stands out.
4. **Small commits:** a group of kinds per commit, each after the targeted tests and `check`, pushed at once.
5. **Enforcement, last:** once every registered kind has at least one trait (`unclassified` empty), switch on the rule that every object must have one: `check` and the test suite fail for a kind with no traits, and `register` asks for traits (or `--traits`) when a kind is created. The owner switches it on when `unclassified` is empty.

## Acceptance

- Every registered kind has traits (and a support), from the approved list; `check` passes; `unclassified` is empty.
- Enforcement is on: a kind with no traits fails `check` and the tests, and `register` requires traits.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` (the enforcement rule); a diary entry per working session.
