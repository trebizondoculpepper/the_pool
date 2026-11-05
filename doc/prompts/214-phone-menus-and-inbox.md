# 214: the phone's menus and sample inbox

The owner, 2026-11-05. This follows [213](213-phone-model-and-raise.md): its raised handset and black screen become a small, usable Series 60-inspired interface. [215](215-phone-message-trial.md) will deliver timed messages later. This mission has no fault scenario or live message delivery.

## Gameplay reason

The player needs a familiar way to browse reports and clues on the in-game phone. The menu should feel like an early Nokia smartphone while remaining readable and quick to use in a running 3D game.

## Scope settled with the owner

- Opening the phone shows its **main menu**, not a message directly. An envelope icon opens **Messages**, which leads to **Inbox**. The inbox lists messages in reverse chronological order, newest first. Opening a message shows its text in a compact viewport of roughly four lines; longer text can scroll.
- Prepopulate the inbox with a few plain sample texts (for example, “Here is the first message” and “Here is the second message”) so the navigation can be tested without delivery or timers. Include a visible unread message indicator on the main menu and distinguish unread from read in the inbox.
- While the phone is open, **W/S** move through lists or text, **A** goes back, and **D/E** select or open. Escape backs out one phone level, then lowers the phone at its main menu; only a later Escape reaches the game's menu. Give gamepad and touch equivalent navigation through the same control scheme. The world keeps running, but movement and world use do not receive these phone inputs.
- Use 213's handset and screen area. Keep this an interface prototype: no calls, outgoing messages, web browser, contacts, scenario objective rules, pager scripting, or persistence design yet. Do not hard-code menu behaviour into one room.

## Acceptance

From a fresh game, the player can raise the phone, navigate Main Menu → Messages → Inbox → a sample message, scroll a long message, back out and lower the phone on keyboard, gamepad and touch. A second Escape after lowering reaches the game menu. The inbox order and unread/read cues are visible; a carried item remains held and returns after closing. The display remains legible at phone-view size and redraws only when its visible content changes, per the project's display rule.

## Dependencies and records

213 supplies the model, screen and raise/lower state. 215 waits on this mission's inbox and shared message-entry API. Keep `TODO.md`, `CHANGELOG.md` and the controls guide current when implementing; run the required checks.
