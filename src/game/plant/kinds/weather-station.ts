import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Weather station console',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Shows the weather outside, from the roof sensors.',
  traits: ['board-like'],
});
