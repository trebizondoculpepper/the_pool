import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Dosing controller',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Measures water samples and commands chemical dosing.',
  traits: ['box-like', 'control-panel-like', 'floor-standing'],
});
