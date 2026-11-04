import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Isolator bank',
  code: 'IS',
  class: 'plant',
  status: 'none',
  purpose: 'Locally isolates plant electrical circuits.',
  brand: 'voltara',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
