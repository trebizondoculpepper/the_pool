import type { ObjectDescriptor } from '../../../game/descriptors/descriptor';
import type { InventoryEntry } from '../../../game/plant/equipment-catalogue';
import { brandById } from '../../components/core/logic/brands';
import type { KindEntry } from './kind-catalogue';
import { connectionsOf, controlledBy, controlsOf } from './room-audit';
import type { AuditNetwork } from './room-audit';
import { resolveRef } from './sim-graph/graph';
import type { SimGraph } from './sim-graph/graph';

/**
 * The magic page (mission 130): a kind with no 3D form of its own, in
 * words, written from the model and 131's descriptors, never by hand: its
 * role, each copy's description, what it is part of, its connections,
 * what works it and what it works, its states and what shows it. Each
 * section says plainly where the model does not say. The shape mission
 * 128's text mode can reuse. Pure.
 */

export interface MagicSection {
  heading: string;
  lines: string[];
}

export interface MagicPage {
  title: string;
  sections: MagicSection[];
}

export interface MagicPageInput {
  /** The model's inventory (`plantInventory()`), for each copy's description and normal state. */
  inventory: readonly InventoryEntry[];
  /** 131's descriptors (`objectDescriptors()`). */
  descriptors: readonly ObjectDescriptor[];
  /** A room's enhanced network (129's `auditNetwork`), if it has one. */
  network(room: string): AuditNetwork | undefined;
  /** The executing graph, where known; newer than the room-audit network. */
  graph?: SimGraph;
}

const none = (lines: string[], said: string) => (lines.length ? lines : [said]);

/** The magic page of `kind`. */
export function magicPage(kind: KindEntry, input: MagicPageInput): MagicPage {
  const byId = new Map(input.inventory.map((e) => [e.id, e]));
  const maker = kind.maker ? brandById(kind.maker)?.name : undefined;
  const role: string[] = [
    `${kind.word} (${kind.key}): ${kind.purpose}`,
    `Class: ${kind.class}${maker ? `; made by ${maker}` : ''}.`,
    kind.registered ? 'In the kinds’ register.' : 'Not in the kinds’ register.',
  ];

  const copies: string[] = [];
  const partOf: string[] = [];
  const links: string[] = [];
  const workedBy: string[] = [];
  const works: string[] = [];
  const shows: string[] = [];
  for (const c of kind.copies) {
    const who = `${c.tag ?? c.ref} (${c.room || 'no room'})`;
    const entry = c.tag ? byId.get(c.tag) : undefined;
    copies.push(
      `${who}: ${c.name}${entry?.purpose ? `. ${entry.purpose}` : ''}${entry?.normal ? `; normally ${entry.normal}` : ''}.`,
    );
    if (c.parent) {
      const parent = kind.copies.find((p) => p.tag === c.parent);
      const parentName = parent?.name ?? byId.get(c.parent)?.name;
      partOf.push(
        `${who} is part of ${c.parent}${parentName ? ` (${parentName})` : ''}, and is drawn as part of it.`,
      );
    }
    // Prefer the executing simulation graph; the older room-audit network is
    // still useful for callers that do not supply it.
    const graphNodes = input.graph
      ? c.model
        ? resolveRef(c.room, c.model)
            .map((target) => input.graph!.nodes.get(target.page))
            .filter((n) => n !== undefined)
        : [...input.graph.nodes.values()].filter(
            (n) =>
              n.room === c.room &&
              !!c.tag &&
              n.tag?.toLowerCase() === c.tag.toLowerCase(),
          )
      : [];
    for (const node of graphNodes) {
      links.push(`${who} has executing graph node ${node.id} (${node.name}).`);
      for (const edge of input.graph!.edges.filter(
        (e) =>
          e.kind === 'connects' && (e.from === node.id || e.to === node.id),
      )) {
        const far = input.graph!.nodes.get(
          edge.from === node.id ? edge.to : edge.from,
        );
        if (far)
          links.push(
            `${who} connects to ${far.name} (${far.id}) by ${edge.medium ?? 'unspecified medium'}; ${edge.direction === 'both' ? 'bidirectional' : 'modelled forward direction'}.`,
          );
      }
    }
    // Its connections, where it is a node of its room's enhanced network.
    const net = c.room ? input.network(c.room) : undefined;
    const node = net?.nodes.find(
      (n) =>
        n.id === c.tag || n.id === c.ref || (!!c.model && n.id === c.model),
    );
    if (!graphNodes.length && net && node) {
      const present = new Set<string>();
      for (const k of connectionsOf(`node:${node.id}`, net, present))
        links.push(`${who} joins ${k.name} by ${k.link} (${k.medium}).`);
    }
    const row = { ref: c.ref, ...(c.tag ? { tag: c.tag } : {}) };
    for (const k of controlledBy(row, c.room, input.descriptors))
      workedBy.push(
        `${who} is worked by ${k.label} (${k.control}) in ${k.room}${k.local ? ', on its plant room’s own panel' : ''}.`,
      );
    for (const k of controlsOf(row, c.room, input.descriptors))
      works.push(`${who}'s ${k.label} works ${k.targets?.join(', ')}.`);
    const own = input.descriptors.find(
      (d) => d.room === c.room && d.ref.toLowerCase() === c.ref.toLowerCase(),
    );
    for (const r of own?.readings ?? [])
      shows.push(`${who} shows itself by its ${r.form} ${r.label}.`);
  }

  const states: string[] = [];
  for (const d of input.descriptors.filter((x) => x.kind === kind.key))
    for (const p of d.presets) states.push(`${d.ref}: ${p.label}.`);

  return {
    title: `${kind.word}: what it does`,
    sections: [
      { heading: 'Its role', lines: role },
      {
        heading: `Its copies (${kind.copies.length})`,
        lines: none(copies, 'None counted from data.'),
      },
      {
        heading: 'What it is part of',
        lines: none(partOf, 'The model nests it under nothing it names.'),
      },
      {
        heading: 'Its connections',
        lines: none(
          links,
          'No executing graph or room-network connection is recorded for these copies.',
        ),
      },
      {
        heading: 'What works it',
        lines: none(workedBy, 'No described control names it (131).'),
      },
      {
        heading: 'What it works',
        lines: none(works, 'It works nothing a descriptor names.'),
      },
      {
        heading: 'Its states',
        lines: none(states, 'No descriptor gives it presets yet (131).'),
      },
      {
        heading: 'Where it shows itself',
        lines: none(
          shows,
          'No lamp, display or gauge of its own is described (131); a mimic or panel showing it is not yet recorded in the model.',
        ),
      },
    ],
  };
}

/** The page as plain text, for a console or text mode. */
export const magicPageText = (page: MagicPage) =>
  [
    page.title,
    ...page.sections.flatMap((s) => [
      '',
      s.heading,
      ...s.lines.map((l) => `- ${l}`),
    ]),
  ].join('\n');
