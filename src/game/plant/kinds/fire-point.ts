import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Fire point',
  code: 'FX',
  class: 'decorative',
  status: 'none',
  purpose:
    'Holds portable extinguishers and the fire action notice, the floor before them kept clear.',
  traits: ['box-like', 'decorative', 'fixed', 'wall-mounted'],
});
