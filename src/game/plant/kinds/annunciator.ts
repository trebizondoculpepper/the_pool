import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Annunciator',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Indicates and acknowledges plant alarms.',
  traits: ['board-like'],
});
