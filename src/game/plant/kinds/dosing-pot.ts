import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Dosing pot',
  code: 'DP',
  class: 'plant',
  status: 'none',
  purpose: 'Introduces treatment chemical to the heating circuit.',
  traits: ['container', 'cylindrical', 'fixed', 'inspectable', 'wall-mounted'],
});
