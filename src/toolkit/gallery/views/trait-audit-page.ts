import { traitDetail, traitIndex } from '../../../game/plant/trait-index';
import type { TraitTree } from '../../../game/plant/trait-index';
import { itemAuditLink } from '../logic/item-audit';
import { kindCatalogue } from '../logic/kind-catalogue';
import { objectDetailLink } from '../logic/object-detail';
import {
  fixCommand,
  sourceWords,
  traitAuditLink,
  traitContext,
  traitObjects,
} from '../logic/trait-audit';
import { count, el, table } from './look-audit-page';

/**
 * The trait audit page (mission 174): `bench.html?bench=trait-audit` lists
 * every trait by facet with its use counts; `&trait=<t>` shows one trait:
 * what it means, what composes it and what includes it, the kinds that have
 * it and how, and every object in the world with it, each a link, with the
 * command that would correct a misfit. Built from data alone, the same
 * queries as `npm run audit -- traits | trait show`. Read-only: the
 * registry changes only through the command.
 */

const STYLE = `
.ta { max-width: 1200px; margin: 0 auto; padding: 0 16px 48px; }
.ta h1 { font-size: 20px; } .ta h2 { font-size: 16px; margin-top: 24px; }
.ta table { border-collapse: collapse; width: 100%; font-size: 13px; }
.ta th, .ta td { border-bottom: 1px solid #3a3d42; padding: 4px 6px; text-align: left; vertical-align: top; }
.ta a { color: #9fc6ff; } .ta .note { color: #a8a291; } .ta .bad { color: #ff9b8a; }
.ta .scroll { overflow-x: auto; }
.ta .counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.ta .count { background: #262a2f; border-radius: 6px; padding: 8px 12px; min-width: 96px; }
.ta .count b { display: block; font-size: 20px; }
.ta code { font-size: 12px; background: #262a2f; padding: 1px 4px; border-radius: 3px; user-select: all; }
.ta ul.tree { margin: 4px 0; padding-left: 18px; }
.ta .tag { font-size: 11px; padding: 0 4px; border-radius: 3px; background: #33373d; margin-left: 4px; }
`;

const href = (h: string) => h.replace(/^bench\.html/, '');
const traitLink = (t: string) => el('a', { href: href(traitAuditLink(t)) }, t);

function treeList(t: TraitTree): HTMLElement {
  return el(
    'ul',
    { className: 'tree' },
    ...t.children.map((c) =>
      el(
        'li',
        {},
        traitLink(c.trait),
        el(
          'span',
          { className: 'tag' },
          c.primitive ? 'primitive' : 'composite',
        ),
        ...(c.children.length ? [treeList(c)] : []),
      ),
    ),
  );
}

function indexPage(page: HTMLElement) {
  document.title = 'Traits';
  page.append(
    el('h1', {}, 'Traits'),
    el(
      'p',
      { className: 'note' },
      'Every trait, primitives by facet then composites, with how many kinds have it (named, through a composite, implied, or derived from ports). The same as ',
      el('code', {}, 'npm run -s audit -- traits'),
      '. Mission 174.',
    ),
  );
  for (const g of traitIndex(traitContext())) {
    page.append(
      el('h2', {}, `${g.facet} — ${g.words}`),
      g.traits.length
        ? table(
            ['Trait', 'What it means', 'Kinds'],
            g.traits.map((t) => [
              traitLink(t.name),
              t.words,
              t.kinds
                ? String(t.kinds)
                : el('span', { className: 'note' }, 'used by nothing'),
            ]),
          )
        : el('p', { className: 'note' }, 'None yet.'),
    );
  }
}

function traitPage(page: HTMLElement, name: string) {
  const d = traitDetail(name, traitContext());
  document.title = `Trait · ${name}`;
  page.append(
    el(
      'p',
      {},
      el('a', { href: './bench.html' }, '← Bench index'),
      ' · ',
      el('a', { href: href(traitAuditLink()) }, 'Traits'),
    ),
    el('h1', {}, name),
  );
  if (d.kind === 'unknown') {
    page.append(el('p', { className: 'bad' }, `'${name}' is not a trait.`));
    return;
  }
  page.append(
    el(
      'p',
      {},
      el('b', {}, d.kind),
      d.facet ? ` · facet ${d.facet} (${d.facetWords})` : '',
      d.derived ? ' · derived from the model’s ports, never set by hand' : '',
    ),
    el('p', {}, `What it means: ${d.words}`),
  );
  const facts: (string | Node)[] = [];
  if (d.implies.length)
    facts.push('Implies: ', ...d.implies.map(traitLink), '. ');
  if (d.needs) facts.push(`Needs a ${d.needs} trait. `);
  if (d.conflicts.length)
    facts.push(`Conflicts with: ${d.conflicts.join(', ')}. `);
  if (facts.length) page.append(el('p', {}, ...facts));
  if (d.meta.length)
    page.append(
      el('h2', {}, 'Metadata it implies'),
      table(
        ['Key', 'Means', 'Values', 'Default', 'Set here'],
        d.meta.map((m) => [
          m.key,
          m.spec.words,
          m.spec.values?.join(' | ') ?? m.spec.type,
          m.spec.default === undefined ? '—' : String(m.spec.default),
          m.value === undefined ? '—' : String(m.value),
        ]),
      ),
    );
  if (d.composedOf)
    page.append(
      el('h2', {}, 'Composed of'),
      treeList(d.composedOf),
      el(
        'p',
        {},
        'Expands to: ',
        ...d.expandsTo.flatMap((p, i) => [i ? ', ' : '', traitLink(p)]),
      ),
    );
  page.append(
    el('h2', {}, `Included by (${d.includedBy.length})`),
    d.includedBy.length
      ? el(
          'p',
          {},
          ...d.includedBy.flatMap((c, i) => [i ? ', ' : '', traitLink(c)]),
        )
      : el('p', { className: 'note' }, 'No composite includes it.'),
  );

  const catalogue = kindCatalogue();
  const objects = traitObjects(
    d.kinds.map((k) => k.kind),
    catalogue,
  );
  page.append(
    el(
      'div',
      { className: 'counts' },
      count('kinds', d.kinds.length),
      count('objects', objects.objects),
      count('rooms', objects.roomCount),
      count('outside dev rooms', objects.outsideDev),
    ),
    el('h2', {}, `Kinds with it (${d.kinds.length})`),
    d.kinds.length
      ? table(
          ['Kind', 'How', 'Objects', 'To remove it'],
          d.kinds.map((k) => [
            el('a', { href: href(itemAuditLink(k.kind)) }, k.kind),
            k.sources.map(sourceWords).join('; '),
            String(catalogue.find((c) => c.key === k.kind)?.copies.length ?? 0),
            el('code', {}, fixCommand(k.kind, name, k.sources[0])),
          ]),
        )
      : el(
          'p',
          { className: 'note' },
          'No kind has it yet (mission 176 applies the approved traits).',
        ),
    el(
      'h2',
      {},
      `Objects with it (${objects.objects} in ${objects.roomCount} rooms, ${objects.outsideDev} outside dev rooms)`,
    ),
  );
  for (const r of objects.rooms)
    page.append(
      el(
        'h3',
        {},
        `${r.room}${r.dev ? ' (dev room)' : ''} · ${r.copies.length}`,
      ),
      table(
        ['Object', 'Kind', 'Tag'],
        r.copies.map((c) => [
          el(
            'a',
            { href: href(objectDetailLink(r.room, c.ref)) },
            c.name || c.ref,
          ),
          el('a', { href: href(itemAuditLink(c.kind)) }, c.kind),
          c.tag ?? '—',
        ]),
      ),
    );
}

export function runTraitAuditPage(root: HTMLElement) {
  root.replaceChildren(el('style', {}, STYLE));
  const page = el('div', { className: 'ta' });
  root.append(page);
  const trait = new URLSearchParams(location.search).get('trait');
  if (trait) traitPage(page, trait);
  else indexPage(page);
  (window as unknown as { __traitAudit: unknown }).__traitAudit = trait
    ? traitDetail(trait, traitContext())
    : traitIndex(traitContext());
}
