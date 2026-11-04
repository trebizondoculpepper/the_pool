/**
 * The audit command's help (the owner, 2026-11-04): every command, option,
 * field, trait and mounting, in one text an LLM can read once and then
 * operate the tool. The traits, facets and metadata come from
 * `src/game/plant/traits.ts`, so this text never drifts from the code.
 */
type Traits = typeof import('../src/game/plant/traits.ts');

export function helpText(T: Traits): string {
  const traits = T.FACETS.map((facet) => {
    const r = T.FACET_RULES[facet];
    const rule = r.derived
      ? 'derived from model ports, never set'
      : r.exactly !== undefined
        ? `exactly ${r.exactly}`
        : r.atMost !== undefined
          ? `at most ${r.atMost}`
          : 'any number';
    const lines = T.PRIMITIVE_NAMES.filter(
      (p) => T.PRIMITIVES[p].facet === facet,
    ).map((p) => {
      const prim = T.PRIMITIVES[
        p
      ] as import('../src/game/plant/traits.ts').Primitive;
      const meta = Object.entries(prim.meta ?? {})
        .map(
          ([k, m]) =>
            `${k}${m.values ? `=${m.values.join('|')}` : '=<number>'}${m.default !== undefined ? ` (default ${m.default})` : ''}`,
        )
        .join('; ');
      return `      ${p.padEnd(16)} ${prim.words}${prim.implies ? ` [implies ${prim.implies.join(', ')}]` : ''}${prim.needs ? ` [needs a ${prim.needs}]` : ''}${meta ? `\n${' '.repeat(23)}metadata: ${meta}` : ''}`;
    });
    return `    ${facet} — ${r.words} (${rule}):\n${lines.join('\n')}`;
  }).join('\n');
  return `npm run -s audit -- <command> [arguments] [options]
(or node scripts/audit.ts …). Node only: no browser, dev server, scene or live simulation.

WHAT IT IS
  The audit reads the game's configuration (object registry, room catalogue,
  descriptors, manifests) and edits the object registry. Every object in the
  game is a registered kind; each kind is one typed TypeScript file,
  src/game/plant/kinds/<kind>.ts (export default defineKind({ … })), listed by
  src/game/plant/kinds/index.ts; the compiler checks every one. The command
  edits them as TypeScript (magicast, comments kept) and formats them.
  Change kinds ONLY with this command, never by editing those files by hand.
  Edits are written at once: git is the review (roll back a bad change) and
  CI the validation. Obviously bad values are refused before writing.
  Exit status: 0 done, 2 refused or bad request (the reason is printed).

READING
  room <room> [--summary]
      One room's audit as JSON: its objects with their kinds and flags,
      manifest evidence, coverage per capability, findings, sign-off.
      --summary prints the same as text.
  kind <kind> [--summary]
      One kind's audit as JSON: registered or not, flags, placements by room,
      findings.
  index [--summary]
      Every room and kind, with coverage, sign-off and unresolved counts.
  rooms [--by-size]
      Room ids, one per line. --by-size: smallest first (objects plus
      manifest entries), with unresolved counts; rooms with no catalogue
      data last (verify those in the browser).
  kinds
      Kind ids, one per line.
  show <kind>
      The kind's file, its placements, SOURCE EVIDENCE (each click use, seat,
      pick-up and named part in its builder's source files, with file:line;
      files found by name, add more with set <kind> sources=path,path), its
      traits expanded to primitives, its resolved metadata and where each
      value came from (kind, a composite, or default), problems, and its
      service traits derived from its model ports.
  traits
      Every trait: primitives by facet, then composites, each with its meaning
      and how many kinds use it.
  trait show <trait>
      A trait's definition, what it expands to, its metadata and defaults,
      and the kinds and composites that use it.
  kinds --with <trait>       kinds having a trait (through composites too;
                             service traits are derived from ports)
  kinds --without <facet>    kinds missing a facet (e.g. --without support)
  unclassified [--room <room>]
      Kinds with no traits, or missing a facet a classified kind needs.
  check [--kind <kind>]
      Every validation CI runs (kind files, index, traits, composites,
      metadata); exit 1 if anything is wrong.
  find <words>
      Search kinds (id, type, purpose, traits) and traits (name, meaning).

EDITING THE REGISTRY
  register <kind> --type "Word" --class plant|non-plant|decorative --purpose "Sentence."
           [--code XY] [--group placed|other] [--status none]
      Creates kinds/<kind>.ts and adds it to the index. <kind> is lower-case
      words joined by hyphens (office-chair). --type is its word in a
      description ("Office chair"); --purpose what such a thing is for;
      --code its tag letters (default: the type's initials; codes are shared
      by family, every tank is T); --group placed if the room layouts place it,
      else other (default other); --status how its live state is put
      (default none).
  unregister <kind>
      Removes its file and index line. Refused while the kind is placed in a
      room or has bindings.
  set <kind> <field>=<value> [<field>=<value> …]
      Edits that kind's file and prints old → new for each field.
        traits=a,b,c        replaces the traits (primitive or composite); traits= clears
        traits+=a,b         adds traits
        traits-=a           removes traits the kind itself names (inherited
                            traits cannot be removed: traits are addition only)
        <metadata>=<value>  a value its traits imply (origin=centre, axis=x,
                            seatHeight=0.47, look=-z …; see TRAITS)
        type=…  purpose=…  code=…  class=plant|non-plant|decorative
        status=none|motor|level|pump-set|cabinet|booster|switch|gas|uv|filter
        template=valve|power|equipment  group=placed|other  brand=<brand id>
        sources=path,path   extra source files for show's evidence
  unset <kind> <field>
      Removes an optional field (template, brand, traits, meta, sources,
      affordances), or one metadata value, back to its inherited or default.

EDITING TRAITS (composites: src/game/plant/traits/<trait>.ts, defineTrait)
  trait define <name> --extends a,b --description "…" [--set key=value,…]
      A composite trait bundling primitives and other composites, with
      optional metadata defaults. Refused: an unknown parent, a cycle, a name
      already a trait, a bundled service trait, or a contradictory expansion.
  trait edit <name> [--extends …] [--description …] [--set key=value,…]
      Changes a composite; prints the kinds and composites it affects; refused
      if any would become invalid.
  trait rename <name> <new-name>
      Renames a composite everywhere it is used.
  trait remove <name> [--replace-with <trait>]
      Refused while any kind or composite uses it (they are listed);
      --replace-with moves them onto another trait first.
  --dry-run (with trait define|edit|rename|remove): validate and report, write nothing.
  Primitive traits are code (src/game/plant/traits.ts): adding one is new
  game meaning, a code change.
  bind <room> <thing> <kind>
      Ties a thing with no identity of its own in the scene (the desk's chair)
      to a kind, recorded in that kind's file. Refused for an unknown room or
      a thing already bound.

OPTIONS
  --summary   text instead of JSON (room, kind, index)
  --by-size   order rooms smallest first (rooms)
  --dir <path>  edit another kinds directory (testing only)
  --trait-dir <path>  another composite-traits directory (testing only)
  help, --help  this text

TRAITS (addition only: a kind has the union of the traits it names and
their expansions; primitives by facet, each with what it means)
${traits}
  decorative: seen and nothing else; only with a form, a support and fixed.
  A floor-standing kind's floor is its local y = 0 plane (origin=base) by
  default: no configuration. Wall-mounted: origin=centre, its height from each
  room layout. The world is y-up, in metres.

HOW TO AUDIT (missions 169, 170)
  Pass 1, room by room, smallest first (rooms --by-size): make everything in
  the room a registered kind. Read the room (room <room> --summary), look at
  candidates with show <kind>, then register / bind. A room is done when
  nothing in it is unregistered.
  Pass 2, kind by kind, no rooms needed: define a few composites (trait
  define), then give each kind one or two (set <kind> traits=…), from its show
  evidence; check and unclassified show what is left.
  Never edit kind files by hand; never run whole-game audits.

EXAMPLES
  npm run -s audit -- rooms --by-size
  npm run -s audit -- room engineers_office --summary
  npm run -s audit -- show desk
  npm run -s audit -- register office-chair --type "Office chair" --class non-plant --purpose "A swivel chair to sit in."
  npm run -s audit -- trait define software-box --extends holdable,box-like,floor-standing --description "A boxed software package."
  npm run -s audit -- set office-chair traits=sittable,luggable,floor-standing seatHeight=0.47
  npm run -s audit -- kinds --with powered
  npm run -s audit -- bind engineers_office desk-chair office-chair
  npm run -s audit -- room plant_pool_03 | jq '.findings'
`;
}
