import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Gas safety panel',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Detects gas and shuts down unsafe gas supply.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
