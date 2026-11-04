import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Cartridge filter',
  code: 'F',
  class: 'plant',
  status: 'none',
  purpose: 'Removes suspended solids from circulating water.',
  traits: ['filter-like'],
});
