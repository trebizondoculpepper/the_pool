import { registerPage } from './page-registry';
import type { RegisteredRow } from './page-registry';

/** Add mission 138's node and architectural pages to the bench index. */
registerPage({
  id: 'sim-graph',
  name: 'Every simulation node',
  branch: 'simulation',
  subject: 'none',
  link: () => 'bench.html?bench=sim-graph',
  rows: async (): Promise<RegisteredRow[]> => {
    const [graph, page, catalogue, classes] = await Promise.all([
      import('./sim-graph/index'),
      import('./sim-graph/node-page'),
      import('./look-catalogue'),
      import('./object-class'),
    ]);
    const nodesByRoom = new Map<string, RegisteredRow[]>();
    for (const x of page.simList(graph.simGraph())) {
      const n = x.node;
      const rows = nodesByRoom.get(n.room) ?? [];
      rows.push({
        id: n.id.replaceAll('/', '~'),
        label: n.name,
        href: page.nodeLink(n.id),
        meta: [n.tag, n.kind, n.tier, ...x.media].filter(Boolean).join(' · '),
        fields: [n.id, n.room, n.kind, n.tag ?? '', ...x.media],
      });
      nodesByRoom.set(n.room, rows);
    }
    const nodeRooms = [...nodesByRoom]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([room, children]) => ({
        id: `room:${room}`,
        label: room,
        children,
      }));

    const objectsByRoom = new Map<string, RegisteredRow[]>();
    for (const e of catalogue.lookCatalogue()) {
      if (classes.objectClass(e.kind) !== 'architectural') continue;
      const rows = objectsByRoom.get(e.room) ?? [];
      rows.push({
        id: e.ref.replaceAll('/', '~'),
        label: e.title,
        href: `bench.html?bench=sim-object&room=${encodeURIComponent(e.room)}&ref=${encodeURIComponent(e.ref)}`,
        meta: e.ref,
        fields: [e.room, e.ref, e.title, e.kind],
      });
      objectsByRoom.set(e.room, rows);
    }
    const objectRooms = [...objectsByRoom]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([room, children]) => ({
        id: `room:${room}`,
        label: room,
        children,
      }));
    return [
      ...nodeRooms,
      {
        id: 'architectural',
        label: 'Architectural objects (not simulated)',
        href: 'bench.html?bench=sim-graph',
        children: objectRooms,
      },
    ];
  },
});
