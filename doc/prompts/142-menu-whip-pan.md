# 142: The Esc menu: arrows and WASD stay off the game, and whip-pan between controls when zoomed

The owner, 2026-11-02: "When in the esc menu, the arrow keys, and wsad should not affect the game. When zoomed in it should flick (whip-pan) the camera to a control in that direction (if one exists)." A bug and a feature in one mission. Brief only; not started until the owner says. Read `CLAUDE.md`, `src/toolkit/controls/CLAUDE.md` (all input through the one control scheme) and `doc/agent-tooling.md` first.

## What there is now (checked 2026-11-02)

- **The menu:** the Esc menu is a 3D panel drawn over the game (`src/toolkit/menus/views/menu-overlay.ts`). Opening it sets `menuOpen` (`src/toolkit/controls/logic/menu-open.ts`), and the game runs on behind it without pausing.
- **The walker:** while `menuOpen` is set, `inputHeld()` in `src/toolkit/controls/input/first-person.ts` holds the walker still: its held keys are cleared and walking is multiplied by zero.
- **Menu navigation:** keys and pad buttons reach the menu through one reader (mission 096: `logic/menu-navigation.ts`, `menuStep`, spatial focus movement; `input/menu-input.ts`).
- **The zoom:** a click on a plate zooms the camera to it (the owner, 2026-10-28: `zoomTo(box)`, `zoomed`, `plateView`, `viewBetween`, eased over `ZOOM_SECONDS`), and zooming out returns to the whole panel.

## Part 1: the bug: arrows and WASD reach the game

With the Esc menu open, the arrow keys and W, A, S and D must change nothing in the game: no walking, turning, looking, crouching, flying, carrying, knob-turning, nor any room's own behaviour. Walking is already held, so something else still hears them.

- **Find the leak,** by reproduction in the browser, and write it down before changing anything. Candidates:
  - keyboard looking or turning paths that do not check `inputHeld()`;
  - handlers that read keys outside the control scheme;
  - a menu panel or sub-panel that is open without `menuOpen` set;
  - the dry peek or the noclip camera.
- **Fix it at the source:** while a menu has the controls, the scheme hands every key to the menu, and none to the game.
- **A test:** the pure part, which keys reach the game while `menuOpen` is set, tested beside it; plus a browser check (in the plan): open the menu, hold each of the eight keys, and the walker's pose and the world are unchanged.

## Part 2: the feature: whip-pan between controls when zoomed

While the menu is zoomed in on a plate, an arrow key or W, A, S or D (and a pad's d-pad or left stick, as the control scheme requires every action on every input) moves to the nearest control in that direction.

- **Choosing it:** the next control is chosen by the menu's own spatial focus rules (`menuStep`), across plates, not only within the zoomed one. If there is no control in that direction, nothing moves, and nothing in the game is touched either.
- **The whip-pan:** the camera flicks to the new control's plate, fast, as a camera operator's whip-pan: a short move (about 0.15–0.25 s) with a strong ease in and out, perhaps a touch of motion blur or smear if cheap, unlike the slower zoom (`ZOOM_SECONDS`). The focus moves with it, so Enter or A then uses that control. Where the new control is on the plate already zoomed, the camera does not move; only the focus does.
- **Unzoomed:** the arrows and WASD keep working the menu's focus as they do now, without moving the camera.
- **Repeated presses:** a held key repeats at the menu's own repeat rate, each step a fresh whip-pan from where the camera is, never queued behind the last.
- **Help line:** names the keys while zoomed, on each input (`logic/controls.ts`).

The view logic (choosing the target, the whip-pan's curve, its timing and interruption) is pure (`logic/`, tested beside it); the menu overlay only plays it.

## Acceptance

- With the Esc menu open, the eight keys change nothing in the game (browser check, recorded in the plan).
- Zoomed on a plate, each direction whip-pans to the right control, or does nothing where there is none; keyboard and gamepad both.
- The whip-pan reads as a flick, clearly quicker than the zoom (a short recording or frame sequence in the plan).
- No room binds a key of its own; everything goes through `src/toolkit/controls/`.

## Records

The plan in `doc/plans/142-menu-whip-pan.md`, with the leak found in Part 1; the CHANGELOG under Unreleased (`### Fixed` for Part 1, `### Added` for Part 2); `TODO.md`: this mission (it replaces the owner's bug-and-feature item of `fd96e14b`); `src/toolkit/controls/CLAUDE.md` if the scheme's rules change.
