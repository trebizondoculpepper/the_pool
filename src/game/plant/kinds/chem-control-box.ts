import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Control panel',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose:
    'Runs both chemical lines’ transfer in AUTO: calls each day tank at its own levels and tells each selector which outlet to open.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
