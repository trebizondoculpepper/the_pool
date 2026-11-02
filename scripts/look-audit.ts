/**
 * The look audit (mission 127, `doc/plans/127-everything-lookable.md`):
 * opens `?room=<room>&audit=look&shot=1` on the running dev server in
 * headless Chrome for every room (or those named), waits for
 * `window.__poolLookAudit`, and writes the report, `doc/look-audit.json`
 * (each room's summary and findings) and `doc/look-audit.md` (its
 * headline numbers). It exits non-zero when any room has unlabelled,
 * unreachable or duplicate-tag findings not excused in `KNOWN_UNLOOKABLE`
 * (`src/toolkit/gallery/logic/look-audit.ts`), or could not be audited.
 * It never starts or restarts the dev server.
 *
 *   npm run look:audit                 (every room)
 *   node scripts/look-audit.ts plant_pool_03 boiler_house
 *
 * Options (environment): LOOK_URL (default http://127.0.0.1:5175),
 * LOOK_TIMEOUT (seconds a room, default 120), CHROME (its path),
 * LOOK_AUDIT_OUT (the report's directory, default doc/; a partial run
 * merges into the existing report).
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_BASE = process.env.LOOK_URL ?? 'http://127.0.0.1:5175';
const TIMEOUT = Number(process.env.LOOK_TIMEOUT ?? 120) * 1000;
const OUT =
  process.env.LOOK_AUDIT_OUT ?? join(import.meta.dirname, '..', 'doc');
const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335;

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

interface Counts {
  targets: number;
  unlabelled: number;
  unreachable: number;
  unverified: number;
  duplicateTags: number;
  duplicateNames: number;
  badFronts: number;
  [k: string]: number;
}
interface Audit {
  room: string;
  hook: boolean;
  counts: Counts;
  failing: number;
  unlabelled: { under: string; meshes: number; volume: number; size: number }[];
  unreachable: { ref: string; reason: string }[];
  unverified: { ref: string }[];
  duplicateTags: { tag: string }[];
  badFronts: string[];
  unmarkedControls: { ref: string }[];
  timing?: { build: number; scan: number };
}
type Got = { done?: boolean; error?: string; audit?: Audit } | null;
interface RoomReport {
  room: string;
  error?: string;
  hook?: boolean;
  counts?: Counts;
  failing?: number;
  timing?: { build: number; scan: number };
  unlabelled?: Audit['unlabelled'];
  unreachable?: Audit['unreachable'];
  unverified?: string[];
  duplicateTags?: string[];
  badFronts?: string[];
  unmarkedControls?: string[];
}

const trim = (a: Audit): RoomReport => ({
  room: a.room,
  hook: a.hook,
  counts: a.counts,
  failing: a.failing,
  ...(a.timing ? { timing: a.timing } : {}),
  unlabelled: a.unlabelled.slice(0, 40).map((g) => ({
    ...g,
    volume: Math.round(g.volume * 1000) / 1000,
    size: Math.round(g.size * 100) / 100,
  })),
  unreachable: a.unreachable.map((u) => ({ ref: u.ref, reason: u.reason })),
  unverified: a.unverified.map((u) => u.ref),
  duplicateTags: a.duplicateTags.map((d) => d.tag),
  badFronts: a.badFronts,
  unmarkedControls: a.unmarkedControls.map((c) => c.ref),
});

function markdown(rooms: RoomReport[], when: string) {
  const ok = rooms.filter((r) => r.counts);
  const sum = (k: string) => ok.reduce((s, r) => s + (r.counts![k] ?? 0), 0);
  const lines = [
    '# Look audit',
    '',
    `Written by \`npm run look:audit\` (mission 127) on ${when}; the full report is [look-audit.json](look-audit.json). ${rooms.length} rooms; ${ok.filter((r) => r.failing === 0).length} pass; ${rooms.length - ok.length} could not be audited. Totals: ${sum('targets')} look targets, ${sum('unlabelled')} unlabelled groups, ${sum('unreachable')} unreachable, ${sum('unverified')} unverified missing, ${sum('duplicateTags')} duplicate tags, ${sum('badFronts')} bad fronts.`,
    '',
    '| Room | Targets | Unlabelled | Unreachable | Unverified | Dup. tags | Dup. names | Bad fronts | Failing |',
    '| --- | --: | --: | --: | --: | --: | --: | --: | --: |',
    ...rooms.map((r) =>
      r.counts
        ? `| ${r.room}${r.hook ? '' : ' (no look hook)'} | ${r.counts.targets} | ${r.counts.unlabelled} | ${r.counts.unreachable} | ${r.counts.unverified} | ${r.counts.duplicateTags} | ${r.counts.duplicateNames} | ${r.counts.badFronts} | ${r.failing} |`
        : `| ${r.room} | not audited: ${r.error} | | | | | | | |`,
    ),
    '',
  ];
  return lines.join('\n');
}

/** The game's room list (`ROOMS`, `dev-room-links.ts`), loaded through the dev server. */
async function roomList(): Promise<string[]> {
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
    method: 'PUT',
  }).then((r) => r.json());
  const page = await connect(target.webSocketDebuggerUrl);
  try {
    await page.send('Page.enable');
    await page.send('Page.navigate', { url: `${URL_BASE}/bench.html` });
    await sleep(1500);
    return await page.evaluate<string[]>(
      "import('/src/toolkit/gallery/logic/dev-room-links.ts').then((m) => [...m.ROOMS])",
    );
  } finally {
    page.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(
      () => null,
    );
  }
}

async function main() {
  const asked = process.argv.slice(2);
  let order: string[] = [];
  try {
    await fetch(URL_BASE);
  } catch {
    console.error(`No dev server at ${URL_BASE}; start it first.`);
    process.exit(1);
  }
  const profile = mkdtempSync(join(tmpdir(), 'pool-audit-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--use-angle=metal',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--window-size=800,450',
    ],
    { stdio: 'ignore' },
  );
  const reports: RoomReport[] = [];
  try {
    let version: { webSocketDebuggerUrl?: string } = {};
    for (let i = 0; i < 40 && !version.webSocketDebuggerUrl; i++) {
      await sleep(250);
      version = await fetch(`http://127.0.0.1:${PORT}/json/version`)
        .then((r) => r.json())
        .catch(() => ({}));
    }
    if (!version.webSocketDebuggerUrl) throw new Error('Chrome did not start');
    // Every room, as the game lists it (`ROOMS`), asked of the dev server.
    order = await roomList();
    const rooms = asked.length ? asked : order;
    for (const room of rooms) {
      // A fresh tab a room, so no room's memory carries into the next.
      const target = await fetch(
        `http://127.0.0.1:${PORT}/json/new?about:blank`,
        {
          method: 'PUT',
        },
      ).then((r) => r.json());
      const page = await connect(target.webSocketDebuggerUrl);
      const started = Date.now();
      try {
        await page.send('Page.enable');
        const url = `${URL_BASE}/?${new URLSearchParams({ room, audit: 'look', shot: '1' })}`;
        await page.send('Page.navigate', { url });
        let got = null as Got;
        while (Date.now() - started < TIMEOUT) {
          await sleep(500);
          got = await page
            .evaluate<Got>(
              'window.__poolLookAudit && window.__poolLookAudit.done ? JSON.parse(JSON.stringify(window.__poolLookAudit)) : null',
            )
            .catch(() => null);
          if (got?.done) break;
        }
        const secs = ((Date.now() - started) / 1000).toFixed(1);
        if (!got?.done || !got.audit) {
          const error = got?.error ?? `timed out after ${TIMEOUT / 1000} s`;
          reports.push({ room, error });
          console.log(`${room}: not audited: ${error}`);
          continue;
        }
        const r = trim(got.audit);
        reports.push(r);
        const c = r.counts!;
        console.log(
          `${room}: ${c.targets} targets · ${c.unlabelled} unlabelled · ${c.unreachable} unreachable · ${c.unverified} unverified · ${c.duplicateTags} dup tags · ${c.badFronts} bad fronts · failing ${r.failing} (${secs} s)`,
        );
      } finally {
        page.close();
        await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(
          () => null,
        );
      }
    }
  } finally {
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
  const json = join(OUT, 'look-audit.json');
  const previous: RoomReport[] =
    asked.length && existsSync(json)
      ? (JSON.parse(readFileSync(json, 'utf8')).rooms ?? [])
      : [];
  const byRoom = new Map(previous.map((r) => [r.room, r]));
  for (const r of reports) byRoom.set(r.room, r);
  const all = [...byRoom.values()].sort(
    (a, b) => order.indexOf(a.room) - order.indexOf(b.room),
  );
  const when = new Date().toISOString().slice(0, 10);
  writeFileSync(
    json,
    `${JSON.stringify({ written: when, rooms: all }, null, 2)}\n`,
  );
  writeFileSync(join(OUT, 'look-audit.md'), markdown(all, when));
  // In the repository's own format, so `format:check` passes.
  spawnSync('npx', ['vp', 'fmt', json, join(OUT, 'look-audit.md')], {
    stdio: 'ignore',
  });
  console.log(`wrote ${json}`);
  const failed = reports.some((r) => r.error || (r.failing ?? 0) > 0);
  process.exit(failed ? 1 : 0);
}

await main();
