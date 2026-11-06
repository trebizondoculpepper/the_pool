import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'CCTV monitor',
  code: 'FX',
  class: 'non-plant',
  status: 'none',
  purpose: 'Displays security camera views.',
  traits: ['board-like', 'inspectable'],
});
