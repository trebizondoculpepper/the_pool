# 143: A 14-segment VFD, and the Wash-O-Tron's console on it

The owner, 2026-11-02: change the Wash-O-Tron's display from its dot-matrix character LCD to a 14-segment ("starburst") display, to make it look very period, early 1980s, as a vacuum fluorescent display (VFD); and "we can use a - dash instead of a colon". Brief only; not started until the owner says. Read `CLAUDE.md` (displays redraw only on change, the benchmark, new displays tried on dev0 first), `src/toolkit/components/AGENTS.md` and `doc/agent-tooling.md` first.

## What there is now (checked 2026-11-02)

- **The Wash-O-Tron's console** (`src/toolkit/components/plant/views/wash-o-tron.ts`, prompt 072) shows a two-line, 20-character LCD, `createCharacterLcd` (about line 388). Its text comes from `washDisplay` in `src/toolkit/components/plant/logic/wash-o-tron-display.ts`, which is pure: `[string, string]`, each 20 characters. Every string it shows is upper-case ASCII ("AIR SCOUR", "BACKWASH", "INTERLOCK", "LOW FLOW", "LOCKED OUT") with digits and times written `mm:ss`.
- **A VFD exists already:** `createVfd` (`src/toolkit/components/industrial-control/views/panel-instruments.ts`, about line 537), a line of characters drawn on a canvas, optionally as 5 × 7 dots, used in the racks room (`rooms/racks-room.ts`, about line 673). `display-reach.ts` has a `vfd` display kind with its own reach and fade (`seen(10, 85, 80)`). Reuse both: the starburst VFD is a sibling of `createVfd`, not a new system.
- **No 14- or 16-segment display** exists anywhere in the game.

## The display: a 14-segment VFD

- **The glyphs:** a pure, tested table (`logic/`) of which of the 14 segments (and the decimal point) each character lights: A–Z, 0–9, space, and the punctuation the game's text uses (`- + / \ * < > _ ' . , = ( )` and any others found by scanning the strings it will show). Follow a real starburst font (the common 14-segment ASCII tables), and check that M, W, K, X, V, N and Z read well. A character it cannot draw is a test failure, not a blank.
- **The colon:** none. Times are written with a dash (`02-30`), as the owner asked; the Wash-O-Tron's text changes `mm:ss` to `mm-ss` in `washDisplay`, its one change of wording.
- **The look:** a vacuum fluorescent display, drawn so it reads as one at a glance:
  - **colour:** the phosphor's cyan-green (about `#5effc8`), lit segments bright with a soft glow drawn under each stroke (a wider, fainter pass) rather than post-processing;
  - **ghost segments:** every unlit segment of every character faintly visible in a dim grey-green, which is the giveaway;
  - **strokes:** each segment a separate bar with slightly rounded ends and small gaps where segments meet;
  - **grid and filaments:** a very fine mesh over each character, at low contrast; and the filaments, a few hair-thin, nearly horizontal wires running the display's whole width;
  - **depth:** the segment plane set a few millimetres behind a tinted, slightly reflective glass, with the filaments between, so they shift against each other as the player moves; the segments self-lit (unlit material), as `createVfd`'s are;
  - **power-on:** at power-up every segment lights for a moment, as real VFD controllers did on reset; and off, it is dark glass, ghosts and all gone.
- **The rules:** the canvas is drawn and uploaded only when its text, power or brightness changes; any shimmer stays under 10 Hz or is left out. It uses `display-reach.ts`'s `vfd` kind. It goes on dev0's boards first, showing a test pattern and changing text, and through the component benchmark (`bench.html?bench=components&only=<name>`), within its budget.
- **The period:** a real product to model it after: an early-1980s 2 × 20 starburst VFD (Futaba and NEC made them for industrial controllers and terminals). Record the choice and its sources in `doc/research/`.

## The Wash-O-Tron on it

- **The swap:** the console's `createCharacterLcd` is replaced by the new display, two lines of 20, the same size window or near it; nothing else on the console changes, and `washDisplay` keeps producing the same lines (with the dash).
- **The housing:** if the console's look or maker's era clashes with an early-1980s VFD, note it for the owner rather than redesigning the console.
- **The checks:** its existing tests stay green (with `mm-ss`); screenshots of the console in each view (programme, interlock, the times) in the plan, by look link (`?room=<room>&look=<its tag>&mode=front`, `doc/agent-tooling.md`).

## Records

The plan in `doc/plans/143-starburst-vfd.md`; the research note; the CHANGELOG under Unreleased (`### Added` for the display, `### Changed` for the Wash-O-Tron); `TODO.md`: this mission, and other consoles that might suit the new display later (for the owner to choose).
