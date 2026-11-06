# 19 plan: reclassify every kind onto the interaction traits

Issue #19; the owner, 2026-11-06. Reclassify every registered kind onto its true interaction class — `interactive`, `functional`, `readable`, `inspectable` or `decorative` — so none is left `unclassified`. Kinds change ONLY through the audit command (`npm run -s audit -- set <kind> traits+=…`), never by hand; git is the review and CI the validation.

## Where this stands

Wave 1 of #10's step 1 (PR #20) merged the class primitives: `InteractionClass` is `decorative | functional | readable | inspectable | interactive`, resolved by precedence `interactive > inspectable > readable > functional > decorative`, with an explicit `unclassified` sentinel (added per the reviews on PR #20) for kinds not yet on the ladder. `interactive ⇒ inspectable` is the only implication; `operable`, `openable`, `holdable`, `sittable` imply `interactive`. `readable` is constant content; `inspectable` is a state-driven read-out.

Before this sweep, nicole_buruaah's branch-wide count: **56 interactive, 31 readable, 30 decorative, 0 inspectable, 0 functional** — the `decorative` and `readable` counts are mislabels this mission corrects (tanks, pipework and carrying targets wrongly decorative; state-driven instruments wrongly readable).

## The sweep, in batches

Each batch is one commit of audit `set` commands, pushed, so reviewers can read the diff.

**Batch 1 (done, this PR): the first twenty kinds, in registry order.** Ten `set` commands, one test:

- `inspectable` (9): `acid-ibc`, `alarm-printer`, `annunciator`, `backwash-tank`, `balance-tank`, `bms-outstation`, `break-tank`, `calorifier`, `cartridge-filter` — tanks, filters, vessels and alarm/state read-outs, each with a live read-out (their `status` policy: `level`, `filter`, alarm traffic).
- `functional` (1): `carton` — a bin (bin-like), a real world role, not inert.
- `cctv` (1): `inspectable` — displays live camera views, caught by the batch test (its `board-like` carries `readable`, superseded by `inspectable`).
- Unchanged (10): `acid-pump`, `ahu-stack`, `balance-tank-panel`, `boiler`, `boiler-cascade`, `booster-set`, `butterfly-valve`, `cabinet-switch`, `cascade-manager` — already `interactive` through their composites (`operable` implies it).
- **The result is locked by `src/game/plant/reclassify.test.ts`**: the first twenty kinds and their honest classes, so a later audit `set` that changes one is seen.

Verification: `audit -- check` clean, `audit -- unclassified` empty, fast suite 5483 (+12 tests).

2. **State-bearing kinds** (cezary_cyaattaarji's list from the PR #17 review): `tank-like` (balance-tank, break-tank, backwash-tank, contact-tank, acid-ibc), `filter-like` (sand-filter, cartridge-filter), and the standalone vessels (hypo-tank, chem-bulk, chem-day, calorifier, low-loss-header, dosing-pot, heat-exchanger) — all state-bearing (status level/filter/none), so `inspectable`.
3. **Constant-content kinds** keep `readable` (sign, book, manual): verified, not changed.
4. **World-role kinds** — `walkable`, `supportable`, `rack`, `bin-like`, `water-body` implying `functional` (cezary's suggestion, taken to the reviews on #10): decide per batch; desks, shelves, bins, pools resolve `functional`.
5. **True set-dressing** gets `decorative` explicitly.
6. Ladders become `functional` via #18's `ladder` trait, not here.

## Verification

- `npm run -s audit -- check` after every batch.
- `npm run -s audit -- unclassified` — the goal is empty.
- The classification test (`traits.test.ts`) and the fast suite green.
- A final count printed for the PR: every kind on one of the five classes, none `unclassified`.

## Records

`TODO.md` (its #10 pointer notes this sweep), `CHANGELOG.md` under Unreleased, a diary entry; progress on issue #19 and this PR.
