# 231: dev71 on the timed-events room trait

Tracked in [#105](https://github.com/trebizondoculpepper/the_pool/issues/105); status lives there.

Dev71 is the first proof that a room can declare reusable behavior as a typed room trait. Its two test phone messages are a deliberately small example: they arrive 20 and 120 seconds after entering the room, measured in simulation time, so pausing stops their clock and leaving and returning restarts the sequence. This room trait uses the shared timer and trigger component from mission 230; it does not introduce a private timer or make dev71 a player-selected scenario.

Define a `timed-events` room trait that reads declared event times and message text from room configuration, then delivers each event through an injected phone-message capability. Attach it to dev71 using the room audit CLI. Keep room-trait logic pure; the host supplies effects. Remove the dev71-only phone trial script and its generic room-script hook if nothing else uses it.

Check the declaration and lifecycle with pure tests, verify the two messages and reset behavior, then play-check dev71. Keep the trait reusable by other rooms without testing a room ID in shared code. Update `doc/agent-tooling.md` for any changed audit or room-trait workflow.
