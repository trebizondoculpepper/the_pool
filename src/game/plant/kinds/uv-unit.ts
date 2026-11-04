import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'UV unit',
  code: 'UV',
  class: 'plant',
  status: 'uv',
  purpose: 'Disinfects circulating water with ultraviolet light.',
  traits: ['filter-like'],
});
