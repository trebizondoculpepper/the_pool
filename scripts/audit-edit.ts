/**
 * The audit's editing commands (mission 168; the owner, 2026-11-04): each
 * registered kind is one typed TypeScript file in `src/game/plant/kinds/`, listed by
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
import { readConfigDir, writeConfig } from './config-io.ts';

type Files = typeof import('../src/game/plant/kind-files.ts');
type Traits = typeof import('../src/game/plant/traits.ts');
type CompositeTrait = import('../src/game/plant/traits.ts').CompositeTrait;
type Graph = typeof import('../src/toolkit/gallery/logic/sim-graph/index.ts');
type TraitIndex = typeof import('../src/game/plant/trait-index.ts');
type Model =
  typeof import('../src/toolkit/gallery/logic/audit-export/audit-export.ts');
type Scan =
  typeof import('../src/toolkit/gallery/logic/audit-export/source-scan.ts');
type KindFile = import('../src/game/plant/kind-files.ts').KindFile;

export const EDIT_COMMANDS = [
  'traits',
  'trait',
  'unclassified',
  'check',
  'find',
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
  const T = await load<Traits>('src/game/plant/traits.ts');
  const traitDir = opts['trait-dir']
    ? join(process.cwd(), opts['trait-dir'])
    : join(root, 'src/game/plant/traits');
  const traitIndexPath = join(traitDir, 'index.ts');
  const composites = await readConfigDir<CompositeTrait>(traitDir);

  const readIndex = () =>
    existsSync(indexPath)
      ? F.indexGroups(readFileSync(indexPath, 'utf8'))
      : { placed: [], other: [] };

  /** Validate the registry as it would be, then write what changed and format it. */
  const commit = async (
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
    const problems = F.validateRegistry(files, index, composites);
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
      const path = join(dir, `${c.kind}.ts`);
      if (c.file) {
        await writeConfig(
          path,
          F.orderedKind(c.file),
          F.kindFileSource(c.file),
        );
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
  };

  const files = await readConfigDir<KindFile>(dir);
  const need = (kind: string | undefined) => {
    if (!kind) fail(`usage: ${command} <kind> …`);
    if (!files[kind])
      fail(
        `no kind file for '${kind}' in ${relative(root, dir)}; registered kinds: ${Object.keys(files).join(', ') || '(none yet; mission 171 migrates the registry)'}`,
      );
    return files[kind];
  };

  /** Who uses a trait: kinds naming it or getting it through a composite, and composites extending it. */
  const traitUsers = (t: string, direct = false) => ({
    kinds: Object.keys(files).filter((k) => {
      const ts = files[k].traits ?? [];
      if (ts.includes(t)) return true;
      if (direct) return false;
      return ts.some(
        (x) =>
          x !== t &&
          T.expand([x], composites).primitives.length &&
          reaches(x, t),
      );
    }),
    composites: Object.keys(composites).filter((n) =>
      direct ? composites[n].extends.includes(t) : n !== t && reaches(n, t),
    ),
  });
  /** Whether trait `a` includes trait `b` through the composites. */
  const reaches = (a: string, b: string, seen = new Set<string>()): boolean => {
    if (a === b) return true;
    if (seen.has(a)) return false;
    seen.add(a);
    if (T.isPrimitive(a))
      return (
        (T.PRIMITIVES[a] as { implies?: readonly string[] }).implies ?? []
      ).some((i) => reaches(i, b, seen));
    return (composites[a]?.extends ?? []).some((e) => reaches(e, b, seen));
  };
  /** Each kind's service traits, derived from its model ports in the simulation graph (mission 172). */
  // The shared trait index (mission 174): the same queries the bench pages use.
  const TI = await load<TraitIndex>('src/game/plant/trait-index.ts');
  let media: Map<string, string[]> | undefined;
  const portMedia = async () => {
    if (media) return media;
    const G = await load<Graph>('src/toolkit/gallery/logic/sim-graph/index.ts');
    media = TI.mediaByKind(G.simGraph());
    return media;
  };
  const traitCtx = async () => ({
    kinds: files,
    composites,
    media: await portMedia(),
  });
  const derivedServices = async (): Promise<Map<string, string[]>> =>
    TI.serviceTraitsByKind(await portMedia());

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
          ? `${kind} (${relative(root, join(dir, `${kind}.ts`))}):\n${F.kindFileText(file).trimEnd()}`
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
      // Its traits (mission 172): named, expanded, metadata and where it came from, derived services.
      const traits = file?.traits ?? [];
      const e = T.expand(traits, composites);
      const m = T.resolveMeta(traits, file?.meta ?? {}, composites);
      const services = (await derivedServices()).get(kind) ?? [];
      console.log(`traits: ${traits.join(', ') || '(unclassified)'}`);
      if (traits.length) {
        console.log(`  expands to: ${e.primitives.join(', ')}`);
        for (const [k, v] of Object.entries(m.values))
          console.log(`  ${k} = ${v} (${m.from[k]})`);
        for (const q of [
          ...e.problems,
          ...T.primitiveProblems(kind, e.primitives, true),
          ...m.problems,
        ])
          console.log(`  problem: ${q.message}`);
      }
      console.log(
        `services (derived from its model ports): ${services.join(', ') || 'none found'}`,
      );
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
      await commit(next, [{ kind, file }], true);
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
      await commit(next, [{ kind }], true);
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
        // What the field shows: traits+ and traits- show the traits; metadata its meta value.
        const shown = (f: KindFile) => {
          const r = f as unknown as Record<string, unknown>;
          if (field === 'traits+' || field === 'traits-') return r.traits;
          return field in r ? r[field] : f.meta?.[field];
        };
        const label =
          field === 'traits+' || field === 'traits-' ? 'traits' : field;
        const before = JSON.stringify(shown(file));
        const next = F.setField(
          kind,
          file,
          field,
          pair.slice(eq + 1),
          composites,
        );
        if (F.isProblem(next))
          fail(`refused: ${kind}.${field} ${next.message}`);
        file = next;
        lines.push(
          `${kind}.${label}: ${before ?? '(unset)'} → ${JSON.stringify(shown(file))}`,
        );
      }
      await commit({ ...files, [kind]: file }, [{ kind, file }], false);
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
        'meta',
        'sources',
        'affordances',
      ];
      const meta = { ...((file.meta as Record<string, unknown>) ?? {}) };
      if (field && meta[field] !== undefined) {
        // A metadata value: back to the inherited or default value.
        delete meta[field];
        if (Object.keys(meta).length) file.meta = meta;
        else delete file.meta;
      } else {
        if (!field || !optional.includes(field))
          fail(
            `refused: unset takes one of ${optional.join(', ')}, or a metadata key the kind sets (${Object.keys(meta).join(', ') || 'none'})`,
          );
        if (file[field] === undefined)
          fail(`refused: ${kind}.${field} is not set`);
        delete file[field];
      }
      await commit(
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
      await commit({ ...files, [kind]: next }, [{ kind, file: next }], false);
      console.log(`bound ${room}/${thing} to ${kind}`);
      break;
    }
    case 'traits': {
      // Every trait: primitives by facet, then composites, with how many kinds have each.
      const groups = TI.traitIndex(await traitCtx());
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(groups, null, 2)}\n`);
        break;
      }
      for (const g of groups) {
        const r = g.facet === 'composite' ? undefined : T.FACET_RULES[g.facet];
        console.log(
          `${g.facet}: ${g.words}${r?.derived ? ' [derived, never set]' : ''}`,
        );
        for (const t of g.traits)
          console.log(`  ${t.name.padEnd(16)} ${t.words} (${t.kinds} kinds)`);
        if (!g.traits.length) console.log('  (none yet)');
      }
      break;
    }
    case 'trait': {
      const [sub, name] = rest;
      if (!sub || !name)
        fail('usage: trait show|define|edit|rename|remove <name> …');
      const writeTraits = async (
        next: Record<string, CompositeTrait>,
        changedNames: string[],
        renamed?: [string, string],
      ) => {
        // The whole graph as it would be: every composite and every kind.
        const kinds2 = renamed
          ? Object.fromEntries(
              Object.entries(files).map(([k, f]) => [
                k,
                f.traits?.includes(renamed[0])
                  ? {
                      ...f,
                      traits: [
                        ...f.traits.filter((t) => t !== renamed[0]),
                        renamed[1],
                      ].sort(),
                    }
                  : f,
              ]),
            )
          : files;
        const problems = F.validateRegistry(kinds2, readIndex(), next);
        if (problems.length)
          fail(
            problems
              .map(
                (p) =>
                  `refused: ${p.kind}${p.field ? `.${p.field}` : ''} ${p.message}`,
              )
              .join('\n'),
          );
        if (opts['dry-run']) {
          console.log('dry run: valid; nothing written');
          return;
        }
        mkdirSync(traitDir, { recursive: true });
        const written: string[] = [];
        for (const n of changedNames) {
          const path = join(traitDir, `${n}.ts`);
          if (next[n]) {
            await writeConfig(
              path,
              T.orderedComposite(next[n]),
              T.compositeSource(next[n]),
            );
            written.push(path);
          } else if (existsSync(path)) rmSync(path);
        }
        writeAtomic(traitIndexPath, T.traitIndexText(Object.keys(next)));
        written.push(traitIndexPath);
        if (renamed)
          for (const [k, f] of Object.entries(kinds2))
            if (f !== files[k]) {
              const path = join(dir, `${k}.ts`);
              await writeConfig(path, F.orderedKind(f), F.kindFileSource(f));
              written.push(path);
            }
        try {
          execFileSync('npx', ['vp', 'fmt', ...written], {
            cwd: root,
            stdio: 'ignore',
          });
        } catch {
          // The pre-commit hook formats in any case.
        }
      };
      const metaOpts = () =>
        Object.fromEntries(
          (opts.set ? opts.set.split(',') : []).map((kv) => {
            const [k, v] = kv.split('=');
            const n = Number(v);
            return [k, Number.isFinite(n) && v.trim() !== '' ? n : v];
          }),
        );
      switch (sub) {
        case 'show': {
          const d = TI.traitDetail(name, await traitCtx());
          if (opts.json) {
            process.stdout.write(`${JSON.stringify(d, null, 2)}\n`);
            break;
          }
          if (d.kind === 'unknown')
            fail(
              `'${name}' is not a trait; npm run -s audit -- traits lists them`,
            );
          console.log(
            d.kind === 'primitive'
              ? `${name}: primitive, facet ${d.facet} (${d.facetWords})${d.derived ? ' [derived from ports, never set]' : ''}: ${d.words}`
              : `${name}: composite: ${d.words}`,
          );
          if (d.composedOf)
            console.log(
              `  extends: ${d.composedOf.children.map((c) => c.trait).join(', ')}`,
            );
          if (d.kind === 'composite')
            console.log(`  expands to: ${d.expandsTo.join(', ')}`);
          if (d.implies.length)
            console.log(`  implies: ${d.implies.join(', ')}`);
          if (d.needs) console.log(`  needs a ${d.needs} trait`);
          for (const m of d.meta)
            console.log(
              `  metadata ${m.key}: ${m.spec.words}${m.spec.values ? ` (${m.spec.values.join('|')})` : ''}${m.value !== undefined ? `, set to ${m.value}` : m.spec.default !== undefined ? `, default ${m.spec.default}` : ''}`,
            );
          console.log(`  included by: ${d.includedBy.join(', ') || 'none'}`);
          const how = (
            s: import('../src/game/plant/trait-index.ts').TraitSource,
          ) =>
            s.by === 'named'
              ? 'named'
              : s.by === 'composite'
                ? `via ${s.via.join(' › ')}`
                : s.by === 'implied'
                  ? `implied by ${s.from}`
                  : `from ports: ${s.media.join(', ')}`;
          console.log(
            `  kinds (${d.kinds.length}): ${d.kinds.map((k) => `${k.kind} (${k.sources.map(how).join('; ')})`).join(', ') || 'none'}`,
          );
          break;
        }
        case 'define': {
          if (composites[name] || T.isPrimitive(name))
            fail(`refused: '${name}' is already a trait`);
          if (!opts.extends || !opts.description)
            fail(
              'usage: trait define <name> --extends a,b --description "…" [--set key=value,…]',
            );
          const c: CompositeTrait = {
            description: opts.description,
            extends: opts.extends
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            ...(opts.set ? { meta: metaOpts() } : {}),
          };
          await writeTraits({ ...composites, [name]: c }, [name]);
          if (!opts['dry-run'])
            console.log(`defined ${name} = ${c.extends.join(' + ')}`);
          break;
        }
        case 'edit': {
          const c = composites[name];
          if (!c) fail(`refused: '${name}' is not a composite trait`);
          const next: CompositeTrait = {
            description: opts.description ?? c.description,
            extends: opts.extends
              ? opts.extends
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              : c.extends,
            ...(opts.set
              ? { meta: { ...(c.meta ?? {}), ...metaOpts() } }
              : c.meta
                ? { meta: c.meta }
                : {}),
          };
          const u = traitUsers(name);
          console.log(
            `affects kinds: ${u.kinds.join(', ') || 'none'}; composites: ${u.composites.join(', ') || 'none'}`,
          );
          await writeTraits({ ...composites, [name]: next }, [name]);
          if (!opts['dry-run'])
            console.log(`edited ${name} = ${next.extends.join(' + ')}`);
          break;
        }
        case 'rename': {
          const to = rest[2];
          if (!composites[name] || !to)
            fail('usage: trait rename <composite> <new-name>');
          if (composites[to] || T.isPrimitive(to))
            fail(`refused: '${to}' is already a trait`);
          const next: Record<string, CompositeTrait> = {};
          for (const [n, c] of Object.entries(composites))
            next[n === name ? to : n] = {
              ...c,
              extends: c.extends.map((e) => (e === name ? to : e)),
            };
          const touched = Object.keys(next).filter(
            (n) => n === to || next[n].extends.includes(to),
          );
          await writeTraits(next, [name, ...touched], [name, to]);
          if (!opts['dry-run']) console.log(`renamed ${name} to ${to}`);
          break;
        }
        case 'remove': {
          if (!composites[name])
            fail(
              `refused: '${name}' is not a composite trait (primitives are code)`,
            );
          const u = traitUsers(name, true);
          const replace = opts['replace-with'];
          if ((u.kinds.length || u.composites.length) && !replace)
            fail(
              `refused: '${name}' is used by kinds: ${u.kinds.join(', ') || 'none'}; composites: ${u.composites.join(', ') || 'none'}. Use --replace-with <trait> to move them first.`,
            );
          const next = { ...composites };
          delete next[name];
          for (const n of u.composites)
            next[n] = {
              ...next[n],
              extends: [
                ...new Set(
                  next[n].extends.map((e) => (e === name ? replace! : e)),
                ),
              ],
            };
          const kindsNext = Object.fromEntries(
            Object.entries(files).map(([k, f]) => [
              k,
              f.traits?.includes(name)
                ? {
                    ...f,
                    traits: [
                      ...new Set(
                        f.traits.map((t) => (t === name ? replace! : t)),
                      ),
                    ].sort(),
                  }
                : f,
            ]),
          );
          const problems = F.validateRegistry(kindsNext, readIndex(), next);
          if (problems.length)
            fail(
              problems.map((p) => `refused: ${p.kind} ${p.message}`).join('\n'),
            );
          if (opts['dry-run']) {
            console.log(
              `dry run: would move kinds ${u.kinds.join(', ') || 'none'} and composites ${u.composites.join(', ') || 'none'} to ${replace ?? '(nothing)'}`,
            );
            break;
          }
          const written: string[] = [];
          for (const [k, f] of Object.entries(kindsNext))
            if (f !== files[k]) {
              await writeConfig(
                join(dir, `${k}.ts`),
                F.orderedKind(f),
                F.kindFileSource(f),
              );
              written.push(join(dir, `${k}.ts`));
            }
          for (const n of u.composites) {
            await writeConfig(
              join(traitDir, `${n}.ts`),
              T.orderedComposite(next[n]),
              T.compositeSource(next[n]),
            );
            written.push(join(traitDir, `${n}.ts`));
          }
          rmSync(join(traitDir, `${name}.ts`));
          writeAtomic(traitIndexPath, T.traitIndexText(Object.keys(next)));
          written.push(traitIndexPath);
          try {
            execFileSync('npx', ['vp', 'fmt', ...written], {
              cwd: root,
              stdio: 'ignore',
            });
          } catch {
            // The pre-commit hook formats in any case.
          }
          console.log(
            `removed ${name}${replace ? `; its users now have ${replace}` : ''}`,
          );
          break;
        }
        default:
          fail(`unknown: trait ${sub}; trait show|define|edit|rename|remove`);
      }
      break;
    }
    case 'kinds': {
      // Only reached with --with or --without (audit.ts sends plain listings elsewhere).
      // The same answer as the trait page's "kinds with it" (mission 174).
      const withUsers = opts.with
        ? new Set(
            TI.traitDetail(opts.with, await traitCtx()).kinds.map(
              (k) => k.kind,
            ),
          )
        : null;
      const out = Object.keys(files).filter((k) => {
        if (opts.with) return withUsers!.has(k);
        if (opts.without) {
          const facet =
            opts.without as import('../src/game/plant/traits.ts').Facet;
          if (!T.FACETS.includes(facet))
            fail(`refused: --without takes a facet: ${T.FACETS.join(', ')}`);
          const ps = T.expand(files[k].traits ?? [], composites).primitives;
          return !ps.some((p) => T.PRIMITIVES[p].facet === facet);
        }
        return true;
      });
      console.log(out.join('\n'));
      break;
    }
    case 'unclassified': {
      const scope = opts.room
        ? new Set(
            (
              await load<Model>(
                'src/toolkit/gallery/logic/audit-export/audit-export.ts',
              )
            )
              .roomAudit(opts.room)
              .objects.map((o) => o.kind),
          )
        : null;
      for (const [k, f] of Object.entries(files)) {
        if (scope && !scope.has(k)) continue;
        const ps = T.expand(f.traits ?? [], composites).primitives;
        if (!f.traits?.length) console.log(`${k}\tno traits`);
        else {
          const missing = T.primitiveProblems(k, ps, true).map(
            (p) => p.message,
          );
          if (missing.length) console.log(`${k}\t${missing.join('; ')}`);
        }
      }
      break;
    }
    case 'check': {
      const problems = F.validateRegistry(files, readIndex(), composites);
      const traitIndex = existsSync(traitIndexPath)
        ? T.traitIndexIds(readFileSync(traitIndexPath, 'utf8'))
        : [];
      const names = Object.keys(composites);
      for (const n of names)
        if (!traitIndex.includes(n))
          problems.push({
            kind: `trait:${n}`,
            message: 'has a file but is not in the traits index',
          });
      for (const n of traitIndex)
        if (!names.includes(n))
          problems.push({
            kind: `trait:${n}`,
            message: 'in the traits index but has no file',
          });
      const scoped = problems.filter((p) => !opts.kind || p.kind === opts.kind);
      for (const p of scoped)
        console.log(`${p.kind}${p.field ? `.${p.field}` : ''}: ${p.message}`);
      console.log(scoped.length ? `${scoped.length} problems` : 'no problems');
      if (scoped.length) process.exit(1);
      break;
    }
    case 'find': {
      const words = rest.join(' ').toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.length) fail('usage: find <words>');
      const hit = (hay: string) =>
        words.every((w) => hay.toLowerCase().includes(w));
      for (const [k, f] of Object.entries(files))
        if (hit(`${k} ${f.type} ${f.purpose} ${(f.traits ?? []).join(' ')}`))
          console.log(`kind  ${k}\t${f.type}: ${f.purpose}`);
      for (const n of T.PRIMITIVE_NAMES)
        if (hit(`${n} ${T.PRIMITIVES[n].words}`))
          console.log(`trait ${n}\t${T.PRIMITIVES[n].words}`);
      for (const [n, c] of Object.entries(composites))
        if (hit(`${n} ${c.description}`))
          console.log(`trait ${n}\t${c.description}`);
      break;
    }
    default:
      fail(`unknown command '${command}'; npm run -s audit -- help`);
  }
}
