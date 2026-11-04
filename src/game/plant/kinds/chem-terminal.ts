import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Operator terminal',
  code: 'OT',
  class: 'plant',
  status: 'none',
  purpose:
    'Reads and sets one chemical line’s transfer: each day tank’s litres and levels, FILL NOW, STOP and RESUME, from the control box.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
