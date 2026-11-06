import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'BMS outstation',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Collects plant signals for building controls.',
  traits: ['board-like', 'inspectable'],
});
