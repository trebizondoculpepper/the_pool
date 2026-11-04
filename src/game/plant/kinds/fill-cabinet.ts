import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Fill cabinet',
  code: 'CAB',
  class: 'plant',
  status: 'none',
  purpose: 'Provides a segregated bulk chemical delivery connection.',
  traits: ['box-like', 'control-panel-like', 'wall-mounted'],
});
