import { effect } from '@preact/signals-core';
import { worldStore } from '../../save/world-store';
import { kindCatalogue } from '../logic/kind-catalogue';
import { itemAuditLink, magicRoomLink } from '../logic/item-audit';
import { lookCatalogue, lookLink } from '../logic/look-catalogue';
import { objectDetail } from '../logic/object-detail';
import { simGraph } from '../logic/sim-graph/index';
import { auditRowLink } from '../logic/sim-graph/node-page';
import { adapterFor } from './magic-adapters';
import { el, table } from './look-audit-page';

/** An installed object's room, visual, graph and live condition, in ordinary DOM text. */
const STYLE = `
.od { max-width: 1100px; margin: 0 auto; padding: 0 16px 48px; }
.od h1 { font-size: 21px; } .od h2 { font-size: 16px; margin-top: 24px; border-top: 1px solid #3a3d42; padding-top: 12px; }
.od table { border-collapse: collapse; width: 100%; font-size: 13px; }
.od th, .od td { border-bottom: 1px solid #3a3d42; padding: 5px 7px; text-align: left; vertical-align: top; }
.od a { color: #9fc6ff; } .od .note { color: #a8a291; } .od .links { display: flex; flex-wrap: wrap; gap: 12px; }
.od .condition { padding: 10px 12px; background: #252a2e; border-radius: 5px; }
`;
const link = (href: string, label: string) => el('a', { href }, label);
const unknown = (message: string) => el('p', { className: 'note' }, message);
const valueText = (value: unknown) =>
  value === undefined || value === null
    ? 'unavailable'
    : typeof value === 'number'
      ? Number.isInteger(value)
        ? String(value)
        : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
      : typeof value === 'string' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);

export function runObjectDetailPage(root: HTMLElement): void {
  const q = new URLSearchParams(location.search);
  const room = q.get('room') ?? '';
  const ref = q.get('ref') ?? '';
  const slot = q.get('slot') ?? 'dev';
  const entries = lookCatalogue(room, kindCatalogue());
  const entry = entries.find((e) => e.ref.toLowerCase() === ref.toLowerCase());
  root.replaceChildren(el('style', {}, STYLE));
  const page = el('div', { className: 'od' });
  root.append(page);
  if (!entry) {
    document.title = 'Object not found · Bench';
    page.append(
      el('h1', {}, 'Object not found'),
      unknown(
        `No catalogue entry for ${ref || '(no ref)'} in ${room || '(no room)'}.`,
      ),
      link('bench.html', 'Bench index'),
    );
    return;
  }
  document.title = `${entry.ref} · ${entry.title} · Bench`;
  const store = worldStore(slot);
  const graph = simGraph();
  const availableMagicRoom = !!adapterFor(entry.kind);
  const draw = () => {
    const d = objectDetail(entry, entries, graph, store.world.value);
    const visual = entry.itemKey ?? entry.kind;
    const fields = d.nodes.flatMap((n) =>
      n.fields.map((f) => [
        link(n.href, n.name),
        f.name,
        valueText(f.value),
        f.unit ?? '',
      ]),
    );
    const behaviors = d.nodes.flatMap((n) => [
      ...(n.adapter ? [`${n.name}: ${n.adapter} (graph state adapter)`] : []),
      ...n.drivers.map((driver) => `${n.name}: ${driver}`),
    ]);
    page.replaceChildren(
      el('p', {}, link('bench.html', '← Bench index')),
      el('h1', {}, `${entry.ref} · ${entry.title}`),
      el(
        'p',
        {},
        `${entry.kindWord}${entry.assetId ? ` · ${entry.assetId}` : ''}${entry.tag ? ` · ${entry.tag}` : ''}`,
      ),
      el('h2', {}, 'Where it is'),
      el(
        'p',
        {},
        'Room: ',
        link(`./?room=${encodeURIComponent(entry.room)}`, entry.room),
      ),
      ...(d.position
        ? [
            el(
              'p',
              {},
              `Room coordinates: x ${d.position.x.toFixed(2)} m, z ${d.position.z.toFixed(2)} m; mount datum ${d.position.y.toFixed(2)} m above the room floor`,
            ),
          ]
        : [
            unknown(
              'No placement coordinates are recorded in the room layout.',
            ),
          ]),
      el(
        'p',
        {},
        'Contained by: ',
        d.parent
          ? link(d.parent.href, d.parent.name)
          : d.containment.length
            ? d.containment.map((c) => `${c.relation}: ${c.name}`).join('; ')
            : 'no containing object recorded',
      ),
      ...(d.containment.length
        ? [
            el(
              'div',
              { className: 'links' },
              ...d.containment.map((c) =>
                link(c.href, `${c.relation}: ${c.name}`),
              ),
            ),
          ]
        : []),
      el('h2', {}, 'Visual model'),
      el('p', {}, `Placed visual item: ${visual}`),
      el(
        'div',
        { className: 'links' },
        link(`./${lookLink(entry.room, entry.ref)}`, 'Go to instance'),
        link(itemAuditLink(entry.kind), 'Inspect visual model'),
        ...(availableMagicRoom
          ? [link(magicRoomLink(entry.kind), 'Magic room')]
          : []),
        link(auditRowLink(entry.room, entry.ref), 'Room audit row'),
      ),
      ...(!availableMagicRoom
        ? [
            unknown(
              'No isolated magic-room builder is registered for this visual kind.',
            ),
          ]
        : []),
      el('h2', {}, 'Simulation graph nodes'),
      ...(d.nodes.length
        ? [
            table(
              ['Node', 'Relationship', 'Kind'],
              d.nodes.map((n) => [
                link(n.href, n.name),
                n.relation,
                graph.nodes.get(n.id)?.kind ?? '',
              ]),
            ),
          ]
        : [unknown(d.modelFinding ?? 'No graph nodes recorded.')]),
      el('h2', {}, 'Current condition'),
      el(
        'p',
        { className: 'note' },
        `Simulation time: ${d.time.toFixed(1)} s · save slot: ${slot}`,
      ),
      ...(d.status
        ? [el('p', { className: 'condition' }, `Equipment status: ${d.status}`)]
        : []),
      ...(fields.length
        ? [table(['Node', 'Measurement or state', 'Value', 'Unit'], fields)]
        : [
            unknown(
              d.status
                ? 'No further graph-backed measurements are exposed.'
                : 'No live condition is exposed for this object.',
            ),
          ]),
      el('h2', {}, 'Known behavior models'),
      ...(d.behavior
        ? [
            el(
              'p',
              {},
              `${d.behavior.name} · ${d.behavior.source} · ${d.behavior.functions.join(', ')}`,
            ),
          ]
        : []),
      ...(behaviors.length
        ? [el('ul', {}, ...behaviors.map((b) => el('li', {}, b)))]
        : [
            unknown(
              d.behavior
                ? 'No graph state adapter or driver is declared.'
                : 'No behavior model is registered for this object.',
            ),
          ]),
      el('h2', {}, 'More views'),
      el(
        'div',
        { className: 'links' },
        ...(['front', 'left', 'right', 'above'] as const).map((mode) =>
          link(`./${lookLink(entry.room, entry.ref, mode)}`, `Look ${mode}`),
        ),
      ),
    );
  };
  draw();
  let pending = 0;
  effect(() => {
    // Read only to subscribe: a world change redraws the page.
    void store.world.value;
    if (!pending)
      pending = window.setTimeout(() => {
        pending = 0;
        draw();
      }, 250);
  });
}
