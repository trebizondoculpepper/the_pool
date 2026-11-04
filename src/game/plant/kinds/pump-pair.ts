import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Pump set',
  code: 'P',
  class: 'plant',
  status: 'pump-set',
  purpose: 'Circulates pool water with a duty and standby pump.',
  brand: 'grundflow',
  traits: ['floor-standing', 'machine-like'],
});
