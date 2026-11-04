import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Dosing pump',
  code: 'DP',
  class: 'plant',
  status: 'none',
  purpose: 'Meters acid to control pool-water pH.',
  traits: ['machine-like', 'wall-mounted'],
});
