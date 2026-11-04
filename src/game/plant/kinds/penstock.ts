import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Drain penstock',
  code: 'DV',
  class: 'plant',
  status: 'none',
  template: 'valve',
  purpose:
    'Opens or shuts a tank outlet, worked by an extended spindle from above.',
  brand: 'grundflow',
  traits: ['panel-like', 'valve-like'],
});
