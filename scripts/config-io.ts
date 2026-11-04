/**
 * Reading and writing the typed configuration files (mission 173; the
 * owner, 2026-11-04): each kind is `kinds/<kind>.ts`, `export default
 * defineKind({ … })`, each composite trait `traits/<trait>.ts`, `export
 * default defineTrait({ … })`. Read and edited as TypeScript through
 * magicast (an existing file is changed in place, so its comments
 * survive); a new one is written from the module's template. The caller
 * formats what was written with the project's formatter afterwards.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { loadFile, writeFile } from 'magicast';

/** The config objects of a directory's `.ts` files, by name (index.ts left out). */
export async function readConfigDir<T>(
  dir: string,
): Promise<Record<string, T>> {
  if (!existsSync(dir)) return {};
  const names = readdirSync(dir)
    .filter((n) => n.endsWith('.ts') && n !== 'index.ts')
    .sort();
  const out: Record<string, T> = {};
  for (const n of names)
    out[n.replace(/\.ts$/, '')] = await readConfig<T>(join(dir, n));
  return out;
}

/** One file's config object, as plain data. */
export async function readConfig<T>(path: string): Promise<T> {
  const mod = await loadFile(path);
  return JSON.parse(JSON.stringify(mod.exports.default.$args[0])) as T;
}

/**
 * Write a config file: edit an existing one in place (only the fields that
 * differ, so comments and layout elsewhere survive), or create it from
 * `source`. Atomic: written beside, then renamed.
 */
export async function writeConfig(
  path: string,
  next: Record<string, unknown>,
  source: string,
): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}.ts`;
  if (!existsSync(path)) {
    writeFileSync(tmp, source);
    renameSync(tmp, path);
    return;
  }
  const mod = await loadFile(path);
  const obj = mod.exports.default.$args[0] as Record<string, unknown>;
  const current = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  for (const key of Object.keys(current)) if (!(key in next)) delete obj[key];
  for (const [key, value] of Object.entries(next))
    if (JSON.stringify(current[key]) !== JSON.stringify(value))
      obj[key] = value;
  await writeFile(mod, tmp);
  // magicast leaves blank lines between properties it touched; config objects have none.
  writeFileSync(tmp, tidy(readFileSync(tmp, 'utf8')));
  renameSync(tmp, path);
}

/** A config file's text with the blank lines inside its object removed (comments kept). */
export const tidy = (text: string): string => {
  const open = text.search(/define(?:Kind|Trait)\(\{/);
  const close = text.lastIndexOf('});');
  if (open < 0 || close < open) return text;
  const body = text.slice(open, close).replace(/\n[ \t]*\n/g, '\n');
  return text.slice(0, open) + body + text.slice(close);
};
