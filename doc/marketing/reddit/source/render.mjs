// node render.mjs <dir>: renders banner.html and icon.html in <dir> (assets beside them)
import process from 'node:process';
import { chromium } from 'playwright-core';
const D = process.argv[2];
const b = await chromium.launch({ headless: true, channel: 'chrome' });
async function shot(file, sel, out, scale) {
  const p = await b.newPage({
    viewport: { width: 2000, height: 600 },
    deviceScaleFactor: scale,
  });
  await p.goto('file://' + D + '/' + file);
  await p.waitForTimeout(1200);
  await p.locator(sel).screenshot({ path: D + '/' + out });
  await p.close();
}
await shot('banner.html', '#b', 'the-pool-reddit-banner-1920x384.png', 1);
await shot(
  'banner-mobile.html',
  '#m',
  'the-pool-reddit-banner-mobile-1600x480.png',
  1,
);
await shot('icon.html', '#i', 'the-pool-reddit-icon-256.png', 1);
await shot('icon.html', '#i', 'the-pool-reddit-icon-512.png', 2);
await b.close();
