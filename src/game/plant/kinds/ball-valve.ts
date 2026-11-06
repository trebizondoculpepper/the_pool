import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Ball valve',
  code: 'IV',
  class: 'plant',
  status: 'none',
  purpose:
    'Isolates or admits flow in a small-bore pipe: a quarter-turn lever ball valve.',
  traits: ['cylindrical', 'valve-like'],
  template: 'valve',
});
