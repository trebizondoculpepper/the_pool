import { copyShortcut, titleShortcut } from '../logic/controls';

/** The title and recording views need their own screenshot input while play is paused. */
export function bindScreenshotShortcut(screenshot: () => void) {
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest?.(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
      )
    )
      return;
    if (copyShortcut(event) === 'screenshot') {
      event.preventDefault();
      if (!event.repeat) screenshot();
    }
  };
  document.addEventListener('keydown', keydown);
  return () => document.removeEventListener('keydown', keydown);
}

/** Shared input while the title backdrop is active: shot navigation and capture. */
export function bindTitleShortcuts(
  action: (command: 'restart' | 'next') => void,
  screenshot: () => void,
) {
  const unbindScreenshot = bindScreenshotShortcut(screenshot);
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest?.(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
      )
    )
      return;
    const command = titleShortcut(event);
    if (!command) return;
    event.preventDefault();
    action(command);
  };
  document.addEventListener('keydown', keydown);
  return () => {
    unbindScreenshot();
    document.removeEventListener('keydown', keydown);
  };
}
