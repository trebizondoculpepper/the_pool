import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Generator connection',
  code: 'FX',
  class: 'plant',
  status: 'none',
  purpose: 'Accepts a temporary generator connection.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
