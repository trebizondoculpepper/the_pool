import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { Part } from '../../components/core/parts/parts';
import { createPipe } from '../../components/core/views/pipe-kinds';
import { markComponent } from '../../components/core/views/component-identity';
import {
  createInlineFitting,
  placeFitting,
} from '../../components/plant/views/inline-fittings';
import { createRemoteMagConverter } from '../../components/plant/views/mag-flowmeter';
import { roomWorld } from '../../save/world-store';
import { corridorWaterRuns } from '../logic/corridor-water-runs';
import { CORRIDOR_DOORS } from '../logic/main-corridor';

/** The eight Kessler-Moody transmitters and the pipes they measure, bound
 * to the corridor's cross-room water network. The spa waste and Olympic
 * tank drain travel below the floor, continuously downhill. */
export function createCorridorWaterBranches(kit: PanelKit) {
  const group = new Group();
  group.name = 'modelled cross-room water branches';
  const parts: Part[] = [];
  const world = typeof window === 'undefined' ? null : roomWorld();
  const { runs, transmitters } = corridorWaterRuns();
  for (const run of runs) {
    const pipe = createPipe(run.kind, run.od, run.points);
    pipe.name = run.link ?? 'Boosted make-up ring';
    group.add(
      markComponent(pipe, {
        name: pipe.name,
        model: run.link ? { link: run.link } : { node: run.node! },
      }),
    );
  }
  for (const t of transmitters) {
    const indicated = () =>
      world?.world.value.wetHall.branches[t.pool][t.side].indicated ?? 0;
    const part = createInlineFitting(kit, {
      kind: 'flowmeter',
      medium: 'water',
      operator: 'none',
      od: t.od,
      tag: t.tag,
      role: t.side === 'fresh' ? 'MAKE-UP' : 'PIT WASTE',
      flow: indicated,
    });
    placeFitting(part.object, 'flowmeter', t.at, t.along, [0, 1]);
    group.add(
      markComponent(part.object, {
        name: `${t.tag} ${t.side} branch flow transmitter`,
        tag: t.tag,
        model: { node: t.id },
      }),
    );
    if (t.side === 'dirty') {
      const room = `plant_${t.pool}`;
      const door = CORRIDOR_DOORS.find((d) => d.to === room)!;
      const along = door.at - 2;
      const at: [number, number, number] =
        door.wall === 'north'
          ? [along, 1.45, 0.08]
          : door.wall === 'south'
            ? [along, 1.45, 27.92]
            : [0.08, 1.45, along];
      const converter = createRemoteMagConverter(kit, t.tag);
      converter.group.position.set(...at);
      converter.group.rotation.y =
        door.wall === 'south'
          ? Math.PI
          : door.wall === 'west'
            ? Math.PI / 2
            : 0;
      group.add(
        markComponent(converter.group, {
          name: `${t.tag} wall converter`,
          tag: t.tag,
          model: { node: t.id },
        }),
      );
      const cable = createPipe('steel-screwed', 0.012, [
        [at[0], at[1] - 0.1, at[2]],
        [at[0], -0.1, at[2]],
        t.at,
      ]);
      cable.name = `${t.tag} signal conduit`;
      group.add(
        markComponent(cable, { name: cable.name, model: { node: t.id } }),
      );
      const update = part.update.bind(part);
      part.update = (delta) => {
        update(delta);
        converter.show(indicated());
      };
    }
    parts.push(part);
  }
  return { group, parts };
}
