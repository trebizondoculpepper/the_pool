import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Flowmeter',
  code: 'FT',
  class: 'plant',
  status: 'none',
  purpose: 'Measures the flow in its pipe.',
  traits: ['cylindrical', 'in-line', 'instrument-like'],
});
