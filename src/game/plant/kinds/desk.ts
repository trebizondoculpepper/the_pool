import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Desk',
  code: 'FX',
  class: 'non-plant',
  status: 'none',
  purpose: 'Furnishes the engineer’s office.',
  traits: ['desk', 'functional'],
});
