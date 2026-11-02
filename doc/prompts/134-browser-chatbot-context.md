# 134 — Let browser chatbots understand the running plant

The owner, 2026-11-02: while playing in Chrome with a browser-side Claude, Gemini or ChatGPT assistant, ask why an alarm is on or why a backwash is inhibited and get an answer grounded in the current game state. The diagnostic metadata should not cover the 3D scene or become another in-game control screen. [Research and proposal](../research/browser-chatbot-context.md).

## First delivery

Create a pure read-only diagnostic selector with a bounded, versioned snapshot. Begin with the Olympic Wash-O-Tron: for each filter's CYCLE NOW, report whether it can start; if it cannot, name the exact interlock and show the readings and thresholds behind it. Include a small named set of related active alarms and recent events, the world time, current room, focus ref and look links. Reuse the controller's `cycleRefusal` and `washSensingOfWorld` and existing alarm predicates, event log, object refs and control descriptors. Mark causes not yet modelled as unknown.

Expose that one snapshot as concise semantic DOM text outside the canvas, visually hidden but available in the accessibility tree; as a read-only page method; and as an on-demand visible/copyable diagnostic report. Update it only when its derived content changes, at most once a second. Do not add it to the saved `World`, and do not expose mutable state or action dispatch through the chatbot surface.

## Proof

Use fixed world states for an allowed wash, low flow, pit capacity, pit inhibit, lockout and an active alarm. The text, structured snapshot and visible report must agree with the model and with each other. Check that a world step updates them, that no changing snapshot causes unnecessary DOM churn, that an assistant cannot mistake old event text for current state, and that the hidden region does not create repeated screen-reader announcements.

Manually test Claude in Chrome, Gemini in Chrome and the ChatGPT Chrome extension with the same saved state and question; record what each can actually read and whether it answers with the right equipment and measurements. The visible/copyable report is the compatibility path where hidden DOM is ignored. Treat WebMCP as a later experimental adapter only if a tested assistant supports it.

## Boundaries and coordination

Publish operational evidence only, not the entire save, spoiler state or writable controls. Escape event text and keep content factual, without instructions addressed to a chatbot. Decide with the owner whether the context is on by default and provide an off switch. The initial pure selector and PL2 report can start independently of mission 127; expanding refs and per-room coverage should follow 127, 129 and 131. Claim shared `main.ts`, menu, catalogue and descriptor files before implementation, since mission 127 is using several of them now.
