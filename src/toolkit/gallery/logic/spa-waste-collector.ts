import { cabinetPipes } from './cabinet-pipes';
import { layoutRoom } from './room-equipment';
import type { Vec3 } from './cabinet-pipes';

export interface SpaWasteCollectorRun {
  link: string;
  points: Vec3[];
  od: number;
}

/** The buried collector after the spas' visible tundishes. The inlet
 * segments retain their existing model links; the outlet is its own link
 * from each room's pit-waste node to its corridor boundary. */
export function spaWasteCollector(room: string): SpaWasteCollectorRun[] {
  if (room !== 'plant_pool_03' && room !== 'plant_pool_04') return [];
  const layout = layoutRoom(room);
  if (!layout) return [];
  const h = layout.box.d / 2;
  const collector: Vec3 = [0, -0.32, h - 0.35];
  const visible = cabinetPipes(room);
  const inletNames = [
    'Drain to waste',
    'Filter wash to waste',
    ...(room === 'plant_pool_03' ? ['Balance tank drain to waste'] : []),
  ];
  const inlets = inletNames.map((link) => {
    const mouth = visible.find((run) => run.name === link)?.points.at(-1);
    if (!mouth) throw new Error(`missing ${room} ${link} tundish`);
    return {
      link,
      od: 0.05,
      points: [
        [mouth[0], -0.1, mouth[2]],
        [mouth[0], -0.2, mouth[2]],
        collector,
      ] as Vec3[],
    };
  });
  return [
    ...inlets,
    {
      link: 'Collected pit waste to corridor',
      od: 0.075,
      points: [collector, [collector[0], -0.4, h + 0.2]] as Vec3[],
    },
  ];
}
