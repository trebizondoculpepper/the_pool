import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Pump',
  code: 'P',
  class: 'plant',
  status: 'motor',
  purpose: 'Circulates water, driven by its own motor and starter.',
  brand: 'grundflow',
  traits: ['floor-standing', 'machine-like'],
});
