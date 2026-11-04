import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Transfer pump',
  code: 'P',
  class: 'plant',
  status: 'none',
  purpose:
    'Sends a dosing chemical from its store along its main to the day tanks.',
  traits: ['floor-standing', 'machine-like'],
});
