import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Distribution board',
  code: 'DB',
  class: 'plant',
  status: 'none',
  purpose: 'Distributes power to final circuits.',
  brand: 'voltara',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
