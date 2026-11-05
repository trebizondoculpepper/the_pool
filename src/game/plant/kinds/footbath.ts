import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Footbath basin',
  code: 'FB',
  class: 'plant',
  status: 'none',
  purpose:
    'Contains the shallow disinfecting water that visitors wade through.',
  traits: ['fixed', 'water-body'],
  bindings: [
    {
      room: 'pool_04',
      thing: 'footbath',
    },
  ],
});
