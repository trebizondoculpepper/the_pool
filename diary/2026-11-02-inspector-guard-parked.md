# Inspector guard parked (2026-11-02)

The owner asked for a guard that machines with buttons and actions cannot sit in a room without the information overlay, then (mid-work) said to park it and get ready for a new job. Status:

- **Done and verified**: `src/toolkit/gallery/logic/inspected-rooms.ts` (the `INSPECTED_ROOMS` list, wired rooms by starter) and `src/toolkit/gallery/logic/inspected-rooms.slow.test.ts` (builds the equipped rooms, shell rooms, main corridor and plant museum halls headless; fails on any room that places parts with uses but is not in the list). The main corridor is the one reported violation, kept green under `KNOWN_UNINSPECTED` per the owner's "test only, no fix yet". Verified the guard goes red without the exception entry, and green with it (reporting the corridor). Typecheck, lint, format clean; ~3 s, so a `*.slow.test.ts`.
- **Parked uncommitted**: the two files above, plus the CHANGELOG entry and the TODO item ("The inspector guard, and the main corridor's missing overlay").
- **When resumed**: fix the corridor by passing `inspect: createInspector(...)` in `main-corridor-room.ts` and move it from `KNOWN_UNINSPECTED` into `INSPECTED_ROOMS` in the same commit (the TODO item says so).
- **Also parked from earlier in the session**: the MightyPrint work is already pushed (`2151e4ae`), nothing pending there.
