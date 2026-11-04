import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Chemical container',
  code: 'T',
  class: 'plant',
  status: 'none',
  purpose: 'Stores acid for pool dosing on a spill pallet.',
  traits: ['tank-like'],
});
