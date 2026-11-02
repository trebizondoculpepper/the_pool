import {
  FETCH_INTERVAL_MS,
  OPEN_METEO_URL,
  estimatedReading,
  parseOpenMeteo,
  readingStale,
} from '../../game/weather';
import type { WeatherReading } from '../../game/weather';
import type { WorldStore } from '../save/world-store';

/**
 * Manchester's weather into the player's world (mission 123): Open-Meteo
 * fetched straight from the browser (no key; CORS open), at most once
 * every 15 minutes, its reading handed to the world as a `weather/reading`
 * action. Nothing about the player is sent: the city is fixed and there
 * is no geolocation. Offline, or with a reading too old, the world is
 * handed the modelled climate's estimate instead, so it never depends on
 * the network. The world itself stays pure (`game/weather.ts`).
 */
export function startWeatherFeed(store: () => WorldStore): () => void {
  let lastFetch = 0;
  let inFlight = false;
  // The last live reading, handed to whichever world is the rooms' now
  // (the player's, a dev slot's, the attract sequence's) if it lacks it.
  let latest: WeatherReading | null = null;
  const tick = async () => {
    const now = Date.now();
    if (!inFlight && now - lastFetch >= FETCH_INTERVAL_MS) {
      lastFetch = now;
      inFlight = true;
      try {
        const response = await fetch(OPEN_METEO_URL);
        const reading = response.ok
          ? parseOpenMeteo(await response.json())
          : null;
        if (reading) latest = reading;
      } catch {
        // Offline or refused: the estimate below carries on.
      } finally {
        inFlight = false;
      }
    }
    const held = store().world.value.weather.reading;
    if (latest && !readingStale(latest, now)) {
      if (
        !held ||
        held.takenAt < latest.takenAt ||
        held.source !== 'open-meteo'
      )
        store().dispatch({ type: 'weather/reading', reading: latest });
      return;
    }
    // No live reading worth keeping: the modelled climate, refreshed as
    // the day goes on (each quarter hour at most).
    const r = held;
    if (
      readingStale(r, now) &&
      (!r || r.source === 'open-meteo' || now - r.takenAt >= FETCH_INTERVAL_MS)
    )
      store().dispatch({
        type: 'weather/reading',
        reading: estimatedReading(now),
      });
  };
  void tick();
  const timer = window.setInterval(() => void tick(), 60_000);
  return () => window.clearInterval(timer);
}
