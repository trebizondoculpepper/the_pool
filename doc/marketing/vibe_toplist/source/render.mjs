import process from 'node:process';
import { chromium } from 'playwright-core';
const D = process.argv[2],
  N = 30;
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 800, height: 200 } });
await p.goto('file://' + D + '/banner.html');
await p.waitForTimeout(800);
for (let i = 0; i < N; i++) {
  const t = (i / N) * Math.PI * 2;
  await p.evaluate(
    ([t]) => {
      globalThis.document.getElementById('c1').style.backgroundPosition =
        `${-200 + 40 * Math.cos(t)}px ${-300 + 25 * Math.sin(t)}px`;
      globalThis.document.getElementById('c2').style.backgroundPosition =
        `${-500 - 35 * Math.cos(t + 1)}px ${-150 - 30 * Math.sin(t + 1)}px`;
      const s = 1 + 0.04 * Math.max(0, Math.sin(t * 2));
      globalThis.document.getElementById('btn').style.transform = `scale(${s})`;
    },
    [t],
  );
  await p
    .locator('#b')
    .screenshot({ path: `${D}/frames/f${String(i).padStart(2, '0')}.png` });
}
await b.close();
