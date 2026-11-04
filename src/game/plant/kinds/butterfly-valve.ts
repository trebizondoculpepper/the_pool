import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Butterfly valve',
  code: 'IV',
  class: 'plant',
  status: 'none',
  template: 'valve',
  purpose: 'Isolates or admits flow in its pipe run.',
  traits: ['cylindrical', 'valve-like'],
});
