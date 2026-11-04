/**
 * The audit's editing commands (mission 168; the owner, 2026-11-04): each
 * registered kind is one JSON file in `src/game/plant/kinds/`, listed by
 * `kinds/index.ts`, and these commands are the only way they change. No
 * proposals: a change is written at once, git is the review, CI the
 * validation; each command also refuses an obviously bad value before it
 * writes. Agents never edit the files by hand.
 *
 *   show <kind>                                   its file, placements and source evidence
 *   register <kind> --type "…" --class plant|non-plant|decorative --purpose "…"
 *            [--code XY] [--group placed|other] [--status none]
 *   unregister <kind>                             (refused while placed or bound)
 *   set <kind> <field>=<value> …                  traits=box-like,operable mount=floor:-y …
 *   unset <kind> <field>                          template, brand, traits, mount, sources
 *   bind <room> <thing> <kind>                    a thing with no identity of its own
 *
 * Options: `--dir <path>` works on another kinds directory (tests).
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { runnerImport } from 'vite-plus';

type Files = typeof import('../src/game/plant/kind-files.ts');
type Model =
  typeof import('../src/toolkit/gallery/logic/audit-export/audit-export.ts');
type Scan =
  typeof import('../src/toolkit/gallery/logic/audit-export/source-scan.ts');
type KindFile = import('../src/game/plant/kind-files.ts').KindFile;

export const EDIT_COMMANDS = [
  'show',
  'register',
  'unregister',
  'set',
  'unset',
  'bind',
] as const;

const root = new URL('..', import.meta.url).pathname;
const load = async <T>(path: string) =>
  (
    await runnerImport<T>(`${root}${path}`, {
      root,
      configFile: false,
      logLevel: 'error',
    })
  ).module;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

/** `--key value` options and the positional words, apart. */
function parse(args: readonly string[]) {
  const opts: Record<string, string> = {};
  const words: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--'))
        opts[a.slice(2)] = 'true';
      else {
        opts[a.slice(2)] = next;
        i += 1;
      }
    } else words.push(a);
  }
  return { opts, words };
}

/** Write a file whole or not at all: a temporary file, then a rename. */
function writeAtomic(path: string, text: string) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

/** Every `.ts` file under a directory, relative to the repository. */
function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...tsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(relative(root, p));
  }
  return out;
}

export async function runEdit(args: readonly string[]) {
  const { opts, words } = parse(args);
  const [command, ...rest] = words;
  const F = await load<Files>('src/game/plant/kind-files.ts');
  const dir = opts.dir
    ? join(process.cwd(), opts.dir)
    : join(root, F.KIND_FILE_DIR);
  const indexPath = join(dir, 'index.ts');

  const readAll = (): Record<string, KindFile> => {
    if (!existsSync(dir)) return {};
    return Object.fromEntries(
      readdirSync(dir)
        .filter((n) => n.endsWith('.json'))
        .sort()
        .map((n) => [
          n.replace(/\.json$/, ''),
          JSON.parse(readFileSync(join(dir, n), 'utf8')) as KindFile,
        ]),
    );
  };
  const readIndex = () =>
    existsSync(indexPath)
      ? F.indexGroups(readFileSync(indexPath, 'utf8'))
      : { placed: [], other: [] };

  /** Validate the registry as it would be, then write what changed and format it. */
  const commit = (
    files: Record<string, KindFile>,
    changed: { kind: string; file?: KindFile }[],
    indexChanged: boolean,
  ) => {
    // The index as it will be: every kind file by its group, sorted.
    const entries = Object.entries(files).map(([id, f]) => ({
      id,
      group: f.group,
    }));
    const index = indexChanged
      ? {
          placed: entries
            .filter((e) => e.group === 'placed')
            .map((e) => e.id)
            .sort(),
          other: entries
            .filter((e) => e.group === 'other')
            .map((e) => e.id)
            .sort(),
        }
      : readIndex();
    const problems = F.validateRegistry(files, index);
    const mine = problems.filter((p) =>
      changed.some((c) => c.kind === p.kind || p.kind === '(index)'),
    );
    if (mine.length)
      fail(
        mine
          .map(
            (p) =>
              `refused: ${p.kind}${p.field ? `.${p.field}` : ''} ${p.message}`,
          )
          .join('\n'),
      );
    mkdirSync(dir, { recursive: true });
    const written: string[] = [];
    for (const c of changed) {
      const path = join(dir, `${c.kind}.json`);
      if (c.file) {
        writeAtomic(path, F.kindFileText(c.file));
        written.push(path);
      } else rmSync(path);
    }
    if (indexChanged) {
      writeAtomic(indexPath, F.indexText(entries));
      written.push(indexPath);
    }
    if (written.length)
      try {
        execFileSync('npx', ['vp', 'fmt', ...written], {
          cwd: root,
          stdio: 'ignore',
        });
      } catch {
        // Formatting is a nicety: the pre-commit hook formats in any case.
      }
    for (const c of changed)
      if (c.file?.traits)
        for (const o of F.traitProblems(c.kind, c.file.traits).odd)
          console.log(`note: ${o.kind} ${o.message}`);
  };

  const files = readAll();
  const need = (kind: string | undefined) => {
    if (!kind) fail(`usage: ${command} <kind> …`);
    if (!files[kind])
      fail(
        `no kind file for '${kind}' in ${relative(root, dir)}; registered kinds: ${Object.keys(files).join(', ') || '(none yet; mission 171 migrates the registry)'}`,
      );
    return files[kind];
  };

  switch (command) {
    case 'show': {
      const kind = rest[0];
      if (!kind) fail('usage: show <kind>');
      const model = await load<Model>(
        'src/toolkit/gallery/logic/audit-export/audit-export.ts',
      );
      const scan = await load<Scan>(
        'src/toolkit/gallery/logic/audit-export/source-scan.ts',
      );
      const file = files[kind];
      const audit = model.kindAudit(kind);
      const paths = [
        ...tsFiles(join(root, 'src/toolkit/components')),
        ...tsFiles(join(root, 'src/toolkit/gallery/views')),
      ];
      const sources = scan.sourcesFor(kind, paths, file?.sources ?? []);
      const hits = sources.flatMap((p) =>
        existsSync(join(root, p))
          ? scan.scanSource(p, readFileSync(join(root, p), 'utf8'))
          : [],
      );
      console.log(
        file
          ? `${kind} (${relative(root, join(dir, `${kind}.json`))}):\n${F.kindFileText(file).trimEnd()}`
          : `${kind}: no kind file yet (${audit.registered ? 'in the hard-coded registry until mission 171' : 'not registered'})`,
      );
      console.log(
        `placed: ${audit.counts.placements} in ${audit.counts.rooms} rooms${audit.placements.length ? ` (${audit.placements.map((p) => p.room).join(', ')})` : ''}`,
      );
      console.log(
        `source files: ${sources.length ? sources.join(', ') : 'none found by name (set sources=… to name them)'}`,
      );
      for (const h of hits)
        console.log(`  ${h.kind.padEnd(7)} ${h.at}  ${h.what}`);
      break;
    }
    case 'register': {
      const kind = rest[0];
      if (!kind)
        fail('usage: register <kind> --type "…" --class … --purpose "…"');
      if (files[kind]) fail(`refused: '${kind}' is already registered`);
      if (!F.KIND_ID.test(kind))
        fail(
          `refused: '${kind}' is not a kind id (lower-case words joined by hyphens)`,
        );
      for (const o of ['type', 'class', 'purpose'])
        if (!opts[o]) fail(`refused: register needs --${o}`);
      const group = (opts.group ?? 'other') as KindFile['group'];
      const file: KindFile = {
        group,
        type: opts.type,
        code: opts.code?.toUpperCase() ?? F.deriveCode(opts.type),
        class: opts.class as KindFile['class'],
        status: (opts.status ?? 'none') as KindFile['status'],
        purpose: opts.purpose,
      };
      const next = { ...files, [kind]: file };
      commit(next, [{ kind, file }], true);
      console.log(
        `registered ${kind}: ${file.type}, code ${file.code}, ${file.class}`,
      );
      break;
    }
    case 'unregister': {
      const kind = rest[0];
      const file = need(kind);
      if (file.bindings?.length)
        fail(
          `refused: ${kind} is bound to ${file.bindings.map((b) => `${b.room}/${b.thing}`).join(', ')}`,
        );
      const model = await load<Model>(
        'src/toolkit/gallery/logic/audit-export/audit-export.ts',
      );
      const placed = model.kindAudit(kind).counts.placements;
      if (placed) fail(`refused: ${kind} is placed ${placed} times`);
      const next = { ...files };
      delete next[kind];
      commit(next, [{ kind }], true);
      console.log(`unregistered ${kind}`);
      break;
    }
    case 'set': {
      const [kind, ...pairs] = rest;
      let file = need(kind);
      if (!pairs.length) fail('usage: set <kind> <field>=<value> …');
      const lines: string[] = [];
      for (const pair of pairs) {
        const eq = pair.indexOf('=');
        if (eq < 1) fail(`refused: '${pair}' is not field=value`);
        const field = pair.slice(0, eq);
        const before = JSON.stringify(
          (file as unknown as Record<string, unknown>)[field],
        );
        const next = F.setField(kind, file, field, pair.slice(eq + 1));
        if (F.isProblem(next))
          fail(`refused: ${kind}.${field} ${next.message}`);
        file = next;
        lines.push(
          `${kind}.${field}: ${before ?? '(unset)'} → ${JSON.stringify((file as unknown as Record<string, unknown>)[field])}`,
        );
      }
      commit({ ...files, [kind]: file }, [{ kind, file }], false);
      for (const l of lines) console.log(l);
      break;
    }
    case 'unset': {
      const [kind, field] = rest;
      const file = { ...need(kind) } as unknown as Record<string, unknown>;
      const optional = [
        'template',
        'brand',
        'traits',
        'mount',
        'sources',
        'affordances',
      ];
      if (!field || !optional.includes(field))
        fail(`refused: unset takes one of ${optional.join(', ')}`);
      if (file[field] === undefined)
        fail(`refused: ${kind}.${field} is not set`);
      delete file[field];
      commit(
        { ...files, [kind]: file as unknown as KindFile },
        [{ kind, file: file as unknown as KindFile }],
        false,
      );
      console.log(`${kind}.${field}: unset`);
      break;
    }
    case 'bind': {
      const [room, thing, kind] = rest;
      if (!room || !thing || !kind) fail('usage: bind <room> <thing> <kind>');
      const file = need(kind);
      const model = await load<Model>(
        'src/toolkit/gallery/logic/audit-export/audit-export.ts',
      );
      const rooms = model.auditIndex().rooms.map((r) => r.id);
      if (!rooms.includes(room)) fail(`refused: no room '${room}'`);
      for (const [k, f] of Object.entries(files))
        if (f.bindings?.some((b) => b.room === room && b.thing === thing))
          fail(`refused: ${room}/${thing} is already bound to ${k}`);
      const next: KindFile = {
        ...file,
        bindings: [...(file.bindings ?? []), { room, thing }].sort((a, b) =>
          `${a.room}/${a.thing}` < `${b.room}/${b.thing}` ? -1 : 1,
        ),
      };
      commit({ ...files, [kind]: next }, [{ kind, file: next }], false);
      console.log(`bound ${room}/${thing} to ${kind}`);
      break;
    }
    default:
      fail(`unknown command '${command}'; npm run -s audit -- help`);
  }
}
