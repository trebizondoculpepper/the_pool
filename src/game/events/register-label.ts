import { INSTALLED_ASSET_IDS } from '../plant/installed-asset-ids';

/**
 * A machine's tag and name as the register has them (`installed-asset-ids.ts`,
 * keyed `room|kind|name`): the first entry whose key matches `match`, so
 * the log's lines name things from the model, never by hand. Pure.
 */
export interface RegisterLabel {
  tag: string;
  name: string;
}

export function registerLabel(
  match: (room: string, kind: string) => boolean,
): RegisterLabel | undefined {
  for (const [key, v] of Object.entries(INSTALLED_ASSET_IDS)) {
    const [room = '', kind = '', name = v.tag] = key.split('|');
    if (match(room, kind)) return { tag: v.tag, name };
  }
  return undefined;
}

/** A name's first clause: 'Make-up booster set, duty and standby' is the booster set. */
export const shortName = (name: string) => name.split(',')[0]!.trim();
