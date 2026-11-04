import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Readout board',
  code: 'CP',
  class: 'plant',
  status: 'none',
  purpose: 'Displays live plant measurements.',
  traits: ['board-like'],
});
