# 223: Original period phone beeps

Tracked in [issue #80](https://github.com/trebizondoculpepper/the_pool/issues/80); status lives there. The owner, 2026-11-07, asks for a short incoming-message cue reminiscent of the simple speaker in an early 2000s handset. The game must not copy Nokia's tunes or its Morse-code SMS alert.

## Gameplay reason

An arriving report must be noticeable while the player is walking or working, so the phone can draw them into the inbox without opening itself. The cue should be audible, brief, and quiet enough not to dominate repeated play.

## Work

1. Compose an original short alert in code from square-wave tones through the existing `partAudio` sound bus. No recording, generated asset, external licence or MP3 file is needed. Keep the motif distinct from Nokia's melodies and Morse rhythm.
2. Trigger the alert from the shared phone-inbox receive event. Sample messages that seed the inbox during initialisation are silent. Any later delivery, including mission 215's scripted test messages, invokes the same cue. The room owns only the delivery timing and text.
   Deliveries within one second share one alert so a batch does not overlap its cues. In development, the app removes its subscription during hot reload. A message received before the browser has unlocked audio may be silent; the inbox still receives it.
3. Use the existing master volume and mute state in `partAudio`, with no separate phone volume setting. The phone cue plays front-centre from the carried handset, not as a spatial machine sound. No sound logic belongs in `src/toolkit/controls/`.
4. Keep menu/key feedback optional. If later included, it is a different soft cue driven through an app-layer callback from the shared phone actions; avoid a sound on every directional repeat.

## Acceptance

- A newly received message causes one original alert and enters the shared inbox. Initial sample messages and menu redraws cause no alert.
- Muting or setting master volume to zero silences the alert through the existing audio bus. The cue is short and does not reuse any external recording or Nokia pattern.
- Mission 215's one-off room calls the inbox receive API without its own sound playback.

## Dependencies and coordination

The sound recipe can be built and reviewed now. The receive subscription waits for mission 219's controls PR #86 to merge because both branches touch `phone-menu.ts`; the app-layer registration touches `src/main.ts` and must be announced before editing. Mission 215 (#79) depends on this shared cue for its arrival events. The game's audio settings have only a master volume, so there is no effects-volume control to wire separately.
