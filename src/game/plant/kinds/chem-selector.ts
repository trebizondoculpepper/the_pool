import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Transfer selector',
  code: 'XS',
  class: 'plant',
  status: 'none',
  purpose: 'Sends a dosing chemical to each plant room’s day tank in turn.',
});
