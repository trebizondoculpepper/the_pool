/**
 * Mission 173's one-off migration: every `kinds/<kind>.json` and
 * `traits/<trait>.json` rewritten as typed TypeScript (`export default
 * defineKind({ … })`, `defineTrait`), the JSON removed, both indexes
 * regenerated to gather `*.ts`, then everything formatted. Kept for the
 * record.
 *
 *   node scripts/kinds-json-to-ts.ts
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { runnerImport } from 'vite-plus';

type Files = typeof import('../src/game/plant/kind-files.ts');
type Traits = typeof import('../src/game/plant/traits.ts');
type KindFile = import('../src/game/plant/kind-files.ts').KindFile;
type CompositeTrait = import('../src/game/plant/traits.ts').CompositeTrait;

const root = new URL('..', import.meta.url).pathname;
const load = async <T>(path: string) =>
  (
    await runnerImport<T>(`${root}${path}`, {
      root,
      configFile: false,
      logLevel: 'error',
    })
  ).module;
const F = await load<Files>('src/game/plant/kind-files.ts');
const T = await load<Traits>('src/game/plant/traits.ts');

const written: string[] = [];
const migrate = <C>(dir: string, source: (c: C) => string) => {
  const names: string[] = [];
  const all: Record<string, C> = {};
  for (const n of readdirSync(dir)
    .filter((x) => x.endsWith('.json'))
    .sort()) {
    const id = n.replace(/\.json$/, '');
    const c = JSON.parse(readFileSync(join(dir, n), 'utf8')) as C;
    writeFileSync(join(dir, `${id}.ts`), source(c));
    rmSync(join(dir, n));
    written.push(join(dir, `${id}.ts`));
    names.push(id);
    all[id] = c;
  }
  return { names, all };
};

const kindDir = join(root, F.KIND_FILE_DIR);
const kinds = migrate<KindFile>(kindDir, F.kindFileSource);
writeFileSync(
  join(kindDir, 'index.ts'),
  F.indexText(
    Object.entries(kinds.all).map(([id, f]) => ({ id, group: f.group })),
  ),
);
written.push(join(kindDir, 'index.ts'));

const traitDir = join(root, 'src/game/plant/traits');
if (existsSync(traitDir)) {
  const traits = migrate<CompositeTrait>(traitDir, T.compositeSource);
  writeFileSync(join(traitDir, 'index.ts'), T.traitIndexText(traits.names));
  written.push(join(traitDir, 'index.ts'));
}

execFileSync('npx', ['vp', 'fmt', ...written], { cwd: root, stdio: 'ignore' });
console.log(
  `migrated ${kinds.names.length} kinds to TypeScript in ${F.KIND_FILE_DIR}`,
);
