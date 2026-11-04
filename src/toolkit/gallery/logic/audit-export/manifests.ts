import { SOFTWARE_TITLES } from '../../../components/site-dressing/logic/software-boxes';

/**
 * Transitional audit manifests (mission 167): facts about a room's
 * behaving objects that the catalogue, the descriptors and the registry
 * cannot yet express, each with a pointer to the source that shows the
 * behaviour. Not a second catalogue: a record of gaps, cross-joined with
 * the catalogue and flagged where it does not match. Entries are derived
 * from source data where they can be (the software boxes from
 * `SOFTWARE_TITLES`), never copied out by hand. Pure.
 */

/** A capability the audit tracks per room. */
export type Capability = 'interaction' | 'seats' | 'portable' | 'solidity';

export const CAPABILITIES: readonly Capability[] = [
  'interaction',
  'seats',
  'portable',
  'solidity',
];

export interface ManifestEntry {
  /** A stable ref within the room. */
  ref: string;
  title: string;
  /** The assembly or kind it belongs to, as the catalogue would name it, if known. */
  owner?: string;
  /** The capabilities its behaviour shows. */
  shows: readonly Capability[];
  /** What the source shows it doing, in a few words. */
  behaviour: string;
  /** Where in the source the behaviour lives, `path:line` or `path`. */
  source: string;
}

export interface RoomManifest {
  room: string;
  entries: readonly ManifestEntry[];
}

const SOFTWARE_BOX_SOURCE =
  'src/toolkit/components/site-dressing/logic/software-boxes.ts (SOFTWARE_TITLES); pick-up and return at src/toolkit/gallery/rooms/shell-room.ts:745';

/** The rooms' manifests, by room id. */
export const AUDIT_MANIFESTS: Readonly<Record<string, () => RoomManifest>> = {
  engineers_office: () => ({
    room: 'engineers_office',
    entries: SOFTWARE_TITLES.map((title) => ({
      ref: `software-box:${title.id}`,
      title: `${title.title} software box`,
      owner: 'desk',
      shows: ['portable'],
      behaviour:
        'picked up from the desk and put back, or into the carton aimed at',
      source: SOFTWARE_BOX_SOURCE,
    })),
  }),
};

/** A room's manifest, or an empty one. */
export const manifestOf = (room: string): RoomManifest =>
  AUDIT_MANIFESTS[room]?.() ?? { room, entries: [] };
