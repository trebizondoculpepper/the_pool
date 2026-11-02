import { equipmentCatalogue } from '../plant/equipment-catalogue';
import { INSTALLED_VALVES } from '../plant/installed-valves';
import { MODEL_VALVES } from '../plant/model-valves';
import type { PlumbEdge } from '../plant/plumbing-expansion';
import { SCHEMATICS } from '../plant/schematics';
import { olympicPlumbing } from '../../toolkit/gallery/logic/olympic-plumbing';
import type { PlantEquipmentFact } from './plant-context';

/** A base schematic link, with its named ends and modelled valves. */
export interface PlantConnectionFact {
  link: string;
  medium: string;
  from: { name: string; port: string; refs: string[] };
  to: { name: string; port: string; refs: string[] };
  valves: { ref: string; status: string | null }[];
}

interface NetworkNode {
  id: string;
  name: string;
  code?: string;
}

interface Network {
  room: string;
  code: string;
  nodes: readonly NetworkNode[];
  edges: readonly PlumbEdge[];
  runNames?: ReadonlyMap<string, readonly string[]>;
}

let networks: Network[] | undefined;
const allNetworks = (): Network[] => {
  if (networks) return networks;
  const olympic = olympicPlumbing();
  const labels = new Map(olympic.items.map((item) => [item.key, item.label]));
  const olympicRuns = new Map<string, string[]>();
  for (const run of olympic.runs) {
    const names = olympicRuns.get(run.line) ?? [];
    names.push(run.name);
    olympicRuns.set(run.line, names);
  }
  networks = [
    ...Object.values(SCHEMATICS).map((schematic) => ({
      room: schematic.room,
      code: schematic.code,
      nodes: schematic.nodes,
      edges: schematic.links,
    })),
    {
      room: 'plant_pool_02',
      code: 'PL2',
      nodes: olympic.schematic.nodes.map((node) => ({
        id: node.id,
        name: labels.get(node.id) ?? node.id,
      })),
      edges: olympic.schematic.edges,
      runNames: olympicRuns,
    },
  ];
  return networks;
};

const placedKeyByAsset = new Map(
  equipmentCatalogue().map((item) => [
    item.assetId,
    { room: item.room, key: item.key.split(':')[0] },
  ]),
);
const installedByRun = Object.entries(INSTALLED_VALVES).map(([key, valve]) => {
  const [room, run] = key.split('|');
  return { room, run, assetId: valve.assetId, tag: valve.tag };
});
const normalise = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

function refsAtNode(
  network: Network,
  node: NetworkNode,
  facts: readonly PlantEquipmentFact[],
): string[] {
  const name = normalise(node.name);
  return facts
    .filter((fact) => {
      if (fact.room !== network.room) return false;
      if (normalise(fact.name) === name) return true;
      if (node.code && fact.ref === `${network.code}-${node.code}`) return true;
      const placed = fact.assetId ? placedKeyByAsset.get(fact.assetId) : null;
      if (placed?.room === network.room && placed.key === node.id) return true;
      // The Olympic schematic has one pump-set node, while the motor model has two starters.
      return (
        network.room === 'plant_pool_02' &&
        node.id === 'pumps' &&
        (fact.ref === 'P-101A' || fact.ref === 'P-101B')
      );
    })
    .map((fact) => fact.ref);
}

/** The links that meet an installed machine, as drawn from its room's schematic. */
export function plantConnectionsFor(
  fact: PlantEquipmentFact,
  facts: readonly PlantEquipmentFact[],
): PlantConnectionFact[] {
  const result: PlantConnectionFact[] = [];
  for (const network of allNetworks()) {
    if (fact.room !== network.room) continue;
    const nodes = new Map(network.nodes.map((node) => [node.id, node]));
    const at = new Map(
      network.nodes.map((node) => [node.id, refsAtNode(network, node, facts)]),
    );
    for (const edge of network.edges) {
      const fromRefs = at.get(edge.sourceId) ?? [];
      const toRefs = at.get(edge.targetId) ?? [];
      const onLink = MODEL_VALVES.filter(
        (valve) => valve.room === network.room && valve.link === edge.id,
      );
      const runNames = new Set([
        edge.id,
        ...(network.runNames?.get(edge.id) ?? []),
      ]);
      const installed = installedByRun.filter(
        (valve) => valve.room === network.room && runNames.has(valve.run),
      );
      const isValveHere =
        onLink.some(
          (valve) =>
            valve.tag === fact.ref ||
            valve.id === fact.ref ||
            valve.id === fact.assetId,
        ) ||
        installed.some(
          (valve) => valve.tag === fact.ref || valve.assetId === fact.assetId,
        );
      if (
        !fromRefs.includes(fact.ref) &&
        !toRefs.includes(fact.ref) &&
        !isValveHere
      )
        continue;
      const valves = onLink.map((valve) => {
        const state = facts.find(
          (item) =>
            item.ref === valve.tag ||
            item.assetId === valve.id ||
            item.ref === valve.id,
        );
        return {
          ref: state?.ref ?? (valve.tag || valve.id),
          status: state?.status ?? null,
        };
      });
      for (const valve of installed) {
        if (valves.some((item) => item.ref === valve.tag)) continue;
        const state = facts.find(
          (item) => item.assetId === valve.assetId || item.ref === valve.tag,
        );
        valves.push({ ref: valve.tag, status: state?.status ?? null });
      }
      result.push({
        link: edge.id,
        medium: edge.medium,
        from: {
          name: nodes.get(edge.sourceId)?.name ?? edge.sourceId,
          port: edge.sourcePort,
          refs: fromRefs,
        },
        to: {
          name: nodes.get(edge.targetId)?.name ?? edge.targetId,
          port: edge.targetPort,
          refs: toRefs,
        },
        valves,
      });
    }
  }
  return result;
}
