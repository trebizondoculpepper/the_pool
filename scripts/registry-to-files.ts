/**
 * Mission 171's one-off migration: every kind in the hard-coded registry
 * (`PLACED_KINDS` and `OTHER_KINDS` in `src/game/plant/equipment-kinds.ts`)
 * written as its own file, `src/game/plant/kinds/<kind>.json`, with the
 * index, by mission 168's writers, then formatted. Kept for the record;
 * once the registry reads the files it has nothing left to migrate.
 *
 *   node scripts/registry-to-files.ts
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runnerImport } from 'vite-plus';

type Kinds = typeof import('../src/game/plant/equipment-kinds.ts');
type Files = typeof import('../src/game/plant/kind-files.ts');
type KindFile = import('../src/game/plant/kind-files.ts').KindFile;

const root = new URL('..', import.meta.url).pathname;
const load = async <T>(path: string) =>
  (
    await runnerImport<T>(`${root}${path}`, {
      root,
      configFile: false,
      logLevel: 'error',
    })
  ).module;

const K = await load<Kinds>('src/game/plant/equipment-kinds.ts');
const F = await load<Files>('src/game/plant/kind-files.ts');

const dir = join(root, F.KIND_FILE_DIR);
mkdirSync(dir, { recursive: true });
const entries: { id: string; group: KindFile['group'] }[] = [];
const written: string[] = [];
for (const [group, kinds] of [
  ['placed', K.PLACED_KINDS],
  ['other', K.OTHER_KINDS],
] as const)
  for (const [id, k] of Object.entries(kinds)) {
    const file = { group, ...k } as KindFile;
    const path = join(dir, `${id}.json`);
    writeFileSync(path, F.kindFileText(file));
    written.push(path);
    entries.push({ id, group });
  }
const indexPath = join(dir, 'index.ts');
writeFileSync(indexPath, F.indexText(entries));
written.push(indexPath);
execFileSync('npx', ['vp', 'fmt', ...written], { cwd: root, stdio: 'ignore' });
console.log(
  `wrote ${entries.length} kind files and the index to ${F.KIND_FILE_DIR}`,
);
