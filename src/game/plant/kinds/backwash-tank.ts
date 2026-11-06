import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Backwash tank',
  code: 'T',
  class: 'plant',
  status: 'level',
  purpose: 'Holds filter backwash water before discharge.',
  traits: ['inspectable', 'tank-like'],
});
