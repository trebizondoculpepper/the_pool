# Plan 123: live weather, from Manchester

The brief is `doc/prompts/123-live-weather.md` (the owner, 2026-11-02; started on the owner's word the same day). `WORLD_VERSION` 75 was reserved for it with `nicole_buruaah`, who leads the heat work.

## Stages

Each stage is committed and pushed green on its own.

1. **Model, world, save, feed, console, fallback.** `src/game/weather.ts` (pure): the reading's shape (`WeatherReading`), Open-Meteo's URL and parser (`parseOpenMeteo`), the modelled UK climate (`estimatedReading`: Manchester Airport's 1991-2020 monthly means and half daily ranges, eased between months, a daily cosine coolest at dawn and warmest at 15:00 UTC, a simple solar model for sunrise and sunset), staleness (three hours), the pressure trend, the WMO code's words and icon kind, and the console's lines. The world gains `weather` (the reading, the previous reading's pressure for the trend, a console test temperature); `weather/reading` takes a reading in and `weather/test` holds or releases a test temperature; `stepWorld` eases `ambient` toward the test temperature or the reading's, with a ten-minute time constant, and leaves it alone with neither, so `weather/ambient` and the tests that use it carry on. Save migration 74 → 75 adds no reading (`fillDefaults`). The feed (`src/toolkit/weather/weather-feed.ts`, outside `src/game/`) fetches Open-Meteo at most every 15 minutes from the browser, Manchester only, and dispatches the reading; offline, or with a live reading over three hours old, it dispatches the climate model's estimate, refreshed each quarter hour. The console's `weather` shows the reading, its age and source; `weather <°C>` holds a test temperature until `weather live`. Tests never touch the network: they hand the world a recorded answer.
2. **The engineer's PC page.** An "Open-Meteo" desktop icon on the Gateway 3000 (`period-pc.ts`) opening a simplified page in the period browser's look, drawn from the world's reading, redrawn only when the reading changes.
3. **The weather station console.** A 2000s weather station console after the Davis Vantage Pro2, with a maker in `brands.ts`: its LCD showing outside temperature, wind and a compass rose, gusts, humidity, pressure and its trend, rain and the time of the reading, worked by its own buttons (page, units). Tried in dev0, run through the component bench, then installed in the old control room.
4. **The bridge's LCARS card.** Weather on the bridge (`bridge-pages.ts`): outside temperature, wind, humidity, pressure, conditions, and the heat load it drives.

## Rules kept

- Manchester is fixed (53.48 N, 2.24 W); there is no geolocation and nothing is sent about the player.
- "Weather data by Open-Meteo.com" (CC-BY 4.0) is credited in `CREDITS.md` and on every display naming the source. The free API is for non-commercial use only.
- An estimated reading says so on every display: "NO DATA, ESTIMATED".
- No new warning or alarm is raised, so none needs adding to the control rooms.
- The heat model is not touched beyond `ambient`: `thermal.ts`'s `AMBIENT` stays the default before the first reading.

## Later (in `TODO.md`)

Wind into the building's fabric losses and humidity into the halls' dehumidification; time-skip and speed-up using Open-Meteo's forecast and archive; a modelled-only setting for players who would rather not fetch.
