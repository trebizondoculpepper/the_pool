import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'CO₂ master valve panel',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose:
    'Opens and shuts the whole building’s CO₂ supply; tripped shut by a high gas alarm.',
  brand: 'penfold',
  traits: ['box-like', 'valve-like'],
});
