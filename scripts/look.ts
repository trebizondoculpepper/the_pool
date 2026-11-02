/**
 * Pictures of a named thing by look link (mission 125,
 * `doc/plans/125-look-links.md`): opens `?room=<room>&look=<ref>&mode=<mode>&shot=1`
 * on the local dev server in headless Chrome, once per mode, waits for
 * `window.__poolLook.ready` (or its refusal), and saves one PNG per mode
 * to `doc/marketing/tmp/look/` (not versioned), printing each file and
 * its result. It never starts or restarts the dev server, and it closes
 * Chrome and exits on a timeout rather than hanging.
 *
 *   node scripts/look.ts boiler_house BH-CP3 front,left,right
 *   node scripts/look.ts - BH-CP3            (the register's room)
 *
 * Options (environment): LOOK_URL (default http://127.0.0.1:5175),
 * LOOK_WIDTH and LOOK_HEIGHT (default 1600 × 900), LOOK_TIMEOUT (seconds
 * per shot, default 60), CHROME (its path).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_BASE = process.env.LOOK_URL ?? 'http://127.0.0.1:5175';
const WIDTH = Number(process.env.LOOK_WIDTH ?? 1600);
const HEIGHT = Number(process.env.LOOK_HEIGHT ?? 900);
const TIMEOUT = Number(process.env.LOOK_TIMEOUT ?? 60) * 1000;
const OUT = join(import.meta.dirname, '..', 'doc', 'marketing', 'tmp', 'look');
const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CdpResult {
  exceptionDetails?: { text: string; exception?: { description?: string } };
  result?: { value?: unknown };
  data?: string;
}
interface CdpReply {
  id?: number;
  error?: { message: string };
  result?: CdpResult;
}

async function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const waiting = new Map<number, (m: CdpReply) => void>();
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data)) as CdpReply;
    if (m.id && waiting.has(m.id)) {
      waiting.get(m.id)!(m);
      waiting.delete(m.id);
    }
  };
  const send = (method: string, params: object = {}) =>
    new Promise<CdpResult>((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (m) =>
        m.error ? reject(new Error(m.error.message)) : resolve(m.result ?? {}),
      );
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async <T = unknown>(expression: string): Promise<T> => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(
        r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
      );
    return r.result?.value as T;
  };
  return { send, evaluate, close: () => ws.close() };
}

interface PoolLook {
  found: boolean;
  ref: string;
  room: string;
  mode: string;
  seen: number;
  warnings: string[];
  reason?: string;
  link?: string;
  ready: boolean;
  done: boolean;
}

async function main() {
  const [room, ref, modes = 'front'] = process.argv.slice(2);
  if (!room || !ref) {
    console.error('usage: node scripts/look.ts <room|-> <ref> [mode,mode…]');
    process.exit(2);
  }
  try {
    await fetch(URL_BASE);
  } catch {
    console.error(`No dev server at ${URL_BASE}; start it first.`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), 'pool-look-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--use-angle=metal',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
    { stdio: 'ignore' },
  );
  let failed = false;
  try {
    let version: { webSocketDebuggerUrl?: string } = {};
    for (let i = 0; i < 40 && !version.webSocketDebuggerUrl; i++) {
      await sleep(250);
      version = await fetch(`http://127.0.0.1:${PORT}/json/version`)
        .then((r) => r.json())
        .catch(() => ({}));
    }
    if (!version.webSocketDebuggerUrl) throw new Error('Chrome did not start');
    for (const mode of modes.split(',').filter(Boolean)) {
      const target = await fetch(
        `http://127.0.0.1:${PORT}/json/new?about:blank`,
        { method: 'PUT' },
      ).then((r) => r.json());
      const page = await connect(target.webSocketDebuggerUrl);
      try {
        await page.send('Page.enable');
        await page.send('Emulation.setDeviceMetricsOverride', {
          width: WIDTH,
          height: HEIGHT,
          deviceScaleFactor: 1,
          mobile: false,
        });
        const query = new URLSearchParams({
          ...(room === '-' ? {} : { room }),
          look: ref,
          mode,
          shot: '1',
        });
        const url = `${URL_BASE}/?${query}`;
        await page.send('Page.navigate', { url });
        const until = Date.now() + TIMEOUT;
        let look: PoolLook | null = null;
        while (Date.now() < until) {
          await sleep(500);
          look = await page
            .evaluate<PoolLook | null>(
              'window.__poolLook ? JSON.parse(JSON.stringify({...window.__poolLook, candidates: undefined})) : null',
            )
            .catch(() => null);
          if (look?.done) break;
        }
        if (!look?.done) {
          console.log(`${mode}: timed out after ${TIMEOUT / 1000} s (${url})`);
          failed = true;
          continue;
        }
        if (!look.found) {
          console.log(`${mode}: refused: ${look.reason} (${url})`);
          failed = true;
          continue;
        }
        const shot = await page.send('Page.captureScreenshot', {
          format: 'png',
        });
        const file = join(
          OUT,
          `${look.room}_${ref.replace(/[^A-Za-z0-9_-]+/g, '_')}_${mode}.png`,
        );
        writeFileSync(file, Buffer.from(shot.data ?? '', 'base64'));
        console.log(
          `${file}\n  ${look.ref} · ${look.mode} · ${look.seen}/9 seen${look.warnings.length ? ` · ${look.warnings.join(' · ')}` : ''}\n  ${look.link}`,
        );
      } finally {
        page.close();
      }
    }
  } finally {
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
}

const watchdog = setTimeout(
  () => {
    console.error('look: gave up');
    process.exit(1);
  },
  TIMEOUT * 10 + 30_000,
);
watchdog.unref();
await main();
