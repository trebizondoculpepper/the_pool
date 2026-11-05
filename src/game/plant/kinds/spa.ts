import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Jacuzzi tub',
  code: 'JT',
  class: 'plant',
  status: 'none',
  purpose: 'Contains the hot spa water and its seat, jets and drains.',
  traits: ['cylindrical', 'fixed', 'floor-standing', 'water-body'],
  brand: 'lidoluxe',
  bindings: [
    {
      room: 'pool_03',
      thing: 'jacuzzi-tub',
    },
  ],
});
