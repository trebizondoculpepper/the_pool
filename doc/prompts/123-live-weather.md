# 123: Live weather, from Manchester

The owner, 2026-11-02: the game's weather is always whatever the weather is in Manchester right now, so "if you play the game in winter, you're always going to need more gas". Planned with the owner; not started until the owner says. `nicole_buruaah` leads the heat work (missions 120 to 122) and this follows them: the boilers and the LTHW ring then have real weather to answer. Read `CLAUDE.md` first.

## Where the weather comes from

- **Open-Meteo**, free for non-commercial use, no API key, and served with `Access-Control-Allow-Origin: *`, so the game fetches it directly from the browser, GitHub Pages, itch.io or the desktop build, with no server of ours. Checked 2026-11-02: `https://api.open-meteo.com/v1/forecast?latitude=53.48&longitude=-2.24&current=temperature_2m,wind_speed_10m,relative_humidity_2m` returned Manchester's 7.3 °C, 5.4 km/h and its humidity. Its current values refresh every 15 minutes.
- **Its terms:** the data is CC-BY 4.0, so the game credits it ("Weather data by Open-Meteo.com", in the credits and on each weather display that names its source). The free API is for non-commercial use (no ads, no subscriptions); if the game is ever sold or carries ads it needs Open-Meteo's paid plan or another source. Free-tier limits are 10,000 calls a day per IP; one call every 15 minutes per player is far inside them.
- **What to fetch:** one call for the current conditions: temperature, apparent temperature, relative humidity, wind speed, direction and gusts, pressure, cloud cover, precipitation, the WMO weather code, and day or night; and, in the same call, today's maximum and minimum and sunrise and sunset, for the displays.
- **The city:** Manchester (53.48 N, 2.24 W), fixed. Never the player's own location: no geolocation, nothing sent about the player.

## How it enters the game

- **Real time only, for now** (the owner: "let's not worry about speeding up time"): the weather is Manchester's now, whatever the game clock says.
- **The world state:** the last reading and when it was taken, saved, so a reload does not jump (a `WORLD_VERSION` bump, reserved on the mailbox first). The world's `ambient` (today a fixed 12 °C, `thermal.ts` `AMBIENT`, settable only by an unused `weather/ambient` action) follows the reading's temperature, eased over several minutes so a new reading does not step the heat load.
- **Pure and testable:** the fetch lives outside `src/game/`; the world takes a reading through a world action (`weather/reading`). Tests never touch the network: they hand the world readings directly.
- **Offline or failed:** the game never depends on the network. With no reading, or one too old, the world falls back to a modelled climate for the date (UK seasonal means and a daily swing) and carries on; the displays say so ("NO DATA, ESTIMATED").
- **A console stand-in** (`CLAUDE.md`'s rule): `weather` shows the reading, its age and its source; `weather <°C>` sets a test temperature that holds until `weather live`.
- **What it drives now:** `ambient`, so the heat demand of mission 120 (each pool and hall, the museum, and later reception and changing) and so the boiler house of 121. Wind and humidity are carried and shown; making wind raise the building's losses and humidity the halls' dehumidification is a later step, noted in `TODO.md`.

## Where the player sees it

1. **The engineer's office PC** (`components/site-dressing/logic/period-pc.ts` and `views/period-pc.ts`, the Gateway 3000): a desktop icon named "Open-Meteo" opens a simplified page in the period browser's look: Manchester, now: the temperature large with the weather code's icon and words, feels-like, wind with its direction, gusts, humidity, pressure, cloud and rain, today's high and low, sunrise and sunset, the reading's time, and the credit. Its screen redraws only when the reading changes.
2. **A weather console in the old control room:** a real instrument, a wall or desk weather station console of the 2000s (after a Davis Vantage Pro2 console or similar; give it a maker in `brands.ts`): its LCD showing outside temperature, wind speed and direction (a compass rose), gusts, humidity, pressure and its trend, rain, and the reading's time; worked by its own buttons (pages, units). Tried in dev0 first, as `CLAUDE.md` asks, and run through the component benchmark. It shows the world's reading; in the fiction its sensors are on the roof.
3. **An LCARS card on the bridge** (`bridge-pages.ts`): weather in the bridge's own style: outside temperature, wind, humidity, pressure, conditions, and the heat load it drives (from mission 120's `heatDemand`).

## Records

The plan in `doc/plans/123-live-weather.md`; the CHANGELOG under Unreleased; `TODO.md`: this mission, and its later steps (wind and humidity into the heat and air models; time-skip and speed-up using the forecast and the archive; a modelled-only setting).
