import { expect, it } from 'vite-plus/test';
import {
  EQUIPMENT_KINDS,
  kindAffordances,
  resolveKindAffordances,
} from './equipment-kinds';
import type { EquipmentKind, KindId } from './equipment-kinds';

it('resolves explicit affordance defaults for every registered kind', () => {
  for (const id of Object.keys(EQUIPMENT_KINDS) as KindId[]) {
    const kind: EquipmentKind = EQUIPMENT_KINDS[id];
    const a = kindAffordances(id);
    expect(a.interaction, id).toBe(
      kind.affordances?.interaction ??
        (kind.class === 'decorative' ? 'decorative' : 'inspect-only'),
    );
    expect(a.portable, id).toBe(kind.affordances?.portable ?? false);
    expect(a.solid, id).toBe(kind.affordances?.solid ?? true);
    expect(a.shape, id).toEqual(kind.affordances?.shape ?? { type: 'bounds' });
    expect(a.surface, id).toBe(a.solid);
    expect(a.seat, id).toEqual(kind.affordances?.seat ?? null);
  }
});

it('resolves proposed departures without coupling interaction to plant status', () => {
  const example: EquipmentKind = {
    code: 'X',
    class: 'non-plant',
    type: 'Trial chair',
    status: 'none',
    purpose: 'Tests the declaration.',
    affordances: {
      interaction: 'usable',
      portable: true,
      solid: false,
      shape: { type: 'box', width: 0.5, height: 0.8, depth: 0.5 },
      seat: { height: 0.45, lookDirection: { x: 0, z: 1 } },
    },
  };
  expect(resolveKindAffordances(example)).toEqual({
    interaction: 'usable',
    portable: true,
    solid: false,
    shape: { type: 'box', width: 0.5, height: 0.8, depth: 0.5 },
    surface: false,
    seat: { height: 0.45, lookDirection: { x: 0, z: 1 } },
  });
});
