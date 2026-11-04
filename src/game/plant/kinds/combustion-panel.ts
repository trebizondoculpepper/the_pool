import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Control panel',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Indicates combustion and ventilation status.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
