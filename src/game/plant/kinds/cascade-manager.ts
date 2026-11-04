import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Control panel',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose:
    'Sequences the boilers to hold the flow header at its set point, with the PLANT ENABLE key switch.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
