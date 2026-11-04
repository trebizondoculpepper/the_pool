import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Boiler',
  code: 'B',
  class: 'plant',
  status: 'none',
  purpose: 'Heats the shared low-temperature heating circuit.',
  brand: 'hamwarmy',
  traits: ['heat-like'],
});
