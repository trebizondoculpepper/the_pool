import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Mimic panel',
  code: 'MP',
  class: 'plant',
  status: 'none',
  purpose: 'Shows each facility’s heat from the LTHW ring.',
  traits: ['board-like'],
});
