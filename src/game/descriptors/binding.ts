/**
 * What a 3D control needs from its descriptor (mission 131): a store's
 * world and dispatch, and the control, made into the press, set or open
 * the view's part calls, so the view sends the descriptor's action and no
 * other. Pure: the store is any `{ world: { value }, dispatch }`.
 */
import type { World, WorldAction } from '../world';
import type { Control } from './descriptor';

export interface DescriptorStore {
  world: { value: World };
  dispatch(action: WorldAction): unknown;
}

/** Send what `input` on `control` asks, if anything. */
export function workControl(
  store: DescriptorStore | null | undefined,
  control: Control,
  input: string,
): void {
  if (!store) return;
  const action = control.action?.(store.world.value, input) ?? null;
  if (action) store.dispatch(action);
}

/** A two-way control (a valve's handle, an isolator) as a view's `{ open, set }` binding. */
export function twoWayBinding(
  store: DescriptorStore,
  control: Control,
  [yes, no]: readonly [string, string] = ['open', 'shut'],
) {
  return {
    open: () => control.position?.(store.world.value) === yes,
    set: (on: boolean) => workControl(store, control, on ? yes : no),
  };
}
