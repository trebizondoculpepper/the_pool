import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Break tank',
  code: 'T',
  class: 'plant',
  status: 'level',
  purpose: 'Separates the incoming main from pool make-up water.',
  traits: ['tank-like', 'walkable'],
});
