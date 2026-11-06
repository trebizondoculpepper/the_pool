import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Modulating control valve',
  code: 'CV',
  class: 'plant',
  status: 'none',
  purpose:
    'Regulates the flow in its pipe run, positioned by its controller to hold a set point.',
  traits: ['cylindrical', 'modulating', 'valve-like'],
  template: 'valve',
});
