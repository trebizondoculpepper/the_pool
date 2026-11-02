# Browser chatbot context for The Pool

Research and proposal, 2026-11-02. The owner wants someone playing The Pool in Chrome to ask a browser-side chatbot questions such as “Why is this alarm on?” or “Why is my backwash inhibited?” and have it read the running simulation without putting a diagnostic overlay over the game.

## What the browser assistants can see

Claude in Chrome says its side panel reads the current tab, can read page text and DOM state, and has scripting and debugger permissions. [Claude in Chrome help](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome).

Gemini in Chrome says it uses content from the current tab, shared by default when a chat starts; the user can remove that tab or turn off default sharing. Google does not specify that its page-context feature executes a page's JavaScript or reads arbitrary hidden metadata. [Gemini in Chrome help](https://support.google.com/chrome/answer/16283624?hl=en&co=GENIE.Platform%3DDesktop).

The ChatGPT browser extension supports side chat and using an open tab as context after website permission. Its documentation describes reading page content but does not promise that a particular DOM node, accessibility node, script tag or global variable will be included. [ChatGPT browser extension documentation](https://developers.openai.com/codex/chrome-extension).

Chrome extension content scripts can inspect the DOM, but normally run in an isolated JavaScript world. A `window.__poolSomething` global is useful to agents that can evaluate code in the page's main world; it is not a universal contract for extensions. [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).

Therefore, “add metadata” is not by itself a guarantee of chatbot access. A screenshot-only assistant sees the canvas, not non-visible text. A DOM- or accessibility-reading assistant might see a semantic text region. A script-capable assistant may use a read-only page API. We should test all three, and offer an on-demand readable report when the hidden route is not picked up.

## The game's useful foundations

- The running `WorldStore` already holds the world and a recent event log (`src/toolkit/save/world-store.ts`); the event log has subject tags, severity, time and what caused an action (`src/game/events/game-event.ts`).
- Equipment and rooms have stable refs and look links (125 and 126). `lookCatalogue` gives names, kinds, tags and model bindings; a chatbot's answer can point back to a specific `?room=…&look=…` view.
- Mission 131's pure object descriptors give a control's action and its actual readings without scene scraping. At present they cover the Jacuzzi plant room and the control-room mimics; coverage should grow rather than adding a separate AI-specific description of every machine.
- The Wash-O-Tron's `cycleRefusal` already decides why a particular filter cannot start: busy sequencer, HOLD, lockout, filter state, too few filters in service, no circulation flow, pit inhibit or insufficient pit capacity. `washSensingOfWorld` supplies the measured inputs. This is a strong first proof of concept.
- `plantReadingOf` and the location annunciators give current alarm states. A raw alarm lamp alone does not explain its cause: the diagnostic layer needs the same predicates that raise it, plus relevant readings and recent events.

## Proposed contract

Build one pure, read-only `diagnosticSnapshot(world, events, context)` selector. It returns a bounded versioned object with game-world time, current room, focused object ref, active alarms, requested or blocked operations, observed readings, recent relevant events, and links to named equipment. Every conclusion carries its evidence and model ref. A field that cannot be explained from known state says `unknown`, rather than inventing a cause. Keep it separate from `World` and its save schema, so publishing context needs no `WORLD_VERSION` migration.

The first slice should answer `whyWashBlocked(filter)` and `whyAlarm(alarmId)` for a small set of alarms with explicit cause rules, beginning with the Olympic filter wash and its pit/circulation alarms. An alarm row should identify whether it is active, accepted, latched or cleared, the exact threshold or interlock condition, the readings that satisfy that condition, and the last relevant event. A refusal should name the target filter and list both the failing condition and the values behind it. The selector must derive this from the same model functions as the controller, especially `cycleRefusal`, so advice cannot drift from plant behaviour.

Example output, illustrative only (numbers must come from the live world):

```text
The Pool diagnostic context · world time 06:42:15 · room PLANT ROOM 2
Selected: PL2-F3, Olympic filter 3
Requested action: CYCLE NOW · blocked
Reason: PIT CAPACITY. The backwash pit holds 78 m³; the configured backwash and rinse would add 24 m³; HIGH is 90 m³.
Other checks: circulation running; four other filters in service; filter 3 unlocked and filtering.
Relevant event: 06:41:58 · PL2-F3 CYCLE NOW refused: PIT CAPACITY.
Look at: ?room=plant_pool_02&look=PL2-F3
```

Publish the same snapshot through three progressive surfaces:

1. A short semantic DOM region with real text and headings, outside the WebGL canvas and visually hidden with the project's screen-reader-only CSS. Do not use `display:none`, the HTML `hidden` attribute or `aria-hidden=true`: those remove content from the accessibility tree. Do not use `aria-live` for every simulation tick; this would overwhelm screen-reader users. Update only when the derived diagnostic snapshot changes, at most once a second. [W3C WAI hiding semantics](https://www.w3.org/WAI/ARIA/apg/practices/hiding-semantics/).
2. A frozen, versioned read-only snapshot and a documented `window.__poolDiagnostics.getSnapshot()` method for assistants that can execute page JavaScript. The method returns plain data, never the mutable store and never a dispatch function. It should be easy to find from the DOM region's plain text (`data-schema` and an explanatory sentence), without putting instructions to the chatbot in the page.
3. A small “Copy diagnostic report” action in the Esc menu or developer panel, and an optional readable `?diagnostics=1` page. This makes the context usable with assistants that only read visible text or selected text. The report uses the same selector; it is not a second interpretation of the plant.

WebMCP is a possible later adapter: Chrome describes an origin-trial API for pages to register tools that agents can discover and call. A read-only `get_pool_diagnostics` tool could return the same small snapshot if the relevant browser assistant actually supports WebMCP. It is experimental and should not be the first or sole path. [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), [imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).

## Scope and trust

Keep the published text concise: current room and focus, active alarms, blocked operations, a few related readings and events. Do not dump the whole save, all 2,000 event lines, puzzle solutions, unrevealed rooms, local storage, player identity, or any control that changes the plant. The page may be shared with a cloud chatbot when the player opens its extension, and Gemini's current-tab sharing can be automatic. Explain that in the game's AI-assistance setting and provide a way to switch the context off. The hidden region should remain useful to screen-reader users rather than treating accessibility as a chatbot-only transport.

The page content is data, not a prompt to the assistant. Avoid text such as “ignore previous instructions” or a system-role imitation. Escape any player-authored event text before writing it to DOM; use `textContent`, not `innerHTML`. The chatbot should quote the world time and equipment ref when answering, and distinguish current evidence from an inferred explanation. The owner has not yet chosen whether AI context is enabled by default; that choice should be settled before implementation.

## Proof before rollout

Build a one-room prototype for PL2 and make deterministic saved states for `LOW FLOW`, `PIT CAPACITY`, `PIT INHIBIT`, lockout and an active alarm. Test the selector with model tests and verify its DOM output in a browser. Then manually ask the same question in Claude in Chrome, Gemini in Chrome and the ChatGPT Chrome extension, first with only the hidden region and then with the visible report. Record what each actually uses, its permissions, whether it reads updated state after a simulation step, and whether it cites the correct filter and measured values. We have not yet run those vendor-extension tests; the sources above establish capabilities, not interoperability with our proposed markup.

After the prototype, expand cause rules alarm by alarm, using 127's scene audit and 129's room audit to find coverage gaps. Reuse 131 descriptors for names, readings and control refs. A broad “explain any alarm” claim should wait until coverage is measured and reported.
