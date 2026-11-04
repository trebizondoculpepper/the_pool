import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Storage cupboard',
  code: 'FX',
  class: 'non-plant',
  status: 'none',
  purpose: 'Stores the engineers’ parts and test equipment.',
  traits: ['office-furniture-like', 'operable', 'supportable'],
});
