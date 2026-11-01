import { exportSlot, importSlot, listSlots } from './world-store';

/**
 * The dev panel's World state box (the owner, 2026-11-01): download a save
 * slot as a JSON file, or upload one into a slot, for inspection and
 * debugging, on every build (a player can send a save with a bug report).
 * Uploading reads and migrates it as loading does, keeps the slot's last
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
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.hidden = true;
  const status = document.createElement('p');
  status.className = 'world-transfer-status';
  status.setAttribute('role', 'status');
  const say = (text: string) => (status.textContent = text);

  download.addEventListener('click', () => {
    const text = exportSlot(slot.value);
    if (!text) {
      say(`The “${slot.value}” slot has no save in this browser.`);
      return;
    }
    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace('T', '-')
      .replace(':', '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([text], { type: 'application/json' }),
    );
    link.download = `the-pool-${slot.value}-${stamp}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    say(`Downloaded the “${slot.value}” slot as ${link.download}.`);
  });
  upload.addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    file.value = '';
    if (!chosen) return;
    void chosen.text().then((text) => {
      const done = importSlot(slot.value, text);
      say(
        done.ok
          ? `Uploaded ${chosen.name} into the “${slot.value}” slot; its last save is kept as its previous.`
          : `Not uploaded: ${done.reason}.`,
      );
    });
  });

  const row = document.createElement('div');
  row.className = 'world-transfer-row';
  row.append(slot, download, upload, file);
  box.append(heading, row, status);
  return box;
}
