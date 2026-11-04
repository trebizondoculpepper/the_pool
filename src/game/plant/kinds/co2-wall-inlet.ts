import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'CO₂ wall inlet',
  code: 'WP',
  class: 'plant',
  status: 'none',
  purpose:
    'Brings the CO₂ line in from the cylinder cage, with its emergency isolation valve.',
  brand: 'arncliffe',
  traits: ['box-like', 'valve-like'],
});
