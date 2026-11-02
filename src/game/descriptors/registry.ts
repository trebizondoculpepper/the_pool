/**
 * The descriptors' registry (mission 131): every object described so far,
 * by room, and lookups by ref and by control id. First delivery: the
 * Jacuzzi plant room and the control room's spec-driven mimic boards.
 * Pure.
 */
import type { Control, ObjectDescriptor } from './descriptor';
import { jacuzziRoomDescriptors } from './jacuzzi-room';
import { controlRoomMimicDescriptors } from './mimics';

/** The rooms whose objects are described, and their descriptors. */
export const DESCRIBED_ROOMS: Readonly<
  Record<string, () => readonly ObjectDescriptor[]>
> = {
  plant_pool_03: jacuzziRoomDescriptors,
  control_room: controlRoomMimicDescriptors,
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Every descriptor, or a room's. */
export function objectDescriptors(room?: string): readonly ObjectDescriptor[] {
  if (room) return DESCRIBED_ROOMS[room]?.() ?? [];
  return Object.values(DESCRIBED_ROOMS).flatMap((f) => f());
}

/** An object's descriptor by its ref (case ignored), within a room if given. */
export function descriptorFor(
  ref: string,
  room?: string,
): ObjectDescriptor | undefined {
  return objectDescriptors(room).find((d) => same(d.ref, ref));
}

/** A control by its id, `PL3-CAB1/power`; the object's ref is everything before the last slash. */
export function controlFor(id: string, room?: string): Control | undefined {
  for (const d of objectDescriptors(room)) {
    if (!id.toLowerCase().startsWith(`${d.ref.toLowerCase()}/`)) continue;
    const key = id.slice(d.ref.length + 1);
    const found = d.controls.find((c) => same(c.key, key));
    if (found) return found;
  }
  return undefined;
}

/** An object's one control, where it has exactly one (a valve's handle, an isolator's). */
export function soleControl(ref: string, room?: string): Control | undefined {
  const controls = descriptorFor(ref, room)?.controls ?? [];
  return controls.length === 1 ? controls[0] : undefined;
}

/** A kind's controls as its descriptors give them: key, label and inputs, once each. */
export function kindControls(
  kind: string,
): readonly Pick<Control, 'key' | 'label' | 'inputs' | 'form'>[] {
  const seen = new Map<
    string,
    Pick<Control, 'key' | 'label' | 'inputs' | 'form'>
  >();
  for (const d of objectDescriptors())
    if (d.kind === kind)
      for (const c of d.controls)
        if (!seen.has(c.key))
          seen.set(c.key, {
            key: c.key,
            label: c.label,
            inputs: c.inputs,
            form: c.form,
          });
  return [...seen.values()];
}
