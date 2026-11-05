// The landing page's two behaviours (mission 216): the email sign-up, shown
// only once its Mailchimp destination is configured, and warming the
// browser's cache with the game's start-up files while the visitor reads.

/**
 * The Mailchimp embedded form's action URL (Audience > Signup forms >
 * Embedded forms, the form's `action`), and its hidden anti-bot field's
 * name (`b_<u>_<id>`). Empty until the owner sets up the list: the page
 * then says sign-up is coming soon and shows no form. To move the list
 * elsewhere, point these at any form endpoint taking `EMAIL`.
 */
const MAILCHIMP_ACTION = '';
const MAILCHIMP_HONEYPOT = '';

const form = document.querySelector('.signup');
if (form && MAILCHIMP_ACTION) {
  form.action = MAILCHIMP_ACTION;
  if (MAILCHIMP_HONEYPOT) {
    const trap = document.createElement('input');
    Object.assign(trap, {
      type: 'text',
      name: MAILCHIMP_HONEYPOT,
      tabIndex: -1,
      value: '',
    });
    trap.setAttribute('aria-hidden', 'true');
    trap.style.position = 'absolute';
    trap.style.left = '-5000px';
    form.append(trap);
  }
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
