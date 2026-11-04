import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Scenario simulator',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Runs the plant scenario simulation.',
  traits: ['box-like', 'control-panel-like', 'floor-standing'],
});
