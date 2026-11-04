import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Mimic panel',
  code: 'MP',
  class: 'plant',
  status: 'none',
  purpose: 'Shows boiler status and heat output.',
  traits: ['board-like'],
});
