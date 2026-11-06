import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Operator desk',
  code: 'FX',
  class: 'non-plant',
  status: 'none',
  purpose: 'Provides the operator workstation.',
  traits: [
    'box-like',
    'fixed',
    'floor-standing',
    'functional',
    'operable',
    'readable',
    'supportable',
  ],
});
