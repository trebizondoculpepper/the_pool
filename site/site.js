// The landing page's two behaviours (mission 216): the email sign-up, sent
// to the owner's Kit form, and warming the browser's cache with the game's
// start-up files while the visitor reads.

/**
 * The sign-up form's destination: the owner's Kit form "Simulation of
 * Boring Things" (form 10150541, 2026-11-06), which takes `email_address`,
 * answers JSON and allows other sites' requests. Kit sends its own
 * confirmation email. Empty, the page says sign-up is coming soon and shows
 * no form; to move the list elsewhere, change these two.
 */
const SIGNUP_ACTION = 'https://app.kit.com/forms/10150541/subscriptions';
const SIGNUP_FIELD = 'email_address';

const form = document.querySelector('.signup');
if (form && SIGNUP_ACTION) {
  form.action = SIGNUP_ACTION;
  form.querySelector('input[type=email]').name = SIGNUP_FIELD;
  const status = form.querySelector('.note');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch(SIGNUP_ACTION, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(String(response.status));
      form.querySelector('.signup-row').remove();
      status.textContent =
        'Thank you. Check your email and confirm your subscription.';
    } catch {
      button.disabled = false;
      status.textContent =
        'That did not go through. Please try again in a moment.';
    }
  });
  form.hidden = false;
  document.querySelector('.signup-soon')?.remove();
}

/** A connection where speculative downloads would cost the visitor. */
function constrained() {
  const c = navigator.connection;
  return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType ?? ''));
}

/**
 * The game's start-up files (its document, entry bundle, styles and the
 * modules it preloads), listed by the site build from the game's own build
 * (`scripts/site.ts`), so fingerprinted names are never written by hand.
 */
async function startupAssets() {
  try {
    const response = await fetch('startup-assets.json', { priority: 'low' });
    return response.ok ? await response.json() : [];
  } catch {
    return [];
  }
}

function warm(urls) {
  for (const href of urls) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.append(link);
  }
}

async function hurry(urls) {
  await Promise.all(
    urls.map((url) => fetch(url, { priority: 'high' }).catch(() => undefined)),
  );
}

if (!constrained()) {
  const assets = startupAssets();
  // After the page's own content: idle time once it has loaded.
  const later = window.requestIdleCallback ?? ((f) => setTimeout(f, 1500));
  window.addEventListener('load', () => later(async () => warm(await assets)));
  // The visitor is heading for Play now: fetch the rest at once.
  let hurried = false;
  const approach = async () => {
    if (hurried) return;
    hurried = true;
    await hurry(await assets);
  };
  for (const link of document.querySelectorAll('[data-launch]')) {
    link.addEventListener('pointerenter', approach);
    link.addEventListener('focus', approach);
    link.addEventListener('touchstart', approach, { passive: true });
  }
}
