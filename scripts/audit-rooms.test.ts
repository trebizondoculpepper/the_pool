import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

/**
 * The room registry's commands (mission 229, #103), run on copies of the
 * registry's indexes and two rooms, so the real files are never touched.
 */
const root = new URL('..', import.meta.url).pathname;
let work = '';
let rooms = '';
let traits = '';

const audit = (...args: string[]) => {
  try {
    return execFileSync(
      'node',
      ['scripts/audit.ts', ...args, '--dir', rooms, '--trait-dir', traits],
      { cwd: root, encoding: 'utf8', stdio: 'pipe' },
    );
  } catch (error) {
    const e = error as { status: number; stderr: string };
    return `exit ${e.status}: ${e.stderr}`;
  }
};
const ids = (dir: string, name: string) =>
  readFileSync(join(dir, 'index.ts'), 'utf8').match(
    new RegExp(`export const ${name} = \\[([^\\]]*)\\]`),
  )![1];

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'pool-rooms-'));
  rooms = join(work, 'declarations');
  traits = join(work, 'traits');
  const src = join(root, 'src/game/rooms');
  cpSync(join(src, 'traits/index.ts'), join(traits, 'index.ts'));
  for (const f of ['dev59.ts', 'dev60.ts', 'index.ts'])
    cpSync(join(src, 'declarations', f), join(rooms, f));
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

describe('audit room and room-trait (#103)', { timeout: 60_000 }, () => {
  it('registers a room built by a module starter, and unregisters it', () => {
    expect(
      audit(
        'room',
        'register',
        'zz_room',
        '--module',
        'toolkit/gallery/rooms/racks-room',
        '--start',
        'startRacksRoom',
        '--args',
        '[1]',
      ),
    ).toMatch(/registered room zz_room/);
    const file = readFileSync(join(rooms, 'zz_room.ts'), 'utf8');
    expect(file).toContain("start: 'startRacksRoom'");
    expect(file).toContain('args: [1]');
    expect(ids(rooms, 'ROOM_IDS')).toContain("'zz_room'");
    expect(audit('room', 'unregister', 'zz_room')).toMatch(/unregistered/);
    expect(existsSync(join(rooms, 'zz_room.ts'))).toBe(false);
    expect(ids(rooms, 'ROOM_IDS')).not.toContain("'zz_room'");
  });

  it('refuses a starter its module does not export, and a shared world', () => {
    expect(
      audit(
        'room',
        'register',
        'zz_room',
        '--module',
        'toolkit/gallery/rooms/racks-room',
        '--start',
        'startNothing',
      ),
    ).toMatch(/exit 2: refused: .* exports no startNothing/);
    expect(audit('room', 'unregister', 'dev59')).toMatch(
      /refused: dev60 shares dev59's world/,
    );
  });

  it('defines a room trait, adds it to a room and removes both', () => {
    expect(audit('room-trait', 'define', 'zz-probe')).toMatch(/needs --reason/);
    expect(
      audit('room-trait', 'define', 'zz-probe', '--reason', 'Test only.'),
    ).toMatch(/defined room trait zz-probe/);
    expect(ids(traits, 'ROOM_TRAIT_IDS')).toContain("'zz-probe'");
    expect(
      audit('room', 'trait', 'add', 'dev59', 'zz-probe', '--config', '{"n":2}'),
    ).toMatch(/added zz-probe to dev59/);
    expect(readFileSync(join(rooms, 'dev59.ts'), 'utf8')).toMatch(
      /trait: 'zz-probe',\s*config: \{\s*n: 2,?\s*\}/,
    );
    expect(audit('room-trait', 'remove', 'zz-probe')).toMatch(
      /refused: zz-probe is used by dev59/,
    );
    expect(audit('room', 'trait', 'remove', 'dev59', 'zz-probe')).toMatch(
      /removed zz-probe from dev59/,
    );
    expect(readFileSync(join(rooms, 'dev59.ts'), 'utf8')).not.toContain(
      'traits',
    );
    expect(audit('room-trait', 'remove', 'zz-probe')).toMatch(/removed/);
    expect(ids(traits, 'ROOM_TRAIT_IDS')).toBe('');
  });
});
