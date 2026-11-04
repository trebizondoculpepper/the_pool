import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Main switch',
  code: 'IS',
  class: 'plant',
  status: 'none',
  purpose: 'Isolates the incoming electrical supply.',
  brand: 'voltara',
  traits: ['box-like', 'control-panel-like', 'floor-standing'],
});
