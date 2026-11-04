import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Earthing terminal',
  code: 'FX',
  class: 'plant',
  status: 'none',
  purpose: 'Bonds the electrical installation to earth.',
  traits: ['box-like', 'fixed', 'readable', 'terminal'],
});
