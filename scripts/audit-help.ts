/**
 * The audit command's help (the owner, 2026-11-04): every command, option,
 * field, trait and mounting, in one text an LLM can read once and then
 * operate the tool. The traits' meanings come from `TRAIT_WORDS` in
 * `src/game/plant/kind-files.ts`, so this text never drifts from the code.
 */
export function helpText(traitWords: Readonly<Record<string, string>>): string {
  const traits = Object.entries(traitWords)
    .map(([t, w]) => `    ${t.padEnd(11)} ${w}`)
    .join('\n');
  return `npm run -s audit -- <command> [arguments] [options]
(or node scripts/audit.ts …). Node only: no browser, dev server, scene or live simulation.

WHAT IT IS
  The audit reads the game's configuration (object registry, room catalogue,
  descriptors, manifests) and edits the object registry. Every object in the
  game is a registered kind; each kind is one JSON file,
  src/game/plant/kinds/<kind>.json, listed by src/game/plant/kinds/index.ts.
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
      The kind's file, its placements, and SOURCE EVIDENCE: each click use,
      seat, pick-up and named part found in its builder's source files, with
      file:line. Files are found by name (all the kind's words in the file
      name); add more with: set <kind> sources=path,path.

EDITING THE REGISTRY
  register <kind> --type "Word" --class plant|non-plant|decorative --purpose "Sentence."
           [--code XY] [--group placed|other] [--status none]
      Creates kinds/<kind>.json and adds it to the index. <kind> is lower-case
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
        traits=a,b,c        replaces the traits (see TRAITS); traits= clears
        mount=<on>:<face>   floor|wall|ceiling : +x|-x|+y|-y|+z|-z (see MOUNTING)
        type=…  purpose=…  code=…  class=plant|non-plant|decorative
        status=none|motor|level|pump-set|cabinet|booster|switch|gas|uv|filter
        template=valve|power|equipment  group=placed|other  brand=<brand id>
        sources=path,path   extra source files for show's evidence
  unset <kind> <field>
      Removes an optional field: template, brand, traits, mount, sources,
      affordances.
  bind <room> <thing> <kind>
      Ties a thing with no identity of its own in the scene (the desk's chair)
      to a kind, recorded in that kind's file. Refused for an unknown room or
      a thing already bound.

OPTIONS
  --summary   text instead of JSON (room, kind, index)
  --by-size   order rooms smallest first (rooms)
  --dir <path>  edit another kinds directory (testing only)
  help, --help  this text

TRAITS (combinable; the flags follow from them)
${traits}
  No traits = UNLABELLED (a finding). decorative is the deliberate label.
  Refused: decorative with operable, chair-like, portable or luggable;
  portable with luggable. Reported as odd: decorative with box-like.

MOUNTING
  How the kind meets the physical world: on floor, wall or ceiling, and the
  face of the object (in its own frame) that meets that support:
  floor:-y (its base), wall:-z (its back), ceiling:+y (its top).

HOW TO AUDIT (missions 169, 170)
  Pass 1, room by room, smallest first (rooms --by-size): make everything in
  the room a registered kind. Read the room (room <room> --summary), look at
  candidates with show <kind>, then register / bind. A room is done when
  nothing in it is unregistered.
  Pass 2, kind by kind, no rooms needed: set each kind's traits and mount
  from its show evidence.
  Never edit kind files by hand; never run whole-game audits.

EXAMPLES
  npm run -s audit -- rooms --by-size
  npm run -s audit -- room engineers_office --summary
  npm run -s audit -- show desk
  npm run -s audit -- register office-chair --type "Office chair" --class non-plant --purpose "A swivel chair to sit in."
  npm run -s audit -- set office-chair traits=chair-like,luggable mount=floor:-y
  npm run -s audit -- bind engineers_office desk-chair office-chair
  npm run -s audit -- room plant_pool_03 | jq '.findings'
`;
}
