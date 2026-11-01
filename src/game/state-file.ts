/**
 * A world-state file, for inspection and debugging (the owner,
 * 2026-11-01): a save with everything needed to look into it later, the
 * game's version and build, when it was made, where the player stood and
 * what they played on. Restoring takes only the save; the rest is the
 * record. Pure.
 */

export const STATE_FILE_FORMAT = 'pool-plant-state';

/** What is recorded with a save, not restored. */
export interface StateFileMeta {
  /** The game: its version and build, and the save slot it came from. */
  game: { version: string; build: string | null; slot: string };
  /** When the file was made, ISO 8601. */
  exported: string;
  /** The world's own clock, seconds since its start. */
  worldTime: number | null;
  /** Where the player stood: the game's location link's query (`?room=…`). */
  location: string | null;
  /** What it was played on. */
  environment: {
    userAgent: string;
    platform: string;
    language: string;
    screen: { width: number; height: number; pixelRatio: number };
    touchPoints: number;
    /** The player's settings (graphics, controls…), as stored. */
    settings: unknown;
  };
}

/** The file's text: its metadata, then the save as it is stored. */
export function stateFile(saveText: string, meta: StateFileMeta): string {
  return JSON.stringify(
    { format: STATE_FILE_FORMAT, ...meta, save: JSON.parse(saveText) },
    null,
    2,
  );
}

/**
 * The save in a file uploaded: from a state file its save, with its
 * location; or a bare save as it is. Anything else is left to the save's
 * own reader to refuse.
 */
export function saveFromFile(text: string): {
  save: string;
  location: string | null;
} {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as { format?: unknown }).format === STATE_FILE_FORMAT
    ) {
      const file = parsed as { save?: unknown; location?: unknown };
      return {
        save: JSON.stringify(file.save ?? null),
        location: typeof file.location === 'string' ? file.location : null,
      };
    }
  } catch {
    // Not JSON: the save's reader says so.
  }
  return { save: text, location: null };
}

/**
 * GitHub's New Issue page for a bug report, prefilled from a state file's
 * record (the owner, 2026-11-01): a title for the reporter to finish, the
 * game's version and build, the world's time, where the player stood and
 * what they played on, and a request to attach the state file, `fileName`,
 * downloaded with it. Nothing is sent: the reporter writes and submits it.
 */
export function bugReportUrl(
  repository: string,
  meta: StateFileMeta,
  fileName: string,
): string {
  const time =
    meta.worldTime === null
      ? 'unknown'
      : `${Math.floor(meta.worldTime / 3600)} h ${Math.floor((meta.worldTime % 3600) / 60)} min`;
  const body = [
    '## What happened',
    '',
    '<!-- Describe the bug: what you did, what you expected, what you saw. -->',
    '',
    '## The game’s state',
    '',
    `Please drag the downloaded file, \`${fileName}\`, into this box: it holds the whole game, so the bug can be looked into.`,
    '',
    `- Version: ${meta.game.version}${meta.game.build ? ` (build ${meta.game.build})` : ''}`,
    `- Save slot: ${meta.game.slot}`,
    `- World time: ${time}`,
    `- Where: \`${meta.location ?? 'unknown'}\``,
    `- Browser: ${meta.environment.userAgent}`,
    `- Screen: ${meta.environment.screen.width} × ${meta.environment.screen.height} at ${meta.environment.screen.pixelRatio}×, ${meta.environment.touchPoints} touch points`,
    `- Exported: ${meta.exported}`,
  ].join('\n');
  const query = new URLSearchParams({
    title: 'Bug: ',
    body,
    labels: 'bug',
  });
  return `${repository}/issues/new?${query.toString()}`;
}
