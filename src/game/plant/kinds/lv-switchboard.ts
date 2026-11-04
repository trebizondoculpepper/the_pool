import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Switchboard',
  code: 'DB',
  class: 'plant',
  status: 'none',
  purpose: 'Distributes the incoming low-voltage supply.',
  brand: 'voltara',
  traits: ['box-like', 'control-panel-like', 'floor-standing'],
});
