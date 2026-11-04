import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Pump set',
  code: 'P',
  class: 'plant',
  status: 'none',
  purpose: 'Circulates low-temperature heating water.',
  traits: ['floor-standing', 'machine-like'],
});
