import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Cardboard carton',
  code: 'CC',
  class: 'non-plant',
  status: 'none',
  purpose:
    "The PC's empty carton beside the engineer's desk, a bin that takes what is thrown into it.",
  traits: ['bin-like', 'box-like', 'fixed', 'floor-standing', 'functional'],
  bindings: [
    {
      room: 'engineers_office',
      thing: 'gateway-3000-carton',
    },
  ],
});
