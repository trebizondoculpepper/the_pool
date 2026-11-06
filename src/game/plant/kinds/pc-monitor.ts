import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Monitor',
  code: 'MON',
  class: 'non-plant',
  status: 'none',
  purpose: "The PC's CRT monitor: shows what the computer is doing.",
  traits: ['box-like', 'fixed', 'floor-standing', 'readable', 'supportable'],
  bindings: [
    {
      room: 'engineers_office',
      thing: 'monitor',
    },
  ],
});
