import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Dustbin',
  code: 'D',
  class: 'non-plant',
  status: 'none',
  purpose: 'A waste bin that takes the rubbish and finds thrown into it.',
  traits: ['bin-like', 'box-like', 'fixed', 'floor-standing', 'functional'],
});
