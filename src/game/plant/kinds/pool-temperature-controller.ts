import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Pool temperature controller',
  code: 'TC',
  class: 'plant',
  status: 'none',
  purpose:
    'Measures pool-water temperature and modulates heat-exchanger flow to meet the local setpoint.',
  brand: 'water-margin',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
