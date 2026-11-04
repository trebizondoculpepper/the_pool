import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Calorifier',
  code: 'T',
  class: 'plant',
  status: 'none',
  purpose: 'Stores domestic hot water heated by the boiler plant.',
  traits: ['container', 'cylindrical', 'fixed', 'floor-standing'],
});
