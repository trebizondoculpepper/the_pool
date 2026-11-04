import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Temperature sensor',
  code: 'TE',
  class: 'plant',
  status: 'none',
  purpose:
    'Measures returning pool-water temperature before the heat exchanger.',
  traits: ['cylindrical', 'instrument-like', 'terminal'],
});
