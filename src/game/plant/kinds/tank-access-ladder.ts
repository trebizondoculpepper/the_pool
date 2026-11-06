import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Tank access ladder',
  code: 'TLD',
  class: 'non-plant',
  status: 'none',
  purpose:
    'A ladder down into a tank or pit, climbed for inspection and cleaning.',
  traits: ['ladder'],
});
