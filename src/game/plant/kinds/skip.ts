import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Skip',
  code: 'SK',
  class: 'non-plant',
  status: 'none',
  purpose: 'Takes the rubbish, broken parts and finds thrown into it.',
  traits: ['bin-like', 'box-like', 'fixed', 'floor-standing', 'functional'],
});
