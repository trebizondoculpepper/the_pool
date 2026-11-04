import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Gas ball valve',
  code: 'IV',
  class: 'plant',
  status: 'none',
  template: 'valve',
  purpose: 'Isolates gas to a boiler.',
  traits: ['cylindrical', 'valve-like'],
});
