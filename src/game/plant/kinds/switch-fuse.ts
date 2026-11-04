import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Switch-fuse',
  code: 'SF',
  class: 'plant',
  status: 'none',
  template: 'power',
  purpose: 'Isolates and fuses the electrical supply to a room.',
  brand: 'voltara',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
