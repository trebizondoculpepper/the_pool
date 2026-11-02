# Browser chatbot context for The Pool

Research and proposal, 2026-11-02. The owner wants someone playing The Pool in Chrome to ask a browser-side chatbot questions such as “Why is this alarm on?”, “Why is my backwash inhibited?” and, more generally, “Why is this machine not working?” The chatbot needs a live, read-only view of the plant throughout the world, especially every pump's state and every valve's position, without putting a diagnostic overlay over the game.

## What the browser assistants can see

Claude in Chrome says its side panel reads the current tab, can read page text and DOM state, and has scripting and debugger permissions. [Claude in Chrome help](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome).

Gemini in Chrome says it uses content from the current tab, shared by default when a chat starts; the user can remove that tab or turn off default sharing. Google does not specify that its page-context feature executes a page's JavaScript or reads arbitrary hidden metadata. [Gemini in Chrome help](https://support.google.com/chrome/answer/16283624?hl=en&co=GENIE.Platform%3DDesktop).

The ChatGPT browser extension supports side chat and using an open tab as context after website permission. Its documentation describes reading page content but does not promise that a particular DOM node, accessibility node, script tag or global variable will be included. [ChatGPT browser extension documentation](https://developers.openai.com/codex/chrome-extension).

Chrome extension content scripts can inspect the DOM, but normally run in an isolated JavaScript world. A `window.__poolSomething` global is useful to agents that can evaluate code in the page's main world; it is not a universal contract for extensions. [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).

Therefore, “add metadata” is not by itself a guarantee of chatbot access. A screenshot-only assistant sees the canvas, not non-visible text. A DOM- or accessibility-reading assistant might see a semantic text region. A script-capable assistant may use a read-only page API. We should test all three, and offer an on-demand readable report when the hidden route is not picked up.

## The game's useful foundations

- The running `WorldStore` already holds the world and a recent event log (`src/toolkit/save/world-store.ts`); the event log has subject tags, severity, time and what caused an action (`src/game/events/game-event.ts`).
- Installed valves have asset IDs, tags and normal positions (`src/game/plant/installed-valves.ts`); their live positions are in `world.installedValves`. The starter model exposes mode, command, actual running state, trip and current for its pumps (`src/game/plant/motor-starters.ts`, `world.motors`). Other pumps and actuators have their own plant blocks, so an inventory must combine their model readers rather than assume those two maps cover everything.
- Enhanced room networks name nodes, fittings and links (`src/toolkit/gallery/logic/world-in-model.ts`). They supply the connection graph needed to explain how a closed valve upstream of a pump or an isolated discharge affects equipment elsewhere.
- Equipment and rooms have stable refs and look links (125 and 126). `lookCatalogue` gives names, kinds, tags and model bindings; a chatbot's answer can point back to a specific `?room=…&look=…` view.
- Mission 131's pure object descriptors give a control's action and its actual readings without scene scraping. At present they cover the Jacuzzi plant room and the control-room mimics; coverage should grow rather than adding a separate AI-specific description of every machine.
- The Wash-O-Tron's `cycleRefusal` already decides why a particular filter cannot start: busy sequencer, HOLD, lockout, filter state, too few filters in service, no circulation flow, pit inhibit or insufficient pit capacity. `washSensingOfWorld` supplies the measured inputs. This is a strong first proof of concept.
- `plantReadingOf` and the location annunciators give current alarm states. A raw alarm lamp alone does not explain its cause: the diagnostic layer needs the same predicates that raise it, plus relevant readings and recent events.

## Proposed contract

Build a pure, read-only **plant-state projection** over the running `World`, event log and enhanced networks. It must be able to enumerate the plant across rooms, not just the player's current room: stable refs and room IDs; pumps' commanded mode, power available, actual running/tripped state, flow and relevant interlocks; valves' commanded and actual open/closed or moving state, normal state and connected line; tank levels, relevant readings, active alarms and recent events. A missing or unmodelled field must be marked unavailable, not silently treated as stopped or shut. Keep this projection separate from `World` and its save schema, so publishing context needs no `WORLD_VERSION` migration.

Expose an indexed, paged read-only query contract over that projection: `listSystems()`, `listEquipment({ room?, kind?, state? })`, `getEquipment(ref)`, `getConnections(ref)`, `getActiveAlarms()`, `getAlarm(id)` and `getRecentEvents({ subject?, limit? })`. Return small versioned plain-data results with world time and a snapshot revision so the assistant can tell whether two answers came from the same simulation state. No method dispatches a world action or returns a mutable store. A chatbot can first find the affected system, then inspect the pump, its upstream and downstream valves, power and alarms without receiving a giant raw save. The query names are illustrative; the implementation should settle the smallest stable set and document it.

Add a pure diagnostic layer on that same projection: `whyNotWorking(ref)`, `whyAlarm(id)` and `whyWashBlocked(filter)`. These return a conclusion, ordered causes, evidence values, thresholds and refs, relevant past events, and an explicit `unknown` where the game has no cause rule. They must distinguish command from observed state: “pump requested in AUTO but stopped because its local isolator is off” is different from “pump is in OFF”, and “valve ordered open but still travelling” is different from “valve closed”. Every conclusion carries its evidence and model refs. Raw state is available for the chatbot to reason about, while the game's own cause rules prevent an answer from drifting from the simulation.

The first slice should enumerate the real installed pumps and valves, with their tags, rooms, positions and states, and let an agent query one by ref. It should also answer `whyWashBlocked(filter)` and `whyAlarm(alarmId)` for a small set of alarms with explicit cause rules, beginning with the Olympic filter wash and its pit/circulation alarms. An alarm row should identify whether it is active, accepted, latched or cleared, the exact threshold or interlock condition, the readings that satisfy that condition, and the last relevant event. A refusal should name the target filter and list both the failing condition and the values behind it. The selector must derive this from the same model functions as the controller, especially `cycleRefusal`, so advice cannot drift from plant behaviour.

Example output, illustrative only (numbers must come from the live world):

```text
The Pool diagnostic context · world time 06:42:15 · room PLANT ROOM 2
Selected: PL2-F3, Olympic filter 3
Requested action: CYCLE NOW · blocked
Reason: PIT CAPACITY. The backwash pit holds 78 m³; the configured backwash and rinse would add 24 m³; HIGH is 90 m³.
Related plant: P-101A running in AUTO; PL2-P1-IV1 open; PL2-P1-IV3 open; four other filters in service; filter 3 unlocked and filtering.
Relevant event: 06:41:58 · PL2-F3 CYCLE NOW refused: PIT CAPACITY.
Look at: ?room=plant_pool_02&look=PL2-F3
```

Publish the same projection and diagnoses through three progressive surfaces:

1. A short semantic DOM region with real text and headings, outside the WebGL canvas and visually hidden with the project's screen-reader-only CSS. It gives a facility summary, the current room and focus, active alarms and a discoverable index of plant systems and diagnostic links, with a compact count of running pumps and abnormal valves. It must not try to put the entire valve inventory into every chat turn. Do not use `display:none`, the HTML `hidden` attribute or `aria-hidden=true`: those remove content from the accessibility tree. Do not use `aria-live` for every simulation tick; this would overwhelm screen-reader users. Update only when the derived content changes, at most once a second. [W3C WAI hiding semantics](https://www.w3.org/WAI/ARIA/apg/practices/hiding-semantics/).
2. A documented `window.__poolDiagnostics` read-only query API for assistants that can execute page JavaScript. Its methods return cloned, bounded plain data from the live world projection, never the mutable store and never a dispatch function. The DOM region describes its existence in ordinary factual text (`data-schema` and an explanatory sentence), without putting instructions to the chatbot in the page.
3. A small “Copy diagnostic report” action in the Esc menu or developer panel, and a readable diagnostic page with room, system, equipment and alarm links. That page lets an assistant navigate to the pump and its valve states as real text when it cannot call JavaScript or read visually hidden text. The report and page use the same projection and cause rules; they are not a second interpretation of the plant.

WebMCP is a possible later adapter: Chrome describes an origin-trial API for pages to register tools that agents can discover and call. Read-only tools such as `get_plant_equipment` and `explain_plant_alarm` could wrap the query contract if the relevant browser assistant actually supports WebMCP. It is experimental and should not be the first or sole path. [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), [imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).

## Scope and trust

Make the whole **engineering simulation** queryable, including pumps and valves in other rooms. Keep each answer concise and paged; do not dump the raw save, all 2,000 event lines, puzzle solutions, local storage, player identity, or any control that changes the plant. A coverage report should say which real machines, valves and alarms have state readers and which still lack them; “all valves” must not quietly mean only `installedValves` while other model blocks contain actuators. The page may be shared with a cloud chatbot when the player opens its extension, and Gemini's current-tab sharing can be automatic. Explain that in the game's AI-assistance setting and provide a way to switch the context off. The hidden region should remain useful to screen-reader users rather than treating accessibility as a chatbot-only transport.

The page content is data, not a prompt to the assistant. Avoid text such as “ignore previous instructions” or a system-role imitation. Escape any player-authored event text before writing it to DOM; use `textContent`, not `innerHTML`. The chatbot should quote the world time and equipment ref when answering, and distinguish current evidence from an inferred explanation. The owner has not yet chosen whether AI context is enabled by default; that choice should be settled before implementation.

## Proof before rollout

Build the first full-plant pump-and-valve index and a PL2 diagnostic prototype. Make deterministic saved states for an open and a shut valve, a pump running, stopped and tripped, and `LOW FLOW`, `PIT CAPACITY`, `PIT INHIBIT`, lockout and an active alarm. Test the query contract and cause selectors with model tests and verify their DOM output in a browser. Then manually ask the same questions in Claude in Chrome, Gemini in Chrome and the ChatGPT Chrome extension, first with only the hidden region and then with the visible report. Record what each actually uses, its permissions, whether it reads updated state after a simulation step, and whether it cites the correct pump, valve, alarm and measured values. We have not yet run those vendor-extension tests; the sources above establish capabilities, not interoperability with our proposed markup.

After the prototype, expand cause rules alarm by alarm, using 127's scene audit and 129's room audit to find coverage gaps. Reuse 131 descriptors for names, readings and control refs. A broad “explain any alarm” claim should wait until coverage is measured and reported.

## An adventure-style answer to “What's going on here?”

The owner has proposed a second use of the browser assistant: a short, text-adventure-style account of the current place as the default style for open-ended scene questions, with the player's request taking precedence if they want a terse technical report or another voice. A plausible answer is: “You are standing in the Olympic plant room, beside the filter battery. Pumps hum along the far wall. A window on the annunciator flashes and its sounder is calling for attention. Several valves and gauges line the pipework.” The actual location, objects, sounds and signals must come from the running game; the example is not a claim about a real saved state.

This needs a second, **player-observable scene projection** over the same world: room and region, player focus and orientation where known, nearby objects in visible groups, observable lamp and display states, sounds and conditions with modelled evidence, and salient recent changes. Keep it separate from the full engineering diagnostic query. A chatbot may inspect a remote valve to explain a fault, but it must not narrate that valve as if the player sees it from their present position. Darkness, occlusion, closed panels and unknown sensory conditions matter. The first answer offers the scene and its conspicuous clues; “what does that annunciator say?” gets its readable windows; “why is it flashing?” can use the full plant graph and cause rules.

Parked mission [128](../prompts/128-text-adventure-mode.md) already specifies senses first, then a selective visible inventory, with EXAMINE for details and a no-peeking rule. The shared scene selector and salience rules should serve both missions. Mission 134 can provide read-only context while 128 remains parked; it does not need a parser, movement rules or text-mode controls. The chatbot composes prose from structured facts, but hidden page content alone cannot force a vendor assistant to adopt the proposed default style. Prototype the wording with actual extensions and offer an explicit “Describe this scene” prompt or copyable report as a fallback. Do not place instruction text impersonating a system prompt in the DOM.
