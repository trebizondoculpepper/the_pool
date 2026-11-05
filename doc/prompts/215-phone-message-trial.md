# 215: scripted phone messages in a dev room

The owner, 2026-11-05. This follows [213](213-phone-model-and-raise.md) and [214](214-phone-menus-and-inbox.md). It proves that the game can deliver messages without building authored fault scenarios yet.

## Gameplay reason

Before faults rely on the phone, the player should be able to hear a message arrive, raise the phone, find it in the inbox and read it while the plant keeps running.

## Scope settled with the owner

- Add one special-purpose development room, taking the next free `dev` number at implementation time. It may otherwise remain the usual blank room with its title card. The owner explicitly approved this room-specific scripted behaviour as an exception to the normal shared-system rule. Mark the script's implementation with `One-off (the owner, 2026-11-05):` and the reason.
- From the start of a visit to that dev room, deliver message one at **20 seconds** and message two at **two minutes**. The second timer does not depend on reading the first. Deliver exactly two messages, with simple test text. Restarting the dev room replays the sequence.
- Each arrival makes a short phone beep and adds an unread message to the shared inbox. The phone stays down; the player raises it and navigates Main Menu → Messages → Inbox to read. Newest messages appear first. No real-world network, account, send function, or scenario logic is involved.
- The timing and test text are the one-off room script; the phone's transport, unread state, inbox order and display remain shared systems usable by future authored scenarios. No other room gets a private message implementation.

## Acceptance

With the phone closed, the first beep and message occur once after 20 seconds, and the second once after two minutes, whether the first was opened or not. Opening the phone follows 214's main-menu path; both messages are readable in newest-first order. Restarting the room gives a fresh two-message trial. No duplicate dispatch occurs from frame-rate changes or repeated updates. The plant continues stepping and the phone still works while the player carries an item.

## Dependencies and records

213 provides the handset, 214 the inbox and message-entry API. Use the room creation and inspection tools in `doc/agent-tooling.md`; update that guide if a new tool is added. Keep `TODO.md` and `CHANGELOG.md` current when implementing, record the one-off justification in code, and run the required checks.
