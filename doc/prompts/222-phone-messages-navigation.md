# 222: Reliable Messages navigation on the handset

Tracked in [issue #78](https://github.com/trebizondoculpepper/the_pool/issues/78); status lives there. The owner, 2026-11-07, found that the current phone seems to select items on D and does not respond to Arrow keys or Enter. Mission [219](219-phone-controls.md) assigns those inputs and keeps walking and looking live; this mission makes the visible menu path behave as a coherent interface. The single-Navi-key [Series 30 reference](220-series-30-phone-reference.md) and the colour-matrix display in [221](221-phone-colour-matrix.md) set its visual constraints.

## Gameplay reason

The player must be able to find and read a report on the raised handset while still moving through the plant. The selected item, resulting screen and way back must be clear at each step, so Messages feels like a working menu rather than a sequence of unrelated pictures.

## Work

1. Use a compact vertical main-menu list suited to the single Navi key. Show Phone, Messages, Media and Radio with one unmistakable selection. Up and Down change selection; Enter/Navi opens it. Make the touch row regions follow the drawn rows. Retain Left and Right as predictable list movement if the control scheme sends them, rather than treating Right as an implicit select.
2. Make **Main Menu → Messages → Inbox → message** navigable through the same menu state on keyboard, gamepad and direct handset touch. Enter/Navi always selects; Backspace/Escape/C returns one level, then lowers at Main Menu. Returning to Inbox should preserve or restore the message that was opened rather than unexpectedly jumping to the top.
3. Newest messages appear first. The selected inbox row, unread marker and changed read state are visible. An arrival updates the displayed unread count and list without reopening the phone. Initial sample texts remain available for this mission; Phone, Media and Radio stay labelled placeholders with a clear way back.
4. Fit message text to the 128 × 128 logical display's body width. The menu model and renderer must agree on the number of visible lines and scroll limit, so each Up/Down step changes a long message's view until its real end. Show a small scroll cue only when more text exists above or below.
5. Keep navigation state and inbox operations in pure `controls/logic`; render only when visible frame data changes. Add focused tests that walk the entire Messages path, include a long message, and check touch regions against the actual drawn layout. Verify keyboard, gamepad and touch in the browser at desktop and portrait widths.

## Acceptance

- On a fresh phone, Arrow keys choose Messages and Enter opens it; the inbox opens, a sample message opens, a long message scrolls, and Backspace or Escape returns through each level and lowers the phone. D continues to move the player, never selects a phone item.
- Tapping each visible list row or the handset's Navi and C keys performs the matching action. The same selected item and page are shown regardless of input method.
- Phone, Media and Radio are recognisable placeholders. The inbox order, unread state, reading state and scroll cues match the underlying shared inbox.
- Menu content fits within the handset screen at desktop and portrait widths and meets the component benchmark budget. Overall handset size and text legibility on a narrow, letterboxed portrait page remain tracked in [#67](https://github.com/trebizondoculpepper/the_pool/issues/67).

## Dependencies and coordination

Implementation builds on #76's control map and #77's display, changing the shared menu model, phone display layout and their touch-region logic together. The owner has reserved Media and Radio content for later missions. No world-state migration is planned; the sample inbox is currently session data. The page-level portrait overlay and scale are a separate fix in #67.
