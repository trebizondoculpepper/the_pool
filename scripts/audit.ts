/**
 * The audits from the command line (mission 167; the owner, 2026-11-04):
 * the same documents as `audit/*.json` and the audit pages, built from the
 * game's configuration alone (registry, catalogue, descriptors, manifests),
 * with no browser, no dev server, no scene and no live simulation.
 *
 *   node scripts/audit.ts room <room>      one room's audit
 *   node scripts/audit.ts kind <kind>      one kind's audit
 *   node scripts/audit.ts index            every room and kind, summarised
 *   node scripts/audit.ts rooms | kinds    their ids, one per line
 *
 * Options: `--summary` prints counts, coverage and findings as text instead
 * of JSON. JSON goes to stdout; exit status 2 for a bad request.
 *
 * Editing the registry (mission 168): `show`, `register`, `unregister`,
 * `set`, `unset` and `bind`, in `scripts/audit-edit.ts`. Run with no
 * arguments, `help` or `--help` for the full help (`scripts/audit-help.ts`).
 */
import { runnerImport } from 'vite-plus';
import { EDIT_COMMANDS, runEdit } from './audit-edit.ts';
import { helpText } from './audit-help.ts';

const first = process.argv[2];
if (!first || first === 'help' || first === '--help' || first === '-h') {
  const root0 = new URL('..', import.meta.url).pathname;
  const { module: files } = await runnerImport<
    typeof import('../src/game/plant/kind-files.ts')
  >(`${root0}src/game/plant/kind-files.ts`, {
    root: root0,
    configFile: false,
    logLevel: 'error',
  });
  process.stdout.write(helpText(files.TRAIT_WORDS));
  process.exit(0);
}

if ((EDIT_COMMANDS as readonly string[]).includes(process.argv[2] ?? '')) {
  await runEdit(process.argv.slice(2));
  process.exit(0);
}

type Model =
  typeof import('../src/toolkit/gallery/logic/audit-export/audit-export.ts');

const USAGE =
  'usage: node scripts/audit.ts room <room> | kind <kind> | index | rooms [--by-size] | kinds [--summary]\n       node scripts/audit.ts show | register | unregister | set | unset | bind … (see scripts/audit-edit.ts)';

const args = process.argv.slice(2);
const summary = args.includes('--summary');
const [what, id] = args.filter((a) => !a.startsWith('--'));

if (!what || ((what === 'room' || what === 'kind') && !id)) {
  console.error(USAGE);
  process.exit(2);
}

const root = new URL('..', import.meta.url).pathname;
const { module: model } = await runnerImport<Model>(
  `${root}src/toolkit/gallery/logic/audit-export/audit-export.ts`,
  { root, configFile: false, logLevel: 'error' },
);

const findingLines = (findings: { severity: string; message: string }[]) =>
  findings.map((f) => `  ${f.severity.padEnd(7)} ${f.message}`);

switch (what) {
  case 'room': {
    const a = model.roomAudit(id);
    if (!summary) process.stdout.write(model.auditJson(a));
    else
      console.log(
        [
          `room ${id}: ${a.signOff}`,
          `  ${Object.entries(a.counts)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')}`,
          `  coverage: ${Object.entries(a.coverage)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')}`,
          ...a.objects.map(
            (o) =>
              `  ${o.ref} · ${o.kind}${o.registered ? '' : ' (unregistered)'}${o.affordances ? ` · ${o.affordances.value.interaction}` : ''}`,
          ),
          'findings:',
          ...findingLines(a.findings),
        ].join('\n'),
      );
    break;
  }
  case 'kind': {
    const k = model.kindAudit(id);
    if (!summary) process.stdout.write(model.auditJson(k));
    else
      console.log(
        [
          `kind ${id}: ${k.registered ? 'registered' : 'NOT registered'}, ${k.counts.placements} placed in ${k.counts.rooms} rooms`,
          ...k.placements.map((p) => `  ${p.room}: ${p.refs.join(', ')}`),
          'findings:',
          ...findingLines(k.findings),
        ].join('\n'),
      );
    break;
  }
  case 'index': {
    const index = model.auditIndex();
    if (!summary) process.stdout.write(model.auditJson(index));
    else
      console.log(
        [
          `${index.rooms.length} rooms, ${index.kinds.length} kinds`,
          ...index.rooms.map(
            (r) => `  room ${r.id}: ${r.signOff}, ${r.unresolved} unresolved`,
          ),
          ...index.kinds.map(
            (k) =>
              `  kind ${k.id}: ${k.registered ? '' : 'NOT registered, '}${k.placements} placed, ${k.unresolved} unresolved`,
          ),
        ].join('\n'),
      );
    break;
  }
  case 'rooms':
  case 'kinds': {
    const index = model.auditIndex();
    if (what === 'rooms' && args.includes('--by-size')) {
      // Smallest and simplest first (mission 169): objects, then manifest entries.
      const sized = index.rooms.map((r) => {
        const a = model.roomAudit(r.id);
        return {
          id: r.id,
          n: a.counts.objects + a.counts.manifest,
          u: r.unresolved,
        };
      });
      sized.sort((a, b) => a.n - b.n || a.u - b.u || (a.id < b.id ? -1 : 1));
      // Rooms the catalogue counts nothing in come last: no data is not small.
      const counted = sized.filter((r) => r.n > 0);
      const blank = sized.filter((r) => r.n === 0);
      console.log(
        [
          ...counted.map((r) => `${r.id}\t${r.n} objects\t${r.u} unresolved`),
          ...blank.map(
            (r) => `${r.id}\tno catalogue data (verify in the browser)`,
          ),
        ].join('\n'),
      );
    } else console.log(index[what].map((x) => x.id).join('\n'));
    break;
  }
  default:
    console.error(USAGE);
    process.exit(2);
}
