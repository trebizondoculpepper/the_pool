import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Electromagnetic flowmeter',
  code: 'FT',
  class: 'plant',
  status: 'none',
  purpose:
    'Measures the make-up water sent to the pools, for the plant’s own controls and records.',
  traits: ['cylindrical', 'in-line', 'instrument-like'],
});
