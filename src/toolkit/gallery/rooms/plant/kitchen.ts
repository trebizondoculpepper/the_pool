import type { PlantExhibit } from './exhibit';
import type { ExhibitSize } from '../../logic/plant-room-layout';
import { layoutPlantRoom } from '../../logic/plant-room-layout';
import {
  PIZZA_OVEN_NAME,
  PIZZA_OVEN_SIZE,
  createPizzaOven,
} from '../../../components/kitchen/views/pizza-oven';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Kitchen things, modelled before the leisure centre has a kitchen';

/**
 * Dev70, the kitchen (the owner, 2026-11-02: "a new devroom, for kitchen
 * things. First and only item: A Moretti Forni pizza oven. Twin deck stood
 * on a heat cupboard on 4 lockable wheels"): the Mozzetti Forni Ravello D,
 * after the Moretti Forni serieP Amalfi D with two decks on its prover, as
 * a reference model (`doc/research/pizza-oven.md`); not yet worked.
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: PIZZA_OVEN_NAME,
    reference:
      'After the Moretti Forni serieP Amalfi D, two 18 cm decks on the 800 mm prover, on four locking castors: 1520 × 1365 × 1850 mm',
    maker: 'mozzetti',
    size: { ...PIZZA_OVEN_SIZE, mount: 'floor' },
    build(kit) {
      return createPizzaOven(kit).group;
    },
  },
];

/** The oven out in the floor, clear of every wall, so it can be walked round. */
export function layoutRoom(sizes: readonly ExhibitSize[]) {
  const layout = layoutPlantRoom(sizes);
  const [size] = sizes;
  const place = { x: 0, z: -0.5, y: 0, yaw: 0 };
  return {
    ...layout,
    places: [place],
    solids: [
      {
        minX: place.x - size.w / 2,
        maxX: place.x + size.w / 2,
        minZ: place.z - size.d / 2,
        maxZ: place.z + size.d / 2,
      },
    ],
  };
}
