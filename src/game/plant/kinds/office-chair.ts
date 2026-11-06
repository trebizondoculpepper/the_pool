import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Office chair',
  code: 'OC',
  class: 'non-plant',
  status: 'none',
  purpose: 'Provides a seat at the engineer’s desk.',
  traits: ['box-like', 'fixed', 'floor-standing', 'sittable'],
  bindings: [
    {
      room: 'engineers_office',
      thing: 'desk-chair',
    },
  ],
});
