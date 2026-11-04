import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Switch',
  code: 'SW',
  class: 'plant',
  status: 'switch',
  purpose: 'Starts or stops a packaged set when its isolator is on.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
