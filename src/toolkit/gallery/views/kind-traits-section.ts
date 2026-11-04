import { FACET_RULES } from '../../../game/plant/traits';
import type { Facet } from '../../../game/plant/traits';
import { traitsOfKind } from '../../../game/plant/trait-index';
import {
  addCommand,
  fixCommand,
  sourceWords,
  traitAuditLink,
  traitContext,
} from '../logic/trait-audit';
import { el, table } from './look-audit-page';

/**
 * The item audit's "Its traits" section (mission 174): the traits the kind
 * names, and its full expanded set by facet, each with how it has it and a
 * link to its trait page, the commands to add or remove one, and any
 * problems. A kind with none says so. From data, the same as
 * `npm run audit -- show <kind>`.
 */

const href = (h: string) => h.replace(/^bench\.html/, '');
const traitLink = (t: string) => el('a', { href: href(traitAuditLink(t)) }, t);

export function kindTraitsSection(kind: string): HTMLElement {
  const t = traitsOfKind(kind, traitContext());
  const section = el('section', {}, el('h2', {}, 'Its traits'));
  if (!t.expanded.length) {
    section.append(
      el(
        'p',
        { className: 'note' },
        `No traits yet: ${kind} is unclassified (missions 170 and 176 classify the registry). See `,
        el('a', { href: href(traitAuditLink()) }, 'every trait'),
        '. To add one: ',
        el('code', {}, addCommand(kind, '<trait>')),
      ),
    );
    return section;
  }
  section.append(
    el(
      'p',
      {},
      'Named in its file: ',
      ...t.named.flatMap((n, i) => [i ? ', ' : '', traitLink(n)]),
      '.',
    ),
    table(
      ['Facet', 'Trait', 'Kind of trait', 'How it has it', 'To remove it'],
      t.expanded.map((x) => [
        x.facet ? `${x.facet}` : 'composite',
        traitLink(x.trait),
        x.primitive ? 'primitive' : 'composite',
        x.sources.map(sourceWords).join('; '),
        el('code', {}, fixCommand(kind, x.trait, x.sources[0])),
      ]),
    ),
    el(
      'p',
      { className: 'note' },
      'To add one: ',
      el('code', {}, addCommand(kind, '<trait>')),
      '. The page is read-only; the registry changes only through the command.',
    ),
  );
  const facets = new Set(
    t.expanded.map((x) => x.facet).filter(Boolean) as Facet[],
  );
  if (!facets.has('support'))
    section.append(
      el(
        'p',
        { className: 'bad' },
        `No support trait (${FACET_RULES.support.words}): floor-standing, wall-mounted or ceiling-mounted.`,
      ),
    );
  for (const p of t.problems)
    section.append(el('p', { className: 'bad' }, p.message));
  return section;
}
