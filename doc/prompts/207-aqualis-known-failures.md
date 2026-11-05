# Mission 207: clear the Aqualis advice suite's known failures

The owner, 2026-11-05: "make a prompt to fix all of those tests". The advice verification suite (`src/game/plant/aqualis-verification*.slow.test.ts`, driven by `aqualis-verification-suite.test-support.ts`) runs 74 checks as `it.fails`, each a finding with its reason in `src/game/plant/aqualis-verification-known.test-support.ts` (`WHY`, `CO2_WHY`). This mission works through them until none is left, or each that remains is one the owner has explicitly kept.

Read first: `doc/plans/aqualis-advice-verification.md` (Part 4, "Findings", "The Trio's pH anti-windup", "What still fails, and why"), `doc/prompts/done/102-olympic-hypochlorite-pump.md` or `doc/prompts/102-olympic-hypochlorite-pump.md`, `doc/prompts/101-water-chemistry-in-the-world.md`, `src/game/plant/aqualis-controller.ts`, and the TODO items under the Aqualis advice entry and "Olympic DMH accessory train and control tuning".

## Where things stand

- The Olympic's hypochlorite pump was already replaced (mission 102, 2026-11-01, `4160c4ca`): one Grundflow DMH 21-10 on a commissioned 60 % stroke dial, about 11.7 l/h delivered. The bigger pump brought new failures: the Trio's chlorine correction now overshoots and oscillates (`dmhChlorineOvershoot`) and rebounds high after thiosulphate (`dmhThioBackfire`).
- The Olympic's acid pump is still undersized, by the owner's choice in mission 101. That choice causes `alkalinityHighOlympic`, `phHighOlympicSlow`, `scalingOlympic`; `dilutionThinsChlorine` and `shockOscillates` are the hypochlorite side and should be re-checked against the DMH.
- Not every known failure is a fault to fix. Some are chemistry the game should keep (`shockCaustic`, `bicarbLiftsPh`, `co2CarriesPh`): for those the right fix may be the advice, or the check's criteria, not the model.

## The work, in order

1. **Re-baseline.** Run the eight slow files and record which known failures still fail, with each one's measured numbers. Remove any that now pass (the suite already catches these: an `it.fails` that passes fails the run).
2. **Trio controller tuning** (`chlorineOvershoot`, `dmhChlorineOvershoot`, `dmhThioBackfire`, `phIntegralUndershoot`, `chlorineRoundOlympic`): tune the chlorine correction against the turnover's dead time (the TODO notes that slowing it to the turnover took the Lounge to 1.68 mg/l but let it fall to 0.72 with bathers: find a scheme that does neither, e.g. a dead-time aware or rate-limited correction, per-pool integral time scaled to turnover). Same for the pH integral's undershoot. Keep the real Trio's behaviour plausible: settings a commissioning engineer could set, not magic.
3. **Upgrade the Olympic's acid pump to its correct size** (`alkalinityHighOlympic`, `phHighOlympicSlow`, `scalingOlympic`; the owner, 2026-11-05: "I wanted to upgrade the acid pump so that it was correctly sized", reversing mission 101's undersized choice). Size it from the Olympic's design acid demand (alkalinity 250 brought into band, scaling water held at alkalinity 190 against the CO₂ loss, with margin), and fit a real metering pump on the world's metering-pump model, as mission 102 did for hypochlorite: model, schematic, tag, local keys, commissioned stroke setting, faults on both control rooms. Reserve a `WORLD_VERSION` on the mailbox and migrate old saves to the new pump. Review the DMH's 60 % dial against its 12.5 l/h design peak at the same time. Update the plan doc and TODO, which still call the acid pump "the owner's choice".
4. **The advice** (`acidTakesAlkalinity`, `sampleSeesFeed`, `alkalinityHighSlow`, `thioFalls`, `thioAccuracy`, `bicarbLiftsPh`, `shockCaustic`, `shockOscillates`, `dilutionThinsChlorine`, `scalingAccuracy`, `bicarbThenCo2`, `co2CarriesPh`): for each, decide whether Dr Aqualis should advise differently (e.g. hold the acid pump while bicarbonate is fed, dose thiosulphate short of the aim to allow for the fall, give a shock's pH correction with it, a slower bicarbonate into a closed pool), whether the measurement is unfair (e.g. the accuracy check against a chlorine that falls on its own), or whether it is real chemistry to keep. Change the criteria only with a written reason in the plan doc, never just to pass.
5. **The skipped world test** (`src/game/world.test.ts`, "carries pool level and water quality forward when treatment loses power", skipped by the owner on 2026-10-22: 0.0162 against 0.015): find why, and bring it back or ask the owner.

## Rules

- Each finding fixed comes off `WHY`/`CO2_WHY` and the files' `known` maps in the same commit; one kept on purpose stays, its reason saying so and naming the owner's ruling.
- The model stays one model (`doc/plant-model.md`); no per-scenario special cases in the controller or the advice.
- Every change to warnings or faults shows on both control rooms.
- These are slow tests: announce each full `npm test` on the mailbox, one at a time per machine; between them run the single slow file you are working on.
- Update `doc/plans/aqualis-advice-verification.md` (the results table and "What still fails"), `TODO.md` and `CHANGELOG.md` as findings close.

## Done when

The suite has no known failures except those the owner has ruled to keep, each with its reason; the world test is unskipped or ruled on; the full `npm test` passes.
