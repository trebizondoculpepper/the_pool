import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Changeover switch',
  code: 'IS',
  class: 'plant',
  status: 'none',
  purpose:
    'Feeds the switchboard from the mains (I), nothing (0) or a generator (II), never both.',
  brand: 'voltara',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
