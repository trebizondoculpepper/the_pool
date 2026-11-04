import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Chemical tank',
  code: 'T',
  class: 'plant',
  status: 'none',
  purpose:
    'Stores a dosing chemical in bulk, filled by tanker, for transfer to the day tanks.',
});
