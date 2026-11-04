import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Boiler cascade',
  code: 'B',
  class: 'plant',
  status: 'none',
  purpose: 'Produces heat for the shared low-temperature heating circuit.',
  brand: 'hamwarmy',
  traits: ['heat-like'],
});
