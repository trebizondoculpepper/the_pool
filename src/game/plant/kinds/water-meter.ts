import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Water meter',
  code: 'G',
  class: 'plant',
  status: 'none',
  purpose: 'Measures incoming make-up water volume.',
  traits: ['cylindrical', 'in-line', 'instrument-like'],
});
