import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Alarm printer',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Prints plant alarm records.',
  traits: ['box-like', 'fixed', 'floor-standing', 'operable', 'readable'],
});
