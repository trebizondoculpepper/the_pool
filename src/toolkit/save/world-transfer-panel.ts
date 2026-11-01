import { exportSlot, importSlot, listSlots } from './world-store';
import { bugReportUrl, saveFromFile, stateFile } from '../../game/state-file';
import type { StateFileMeta } from '../../game/state-file';
import { REPOSITORY, VERSION } from '../../game/version';

/**
 * The dev panel's World state box (the owner, 2026-11-01): download a save
 * slot as a JSON state file, with what is needed to debug it later
 * (`game/state-file.ts`: the version and build, the world's time, where
 * the player stood, the browser and settings), or upload one into a slot, for inspection and
 * debugging, on every build (a player can send a save with a bug report).
 * Uploading takes a state file's save (or a bare save), reads and migrates it as loading does, keeps the slot's last
 * save as its `:previous`, and every tab with the slot open takes it up.
 * Nothing leaves the browser except the file the player saves.
 */
export function createWorldTransferPanel(): HTMLElement {
  const box = document.createElement('section');
  box.className = 'world-transfer';
  box.setAttribute('aria-label', 'World state');
  const heading = document.createElement('h2');
  heading.textContent = 'World state';
  const slot = document.createElement('select');
  slot.setAttribute('aria-label', 'Save slot');
  for (const name of listSlots()) {
    const option = document.createElement('option');
    option.value = option.textContent = name;
    slot.append(option);
  }
  slot.value = 'game';
  const download = document.createElement('button');
  download.type = 'button';
  download.textContent = 'Download';
  const upload = document.createElement('button');
  upload.type = 'button';
  upload.textContent = 'Upload…';
  const report = document.createElement('button');
  report.type = 'button';
  report.textContent = 'Report a bug…';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.hidden = true;
  const status = document.createElement('p');
  status.className = 'world-transfer-status';
  status.setAttribute('role', 'status');
  const say = (text: string) => (status.textContent = text);

  /**
   * Download the chosen slot's state file: its name and record, or null
   * (said why) if the slot has no save here.
   */
  const downloadState = (): { name: string; meta: StateFileMeta } | null => {
    const save = exportSlot(slot.value);
    if (!save) {
      say(`The “${slot.value}” slot has no save in this browser.`);
      return null;
    }
    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace('T', '-')
      .replace(':', '');
    const meta: StateFileMeta = {
      game: {
        version: VERSION,
        build: (import.meta.env.VITE_BUILD as string | undefined) ?? null,
        slot: slot.value,
      },
      exported: new Date().toISOString(),
      worldTime: worldTimeOf(save),
      location: stored('pool-plant:last-location'),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: {
          width: screen.width,
          height: screen.height,
          pixelRatio: devicePixelRatio,
        },
        touchPoints: navigator.maxTouchPoints ?? 0,
        settings: jsonOf(stored('pool-plant:settings')),
      },
    };
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([stateFile(save, meta)], { type: 'application/json' }),
    );
    link.download = `the-pool-${slot.value}-${stamp}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    return { name: link.download, meta };
  };
  download.addEventListener('click', () => {
    const done = downloadState();
    if (done) say(`Downloaded the “${slot.value}” slot as ${done.name}.`);
  });
  // A bug report (the owner, 2026-11-01): the state file downloaded, and
  // GitHub's New Issue page opened, prefilled, asking for it to be dragged
  // in. Nothing is sent: the reporter writes and submits the issue.
  report.addEventListener('click', () => {
    const done = downloadState();
    if (!done) return;
    window.open(
      bugReportUrl(REPOSITORY, done.meta, done.name),
      '_blank',
      'noopener',
    );
    say(
      `Downloaded ${done.name}; drag it into the GitHub issue that has opened, describe the bug and submit it.`,
    );
  });
  upload.addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    file.value = '';
    if (!chosen) return;
    void chosen.text().then((text) => {
      const { save, location } = saveFromFile(text);
      const done = importSlot(slot.value, save);
      say(
        done.ok
          ? `Uploaded ${chosen.name} into the “${slot.value}” slot; its last save is kept as its previous.`
          : `Not uploaded: ${done.reason}.`,
      );
      // Where the player stood when it was saved, to go and look.
      if (done.ok && location) {
        const go = document.createElement('a');
        go.href = location;
        go.textContent = ' Open where the player stood.';
        status.append(go);
      }
    });
  });

  const row = document.createElement('div');
  row.className = 'world-transfer-row';
  row.append(slot, download, upload, report, file);
  box.append(heading, row, status);
  return box;
}

/** A stored value, or null if storage is blocked. */
function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Parsed JSON, or the text itself if it is not JSON, or null. */
function jsonOf(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** A save's world clock, seconds, if it can be read. */
function worldTimeOf(save: string): number | null {
  const parsed = jsonOf(save) as { world?: { time?: unknown } } | null;
  const time = parsed?.world?.time;
  return typeof time === 'number' ? time : null;
}
