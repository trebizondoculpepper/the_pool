/**
 * Look links' refs (mission 125, `doc/plans/125-look-links.md`): what a
 * `look=` names, and which of a room's marked owners it names. Pure: the
 * scene's owners come in as plain identities in scene order; the views
 * (`views/look-scene.ts`) find them and frame what this picks.
 *
 * A ref is anything Ctrl/Cmd+C copies: a tag (`BH-CP3`), an asset id
 * (`asset-1308`), a model binding (`node:<id>`, `fitting:<id>`,
 * `link:<id>`), a name or its slug, a part's key or `part:<label>`; a part
 * follows a slash (`BH-CP3/display`) and a repeated name takes `#n`, the
 * nth by scene order. Case is ignored. Mission 126's catalogue writes refs
 * in this form.
 */
import { INSTALLED_ASSET_IDS } from '../../../game/plant/installed-asset-ids';

export const LOOK_MODES = [
  'front',
  'left',
  'right',
  'room',
  'detail',
  'above',
] as const;
export type LookMode = (typeof LOOK_MODES)[number];
export const isLookMode = (mode: string): mode is LookMode =>
  (LOOK_MODES as readonly string[]).includes(mode);

export interface LookRef {
  /** As given. */
  raw: string;
  /** The object's part of it, before any `/part` or `#n`. */
  base: string;
  kind: 'asset' | 'model' | 'part' | 'tag-or-name';
  /** The part after the slash, if any. */
  part?: string;
  /** The nth (1-based, by scene order) of a repeated name. */
  index?: number;
}

/** A name as a slug: `Boiler cascade manager` is `boiler-cascade-manager`. */
export const slugOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Read a ref; null when it is empty. */
export function parseLookRef(raw: string): LookRef | null {
  let text = raw.trim();
  if (!text) return null;
  let index: number | undefined;
  const numbered = /#(\d+)$/.exec(text);
  if (numbered) {
    index = Number(numbered[1]);
    text = text.slice(0, numbered.index).trim();
  }
  let part: string | undefined;
  // A model binding's id or a part's label may hold no slash of ours: the
  // first slash after the object's part splits it.
  const slash = text.indexOf('/');
  if (slash > 0) {
    part = text.slice(slash + 1).trim() || undefined;
    text = text.slice(0, slash).trim();
  }
  if (!text) return null;
  const kind = /^asset-\d+$/i.test(text)
    ? 'asset'
    : /^(node|fitting|link):./i.test(text)
      ? 'model'
      : /^part:./i.test(text)
        ? 'part'
        : 'tag-or-name';
  return {
    raw,
    base: text,
    kind,
    ...(part ? { part } : {}),
    ...(index ? { index } : {}),
  };
}

export interface RegisterEntry {
  room: string;
  tag: string;
  assetId: string;
}

/** The register's entry for a tag or an asset id, ignoring case. */
export function registerEntryOf(text: string): RegisterEntry | null {
  for (const [key, entry] of Object.entries(INSTALLED_ASSET_IDS))
    if (same(entry.tag, text) || same(entry.assetId, text))
      return { room: key.split('|')[0], ...entry };
  return null;
}

/** The room a link without `room` means: the register's, for a tag or asset id. */
export function inferredRoom(raw: string): string | null {
  const ref = parseLookRef(raw);
  if (!ref) return null;
  return registerEntryOf(ref.base)?.room ?? null;
}

/** A marked owner in a room's scene, in scene order (`componentOf`'s identity). */
export interface LookOwner {
  tag?: string;
  name?: string;
  model?: { node: string } | { fitting: string } | { link: string };
  part?: { label: string };
  key?: string;
  /** The indices (in the owners' list) of the marked owners above it. */
  ancestors: readonly number[];
}

const modelRef = (owner: LookOwner) => {
  const model = owner.model;
  if (!model) return undefined;
  if ('node' in model) return `node:${model.node}`;
  if ('fitting' in model) return `fitting:${model.fitting}`;
  return `link:${model.link}`;
};

/**
 * What makes owners one target: the same tag, or the same model binding
 * (a pipe and its markings, a machine built in pieces); else itself.
 */
const targetKey = (owner: LookOwner, i: number) =>
  owner.tag
    ? `tag:${owner.tag.toLowerCase()}`
    : modelRef(owner)
      ? modelRef(owner)!.toLowerCase()
      : `#${i}`;

/** The unambiguous ref of an owner: its tag, its binding, else its name. */
export const refOfOwner = (owner: LookOwner) =>
  owner.tag ?? modelRef(owner) ?? owner.name ?? owner.key ?? '';

export interface LookTarget {
  /** The ref that names it unambiguously. */
  ref: string;
  /** The owners it is made of (their indices), its bounds their union. */
  members: number[];
  /** A part within it, if the ref named one. */
  part?: { ref: string; members: number[] };
}

export type LookResolution =
  | { ok: true; target: LookTarget }
  | { ok: false; reason: string; matches?: readonly string[] };

/** Group the owners at `indices` into their targets, in scene order. */
function targetsOf(owners: readonly LookOwner[], indices: readonly number[]) {
  const groups = new Map<string, number[]>();
  for (const i of indices) {
    const key = targetKey(owners[i], i);
    const all = groups.get(key);
    if (all) all.push(i);
    else
      groups.set(
        key,
        // Every owner of the room with this tag or binding belongs to it.
        key.startsWith('#')
          ? [i]
          : owners.flatMap((o, j) =>
              !o.part && targetKey(o, j) === key ? [j] : [],
            ),
      );
  }
  return [...groups.values()].map((members) => [...new Set(members)]);
}

/** Levenshtein distance, for the nearest refs of an unknown one. */
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = next;
    }
  }
  return row[b.length];
}

/** Up to `n` of the room's refs nearest `text`. */
export function nearestRefs(
  owners: readonly LookOwner[],
  text: string,
  n = 3,
): string[] {
  const refs = [
    ...new Set(owners.filter((o) => !o.part).map(refOfOwner)),
  ].filter(Boolean);
  const t = text.toLowerCase();
  return refs
    .map((ref) => ({ ref, d: distance(t, ref.toLowerCase()) }))
    .sort((a, b) => a.d - b.d || a.ref.localeCompare(b.ref))
    .slice(0, n)
    .map((r) => r.ref);
}

/** Pick one of several matches by `#n`, or refuse with each one's own ref. */
function oneOf(
  owners: readonly LookOwner[],
  groups: number[][],
  ref: LookRef,
  what: string,
): LookResolution {
  if (ref.index !== undefined) {
    const group = groups[ref.index - 1];
    return group
      ? {
          ok: true,
          target: { ref: `${ref.base}#${ref.index}`, members: group },
        }
      : {
          ok: false,
          reason: `'${ref.base}' matches ${groups.length} object${groups.length === 1 ? '' : 's'}: there is no #${ref.index}`,
        };
  }
  if (groups.length === 1) {
    const owner = owners[groups[0][0]];
    return {
      ok: true,
      target: { ref: refOfOwner(owner) || ref.base, members: groups[0] },
    };
  }
  const matches = groups.map((group, k) => {
    const owner = owners[group[0]];
    return owner.tag || modelRef(owner)
      ? refOfOwner(owner)
      : `${ref.base}#${k + 1}`;
  });
  return {
    ok: false,
    reason: `'${ref.base}' matches ${groups.length} ${what}: ${matches.join(', ')}`,
    matches,
  };
}

const partMatches = (owner: LookOwner, text: string) =>
  Boolean(
    owner.part &&
    (same(owner.part.label, text) ||
      slugOf(owner.part.label) === slugOf(text) ||
      (owner.key && same(owner.key, text)) ||
      same(`part:${owner.part.label}`, text)),
  );

/**
 * Which target of a room `raw` names: unique or refused (never guessed).
 * `room` is the room's id, for the reasons given.
 */
export function resolveLookRef(
  owners: readonly LookOwner[],
  raw: string,
  room: string,
): LookResolution {
  const ref = parseLookRef(raw);
  if (!ref) return { ok: false, reason: 'no ref to look at' };
  if (!owners.length)
    return { ok: false, reason: `no lookable objects in ${room} yet` };
  const all = owners.map((_, i) => i);
  const objects = all.filter((i) => !owners[i].part);
  let resolved: LookResolution | null = null;
  const register = ref.kind !== 'model' ? registerEntryOf(ref.base) : null;

  if (ref.kind === 'asset' || (register && same(register.tag, ref.base))) {
    if (!register)
      return {
        ok: false,
        reason: `no ${ref.base} in the register`,
      };
    const tagged = objects.filter(
      (i) => owners[i].tag && same(owners[i].tag!, register.tag),
    );
    if (!tagged.length)
      return {
        ok: false,
        reason:
          register.room === room
            ? `${register.tag} is in the register but not marked in ${room}'s scene (mission 127)`
            : `${register.tag} is in ${register.room}, not ${room}`,
      };
    resolved = {
      ok: true,
      target: { ref: register.tag, members: targetsOf(owners, tagged)[0] },
    };
  } else if (ref.kind === 'model') {
    const bound = objects.filter((i) => {
      const r = modelRef(owners[i]);
      return r !== undefined && same(r, ref.base);
    });
    if (bound.length)
      resolved = {
        ok: true,
        target: {
          ref: modelRef(owners[bound[0]])!,
          members: targetsOf(owners, bound)[0],
        },
      };
  } else if (ref.kind === 'tag-or-name') {
    // A tag, then a name or its slug.
    const tagged = objects.filter(
      (i) => owners[i].tag && same(owners[i].tag!, ref.base),
    );
    if (tagged.length)
      resolved = {
        ok: true,
        target: {
          ref: owners[tagged[0]].tag!,
          members: targetsOf(owners, tagged)[0],
        },
      };
    else {
      const named = objects.filter((i) => {
        const name = owners[i].name;
        return (
          name !== undefined &&
          (same(name, ref.base) || slugOf(name) === slugOf(ref.base))
        );
      });
      // A named thing whose pieces repeat its name is one thing: only
      // the outermost of them counts.
      const outer = named.filter(
        (i) => !owners[i].ancestors.some((a) => named.includes(a)),
      );
      if (outer.length)
        resolved = oneOf(owners, targetsOf(owners, outer), ref, 'objects');
    }
  }
  // A part's own key, or `part:<label>`, alone: the part, within the room.
  if (!resolved && (ref.kind === 'part' || ref.kind === 'tag-or-name')) {
    const parts = all.filter((i) => partMatches(owners[i], ref.base));
    if (parts.length) {
      const picked = oneOf(
        owners,
        parts.map((i) => [i]),
        ref,
        'parts',
      );
      if (!picked.ok) return picked;
      const partIndex = picked.target.members[0];
      const owner = owners[partIndex].ancestors.at(-1);
      return {
        ok: true,
        target: {
          ref: picked.target.ref,
          members:
            owner === undefined
              ? [partIndex]
              : (targetsOf(owners, [owner])[0] ?? [owner]),
          part: { ref: ref.base, members: [partIndex] },
        },
      };
    }
  }
  if (!resolved) {
    const nearest = nearestRefs(owners, ref.base);
    return {
      ok: false,
      reason: `no '${ref.base}' in ${room}${nearest.length ? `; nearest: ${nearest.join(', ')}` : ''}`,
      matches: nearest,
    };
  }
  if (!resolved.ok || !ref.part) return resolved;
  // A part within the target: by its label, its slug or its key.
  const members = new Set(resolved.target.members);
  const parts = all.filter(
    (i) =>
      owners[i].ancestors.some((a) => members.has(a)) &&
      partMatches(owners[i], ref.part!),
  );
  if (!parts.length) {
    const labels = all
      .filter(
        (i) =>
          owners[i].part && owners[i].ancestors.some((a) => members.has(a)),
      )
      .map((i) => owners[i].part!.label);
    return {
      ok: false,
      reason: `${resolved.target.ref} has no part '${ref.part}'${labels.length ? `; its parts: ${[...new Set(labels)].slice(0, 8).join(', ')}` : ''}`,
    };
  }
  if (parts.length > 1) {
    const labels = parts.map(
      (i) => owners[i].key ?? `part:${owners[i].part!.label}`,
    );
    return {
      ok: false,
      reason: `'${ref.part}' matches ${parts.length} parts of ${resolved.target.ref}: ${labels.join(', ')}`,
      matches: labels,
    };
  }
  return {
    ok: true,
    target: {
      ...resolved.target,
      part: { ref: `${resolved.target.ref}/${ref.part}`, members: parts },
    },
  };
}
