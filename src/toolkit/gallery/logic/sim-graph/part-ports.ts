/**
 * The declared part-port table (mission 138, plan section 9, example 2):
 * a part the world keeps state for but the schematic does not draw, and
 * how its ports meet its parent node's, each named in the parent's
 * schematic. The schematic's links end at the parent (`node:cabinet`), so
 * the part reaches them only through this table; `part-ports.test.ts`
 * checks each parent port exists and probes the part's driver. Pure.
 */

export interface PartPorts {
  /** The parent node's room and id. */
  room: string;
  parent: string;
  /** The part's kind, in words. */
  kind: string;
  name: string;
  /** Each part port, and the parent port it meets. */
  ports: Readonly<Record<string, string>>;
  /** Which part ports take flow in from the parent; the rest send it out. */
  inbound: readonly string[];
}

/** Keyed by the part's path below its room: `cabinet/pump`. */
export const PART_PORTS: Readonly<Record<string, PartPorts>> = {
  'cabinet/pump': {
    room: 'plant_pool_03',
    parent: 'cabinet',
    kind: 'circulation-pump',
    name: 'Jacuzzi cabinet circulation pump',
    ports: { power: 'power', suction: 'suction', discharge: 'to-filter' },
    inbound: ['power', 'suction'],
  },
};
