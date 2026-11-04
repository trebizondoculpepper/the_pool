# 169: Audit pass 1: everything is a registered kind

The owner, 2026-11-04. Brief only; not started until the owner says. Uses mission 168's tools; read it, 167 and `doc/agent-tooling.md` first. Pass 2 (traits) is 170.

## The rule

In the new world everything is a registered kind (the owner, 2026-11-04). Many things were modelled but never registered because nothing ever asked (the engineers' office's safety notice, its office chair, the desk's PC, the software boxes). This pass finds them and registers them. It does not judge whether a kind's flags are right: that is pass 2.

## How

- Room by room, **smallest and simplest first** (`npm run -s audit -- rooms --by-size`): the switch room, the engineers' office, then upward. By the museums and the large halls most kinds will already be registered.
- For a room, `npm run -s audit -- room <room>` lists its unregistered things: catalogue objects whose kind is missing, manifest entries, and things the source scan finds with behaviour but no kind.
- For each, the agent runs `npm run -s audit -- propose-register <room> <thing> <kind|new:<kind>>`; the owner approves on the review page. No hand-written reports, no Chrome, no whole-game runs.
- A room is done when nothing in it is unregistered. Kinds registered in one room are already done in every later room.

## Acceptance

- Each audited room reports no unregistered things; its proposals are all decided.
- The engineers' office and the switch room are done first, as the worked examples, before any larger room.

## Records

`TODO.md` (rooms done, by date); a diary entry per working session.
