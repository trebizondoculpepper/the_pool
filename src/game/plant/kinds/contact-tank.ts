import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Contact tank',
  code: 'T',
  class: 'plant',
  status: 'none',
  purpose: 'Holds ozonated water for its required contact time.',
  traits: ['tank-like'],
});
