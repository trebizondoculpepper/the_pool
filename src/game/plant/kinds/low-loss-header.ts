import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Low-loss header',
  code: 'HW',
  class: 'plant',
  status: 'none',
  purpose: 'Hydraulically separates boiler and distribution flows.',
  traits: ['container', 'cylindrical', 'fixed', 'floor-standing'],
});
