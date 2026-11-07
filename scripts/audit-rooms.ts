/**
 * The room registry from the command line (mission 229, #103; the owner,
 * 2026-11-07: the room registry is kept by the CLI, which registers rooms
 * and adds or removes their traits). Each room is
 * `src/game/rooms/declarations/<id>.ts` and each room trait
 * `src/game/rooms/traits/<trait>.ts`; the indexes beside them are written
 * from the directories, sorted. Files are edited in place (comments kept)
 * or written new, then formatted; git is the review and CI the validation.
 *
 *   room list                                 every room and how it is built
 *   room show <id>                            one room's declaration
 *   room register <id> --module <path> --start <fn> [--args '<json>']
 *                     [--shares <room>] [--zone-walk]
 *   room register <id> --hall <pool_0N> [--equipment <id>] [--title "…"]
 *   room unregister <id>
 *   room trait add <id> <trait> [--config '<json>']
 *   room trait remove <id> <trait>
 *   room-trait list | show <trait>
 *   room-trait define <trait> --reason "…" [--dev-only]
 *   room-trait remove <trait>
 *
 * Options: `--dir` and `--trait-dir` point at other directories (for tests).
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { readConfig, writeConfig } from './config-io.ts';

/** The words after `room` that are registry commands, not a room to audit. */
export const ROOM_COMMANDS = [
  'list',
  'show',
  'register',
  'unregister',
  'trait',
] as const;

const root = new URL('..', import.meta.url).pathname;

interface RoomFile {
  id: string;
  build: Record<string, unknown>;
  sharesWorldWith?: string;
  zoneWalk?: true;
  traits?: { trait: string; config?: Record<string, unknown> }[];
}

interface TraitFile {
  id: string;
  reason: string;
  devOnly?: boolean;
}

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

/** Parse a JSON option, or refuse. */
function json(name: string, text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    fail(`refused: --${name} is not JSON: ${text}`);
  }
}

/** A file's ids in a directory: its `.ts` files but the index and tests. */
function idsIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(
      (n) => n.endsWith('.ts') && n !== 'index.ts' && !n.endsWith('.test.ts'),
    )
    .map((n) => n.replace(/\.ts$/, ''))
    .sort();
}

/** Rewrite an index's id list from its directory, sorted, keeping the rest. */
function writeIndex(dir: string, name: string) {
  const path = join(dir, 'index.ts');
  const text = readFileSync(path, 'utf8');
  const ids = idsIn(dir);
  const list = ids.length
    ? `[\n${ids.map((id) => `  '${id}',`).join('\n')}\n] as const;`
    : '[] as const;';
  const next = text.replace(
    new RegExp(`export const ${name} = \\[[^\\]]*\\] as const;`),
    `export const ${name} = ${list}`,
  );
  if (next === text && !text.includes(`export const ${name} = ${list}`))
    fail(`could not find ${name} in ${path}`);
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, next);
  renameSync(tmp, path);
}

/** Format what was written with the project's formatter. */
function format(paths: string[]) {
  execFileSync('npx', ['vp', 'fmt', ...paths], { cwd: root, stdio: 'ignore' });
}

const literal = (value: unknown) =>
  JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, '$1:')
    .replace(/'/g, "\\'")
    .replace(/"/g, "'");

const roomSource = (room: RoomFile) =>
  `import { defineRoom } from '../define-room';\n\nexport default defineRoom(${literal(room)});\n`;

const traitSource = (
  trait: TraitFile,
) => `import { defineRoomTrait } from '../room-trait';

/**
 * ${trait.reason}
 */
export default defineRoomTrait({
  id: '${trait.id}',
  reason: ${literal(trait.reason)},${trait.devOnly ? '\n  devOnly: true,' : ''}
  visit() {
    // What the trait does for one visit: set up here, return its step and dispose.
    return {};
  },
});
`;

/** How a room is built, in a few words. */
const buildOf = (room: RoomFile) =>
  room.build.kind === 'plant-hall-shell'
    ? `plant hall shell ${String(room.build.hall as string)}${room.build.equipment ? ` (${String(room.build.equipment as string)})` : ''}`
    : `${String(room.build.module as string)}#${String(room.build.start as string)}${Array.isArray(room.build.args) && room.build.args.length ? ` ${JSON.stringify(room.build.args)}` : ''}`;

export async function runRooms(args: readonly string[]) {
  const { opts, words } = parse(args);
  const [group, command, ...rest] = words;
  const dir = opts.dir
    ? resolve(process.cwd(), opts.dir)
    : join(root, 'src/game/rooms/declarations');
  const traitDir = opts['trait-dir']
    ? resolve(process.cwd(), opts['trait-dir'])
    : join(root, 'src/game/rooms/traits');
  const roomPath = (id: string) => join(dir, `${id}.ts`);
  const traitPath = (id: string) => join(traitDir, `${id}.ts`);
  const readRoom = async (id: string | undefined) => {
    if (!id) fail('usage: room <command> <id>');
    if (!existsSync(roomPath(id)))
      fail(`refused: room '${id}' is not registered`);
    return readConfig<RoomFile>(roomPath(id));
  };
  const saveRoom = async (room: RoomFile, index = false) => {
    await writeConfig(
      roomPath(room.id),
      room as unknown as Record<string, unknown>,
      roomSource(room),
    );
    if (index) writeIndex(dir, 'ROOM_IDS');
    format([roomPath(room.id), join(dir, 'index.ts')]);
  };
  const rooms = async () => {
    const out: RoomFile[] = [];
    for (const id of idsIn(dir))
      out.push(await readConfig<RoomFile>(roomPath(id)));
    return out;
  };

  if (group === 'room-trait') {
    switch (command) {
      case 'list': {
        for (const id of idsIn(traitDir)) {
          const t = await readConfig<TraitFile>(traitPath(id));
          console.log(`${id}\t${t.devOnly ? 'dev only\t' : ''}${t.reason}`);
        }
        return;
      }
      case 'show': {
        const id = rest[0];
        if (!id || !existsSync(traitPath(id)))
          fail(`refused: room trait '${id ?? ''}' is not registered`);
        const users = (await rooms()).filter((r) =>
          r.traits?.some((u) => u.trait === id),
        );
        console.log(readFileSync(traitPath(id), 'utf8'));
        console.log(
          `used by: ${users.map((r) => r.id).join(', ') || 'no room'}`,
        );
        return;
      }
      case 'define': {
        const id = rest[0];
        if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id))
          fail('usage: room-trait define <trait-id> --reason "…" [--dev-only]');
        if (existsSync(traitPath(id)))
          fail(`refused: room trait '${id}' is already defined`);
        if (!opts.reason)
          fail(
            'refused: a room trait needs --reason, its gameplay reason (the owner, 2026-11-04)',
          );
        const source = traitSource({
          id,
          reason: opts.reason,
          ...(opts['dev-only'] ? { devOnly: true } : {}),
        });
        writeFileSync(traitPath(id), source);
        writeIndex(traitDir, 'ROOM_TRAIT_IDS');
        format([traitPath(id), join(traitDir, 'index.ts')]);
        console.log(
          `defined room trait ${id}: ${relative(root, traitPath(id))} (write its visit)`,
        );
        return;
      }
      case 'remove': {
        const id = rest[0];
        if (!id || !existsSync(traitPath(id)))
          fail(`refused: room trait '${id ?? ''}' is not registered`);
        const users = (await rooms()).filter((r) =>
          r.traits?.some((u) => u.trait === id),
        );
        if (users.length)
          fail(
            `refused: ${id} is used by ${users.map((r) => r.id).join(', ')}`,
          );
        rmSync(traitPath(id));
        writeIndex(traitDir, 'ROOM_TRAIT_IDS');
        format([join(traitDir, 'index.ts')]);
        console.log(`removed room trait ${id}`);
        return;
      }
      default:
        fail(
          'usage: room-trait list | show <trait> | define <trait> --reason "…" | remove <trait>',
        );
    }
  }

  switch (command) {
    case 'list': {
      for (const room of await rooms())
        console.log(
          `${room.id}\t${buildOf(room)}${room.sharesWorldWith ? `\tshares ${room.sharesWorldWith}` : ''}${room.traits?.length ? `\ttraits ${room.traits.map((u) => u.trait).join(', ')}` : ''}`,
        );
      return;
    }
    case 'show': {
      const room = await readRoom(rest[0]);
      console.log(readFileSync(roomPath(room.id), 'utf8'));
      console.log(`built by: ${buildOf(room)}`);
      return;
    }
    case 'register': {
      const id = rest[0];
      if (!id)
        fail(
          'usage: room register <id> --module <path> --start <fn> | --hall <pool_0N>',
        );
      if (existsSync(roomPath(id)))
        fail(`refused: room '${id}' is already registered`);
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id))
        fail(
          `refused: '${id}' is not a room id (letters, digits and underscores)`,
        );
      let build: Record<string, unknown>;
      if (opts.hall) {
        if (!/^pool_0[1-4]$/.test(opts.hall))
          fail(`refused: --hall must be pool_01 to pool_04, not ${opts.hall}`);
        build = {
          kind: 'plant-hall-shell',
          hall: opts.hall,
          ...(opts.equipment ? { equipment: opts.equipment } : {}),
          ...(opts.title ? { title: opts.title } : {}),
        };
      } else {
        if (!opts.module || !opts.start)
          fail('refused: register needs --module and --start, or --hall');
        const module = opts.module.replace(/^src\//, '').replace(/\.ts$/, '');
        const source = join(root, 'src', `${module}.ts`);
        if (!existsSync(source)) fail(`refused: no module src/${module}.ts`);
        if (
          !new RegExp(
            `export (async function|function|const) ${opts.start}\\b`,
          ).test(readFileSync(source, 'utf8'))
        )
          fail(`refused: src/${module}.ts exports no ${opts.start}`);
        const startArgs = json('args', opts.args);
        if (startArgs !== undefined && !Array.isArray(startArgs))
          fail('refused: --args must be a JSON array');
        build = {
          kind: 'module',
          module,
          start: opts.start,
          ...(startArgs ? { args: startArgs } : {}),
        };
      }
      if (opts.shares && !existsSync(roomPath(opts.shares)))
        fail(`refused: --shares ${opts.shares} is not registered`);
      const room: RoomFile = {
        id,
        build,
        ...(opts.shares ? { sharesWorldWith: opts.shares } : {}),
        ...(opts['zone-walk'] ? { zoneWalk: true as const } : {}),
      };
      await saveRoom(room, true);
      console.log(
        `registered room ${id}: ${buildOf(room)}\n  If it is a new room, add it to RoomId and ROOMS in src/toolkit/gallery/logic/dev-room-links.ts too (registry.test.ts checks they agree).`,
      );
      return;
    }
    case 'unregister': {
      const room = await readRoom(rest[0]);
      const sharers = (await rooms()).filter(
        (r) => r.sharesWorldWith === room.id,
      );
      if (sharers.length)
        fail(
          `refused: ${sharers.map((r) => r.id).join(', ')} shares ${room.id}'s world`,
        );
      rmSync(roomPath(room.id));
      writeIndex(dir, 'ROOM_IDS');
      format([join(dir, 'index.ts')]);
      console.log(`unregistered room ${room.id}`);
      return;
    }
    case 'trait': {
      const [action, id, trait] = rest;
      if ((action !== 'add' && action !== 'remove') || !id || !trait)
        fail("usage: room trait add|remove <room> <trait> [--config '<json>']");
      const room = await readRoom(id);
      const traits = room.traits ?? [];
      if (action === 'add') {
        if (!existsSync(traitPath(trait)))
          fail(
            `refused: room trait '${trait}' is not defined (room-trait define)`,
          );
        if (traits.some((u) => u.trait === trait))
          fail(`refused: ${id} already has ${trait}`);
        const config = json('config', opts.config);
        if (
          config !== undefined &&
          (typeof config !== 'object' ||
            Array.isArray(config) ||
            config === null)
        )
          fail('refused: --config must be a JSON object');
        room.traits = [
          ...traits,
          {
            trait,
            ...(config ? { config: config as Record<string, unknown> } : {}),
          },
        ];
      } else {
        if (!traits.some((u) => u.trait === trait))
          fail(`refused: ${id} has no ${trait}`);
        room.traits = traits.filter((u) => u.trait !== trait);
        if (!room.traits.length) delete room.traits;
      }
      await saveRoom(room);
      console.log(
        `${action === 'add' ? 'added' : 'removed'} ${trait} ${action === 'add' ? 'to' : 'from'} ${id}`,
      );
      return;
    }
    default:
      fail(
        'usage: room list | show <id> | register <id> … | unregister <id> | trait add|remove <id> <trait>',
      );
  }
}
