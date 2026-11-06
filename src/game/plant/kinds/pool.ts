import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Pool basin',
  code: 'PB',
  class: 'plant',
  status: 'none',
  purpose: 'Contains the circulating pool water that the player can enter.',
  traits: ['fixed', 'functional', 'water-body'],
  bindings: [
    {
      room: 'pool_01',
      thing: 'lounge-pool',
    },
    {
      room: 'pool_02',
      thing: 'olympic-pool',
    },
  ],
});
