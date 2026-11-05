import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The game's start-up files, from its built `index.html` (mission 216):
 * the document itself, its entry script, its styles and the modules it
 * preloads, as paths from the site's root (`game/…`). The landing page
 * warms the browser's cache with these, so their fingerprinted names come
 * from the build and are never written by hand. Pure.
 */
export function startupAssets(html: string, base = 'game/'): string[] {
  const found = new Set<string>([base]);
  const tag = /<(script|link)\b[^>]*>/g;
  for (const [element, name] of html.matchAll(tag)) {
    const attr = (key: string) =>
      element.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];
    const url =
      name === 'script'
        ? attr('type') === 'module'
          ? attr('src')
          : undefined
        : ['modulepreload', 'stylesheet'].includes(attr('rel') ?? '')
          ? attr('href')
          : undefined;
    if (url && !/^[a-z]+:|^\/\//i.test(url))
      found.add(base + url.replace(/^\.\//, ''));
  }
  return [...found];
}

/**
 * Assemble the published site (mission 216): the landing page from `site/`
 * at the root and the built game (`dist/`, unchanged, as the itch.io and
 * desktop builds use it) under `game/`, in `site-dist/`, which GitHub Pages
 * publishes. Run after `npm run build`.
 */
export function assembleSite(root = resolve(import.meta.dirname, '..')) {
  const dist = resolve(root, 'dist');
  const out = resolve(root, 'site-dist');
  if (!existsSync(resolve(dist, 'index.html')))
    throw new Error('No dist/index.html: run npm run build first.');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(resolve(root, 'site'), out, { recursive: true });
  cpSync(dist, resolve(out, 'game'), { recursive: true });
  const assets = startupAssets(
    readFileSync(resolve(dist, 'index.html'), 'utf8'),
  );
  writeFileSync(
    resolve(out, 'startup-assets.json'),
    `${JSON.stringify(assets, null, 2)}\n`,
  );
  console.log(
    `Site assembled in site-dist/: landing page and game/ (${assets.length} start-up files to warm).`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href)
  assembleSite();
