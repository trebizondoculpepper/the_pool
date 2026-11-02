import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../../../../game/world';
import { plantEquipmentFacts } from '../../../../game/diagnostics/plant-context';
import { plantConnectionsFor } from '../../../../game/diagnostics/plant-connections';
import { MODEL_VALVES } from '../../../../game/plant/model-valves';
import { JACUZZI_SCHEMATIC } from '../../../../game/plant/jacuzzi-schematic';
import { auditNetwork, connectionsOf } from '../room-audit';
import { OLYMPIC_ANNEX } from '../olympic-annex';
import {
  neighbours,
  nodeId,
  parseNodeId,
  resolveRef,
  roomNet,
  runsOf,
  segmentNeighbours,
  segmentsOf,
} from './graph';
import { simGraph } from './index';

const J = 'plant_pool_03';

describe('the simulation graph', () => {
  it('round-trips ids', () => {
    for (const id of [
      'plant_pool_03/part:cabinet/pump',
      'switch_room/node:incoming',
      'world/state:controlRoomMode',
      'plant_pool_03/fitting:jacuzzi.drain',
    ]) {
      const p = parseNodeId(id)!;
      expect(nodeId(p.room, p.sort, p.id)).toBe(id);
    }
    expect(parseNodeId('node:cabinet')).toBeUndefined();
  });

  it('resolves node, active fitting and link refs', () => {
    expect(resolveRef(J, 'node:cabinet').map((t) => t.page)).toEqual([
      `${J}/node:cabinet`,
    ]);
    expect(resolveRef(J, 'fitting:jacuzzi.drain')[0].page).toBe(
      `${J}/fitting:jacuzzi.drain`,
    );
    // Drain to waste: split by its active valve, a run each side.
    const drain = resolveRef(J, 'link:Drain to waste');
    expect(drain.map((t) => [t.page, t.anchor])).toEqual([
      [`${J}/node:cabinet`, `run-run:${J}/Drain to waste/0`],
      [`${J}/fitting:jacuzzi.drain`, `run-run:${J}/Drain to waste/1`],
    ]);
    // A link with no active fitting: one run.
    expect(resolveRef(J, 'link:Readings to the mimic')).toHaveLength(1);
  });

  it('a passive piece resolves to its runs (the pit-waste branch)', () => {
    const t = resolveRef(J, 'node:pit-waste');
    expect(t.length).toBeGreaterThan(0);
    for (const x of t) expect(x.anchor).toMatch(/^run-run:/);
  });

  it('expands each run back into its segment sequence, no active node inside', () => {
    const net = roomNet(J)!;
    const segs = segmentsOf(net);
    for (const r of runsOf(J)) {
      for (const l of r.links)
        expect(
          net.links.find((x) => x.id === l)!.medium === 'control'
            ? 'signal'
            : net.links.find((x) => x.id === l)!.medium,
        ).toBe(r.medium);
      const inner = r.pieces.filter((p) => !p.startsWith('link:'));
      for (const p of inner) {
        const id = p.slice(p.indexOf(':') + 1);
        expect(simGraph().nodes.get(`${J}/${p}`)?.tier ?? id).toBe('connector');
      }
      // Its first segment leaves its upstream end on its first link.
      expect(
        segs.some((s) => s.a === r.from.ref && s.link.id === r.links[0]),
      ).toBe(true);
    }
  });

  it('matches 129’s connections for every node and fitting of the Jacuzzi room', () => {
    const net = auditNetwork(J)!;
    const refs = [
      ...net.nodes.map((n) => `node:${n.id}`),
      ...[...net.along.values()].flat().map((f) => `fitting:${f}`),
    ];
    const present = new Set(refs);
    const proj = (c: { link: string; neighbour: string; name: string }) =>
      `${c.link}|${c.neighbour}|${c.name}`;
    for (const ref of refs)
      expect(segmentNeighbours(J, ref).map(proj).sort()).toEqual(
        connectionsOf(ref, net, present).map(proj).sort(),
      );
  });

  it('matches 134’s connections for a Jacuzzi and an Olympic machine', () => {
    const facts = plantEquipmentFacts(newWorld());
    const cab = [JACUZZI_SCHEMATIC.code, 'CAB1'].join('-');
    const pump = ['P', '101A'].join('-');
    for (const [ref, room, node] of [
      [cab, J, 'cabinet'],
      [pump, 'plant_pool_02', 'pumps'],
    ] as const) {
      const fact = facts.find((f) => f.ref === ref)!;
      expect(fact).toBeDefined();
      const theirs = plantConnectionsFor(fact, facts);
      const net = roomNet(room)!;
      // 134 reads the Olympic schematic without the annex the room lays besides it.
      const annex = new Set(OLYMPIC_ANNEX.links.map((l) => l.id));
      const mine = net.links.filter(
        (l) => !annex.has(l.id) && (l.sourceId === node || l.targetId === node),
      );
      const proj = (l: {
        link: string;
        medium: string;
        from: string;
        fp: string;
        to: string;
        tp: string;
      }) => `${l.link}|${l.medium}|${l.from}|${l.fp}|${l.to}|${l.tp}`;
      const name = (id: string) => net.nodes.get(id)?.name ?? id;
      expect(
        mine
          .map((l) =>
            proj({
              link: l.id,
              medium: l.medium,
              from: name(l.sourceId),
              fp: l.sourcePort,
              to: name(l.targetId),
              tp: l.targetPort,
            }),
          )
          .sort(),
      ).toEqual(
        theirs
          .filter((c) =>
            net.links.some(
              (l) =>
                l.id === c.link && (l.sourceId === node || l.targetId === node),
            ),
          )
          .map((c) =>
            proj({
              link: c.link,
              medium: c.medium,
              from: c.from.name,
              fp: c.from.port,
              to: c.to.name,
              tp: c.to.port,
            }),
          )
          .sort(),
      );
      // The modelled valves on each link: the graph's fittings with those tags.
      for (const l of mine) {
        const tags = MODEL_VALVES.filter(
          (v) => v.room === room && v.link === l.id,
        )
          .map((v) => v.tag)
          .sort();
        const onLink = (net.along.get(l.id) ?? [])
          .map((f) => simGraph().nodes.get(`${room}/fitting:${f}`)?.tag)
          .filter((t): t is string => !!t && tags.includes(t))
          .sort();
        expect(onLink).toEqual(tags);
      }
    }
  });

  it('gives every edge its kind, direction and provenance', () => {
    for (const e of simGraph().edges) {
      expect(e.kind).toBeTruthy();
      expect(e.direction).toBeTruthy();
      expect(e.via).toBeTruthy();
    }
  });

  it('carries the mains-fail raises edge and the Jacuzzi feeds edge with null ports', () => {
    const g = simGraph();
    const raises = g.edges.find(
      (e) => e.kind === 'raises' && e.to === 'control_room/alarm:mains-fail',
    )!;
    expect([
      raises.from,
      raises.fromPort,
      raises.toPort,
      raises.medium,
    ]).toEqual(['switch_room/node:incoming', null, null, null]);
    const feeds = g.edges.find(
      (e) => e.kind === 'feeds' && e.to === `${J}/node:switch-fuse`,
    )!;
    expect([feeds.from, feeds.fromPort, feeds.toPort]).toEqual([
      'switch_room/part:rooms/plant_pool_03',
      null,
      'in',
    ]);
  });

  it('lists only direct neighbours', () => {
    const down = neighbours(simGraph(), 'switch_room/node:incoming', 'down');
    expect(down.map((n) => n.node)).toContain('switch_room/node:main-switch');
    expect(down.map((n) => n.node)).toContain('control_room/alarm:mains-fail');
    expect(down.map((n) => n.node)).not.toContain(
      'switch_room/node:switchboard',
    );
  });
});
