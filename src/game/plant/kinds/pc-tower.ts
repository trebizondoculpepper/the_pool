import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Computer',
  code: 'PC',
  class: 'non-plant',
  status: 'none',
  purpose: "The engineer's late-1990s PC: boots DOS when its power is pressed.",
  traits: [
    'box-like',
    'fixed',
    'floor-standing',
    'functional',
    'operable',
    'supportable',
  ],
  bindings: [
    {
      room: 'engineers_office',
      thing: 'tower',
    },
  ],
});
