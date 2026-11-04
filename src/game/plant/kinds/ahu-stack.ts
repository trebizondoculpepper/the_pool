import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Air-handling unit',
  code: 'AHU',
  class: 'plant',
  status: 'none',
  purpose: 'Conditions and moves air for the pool halls.',
  traits: ['duct-air-like', 'floor-standing'],
});
