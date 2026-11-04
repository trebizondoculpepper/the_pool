import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Heat exchanger',
  code: 'HX',
  class: 'plant',
  status: 'none',
  purpose: 'Transfers heat from the heating circuit into pool water.',
  traits: ['heat-like'],
});
