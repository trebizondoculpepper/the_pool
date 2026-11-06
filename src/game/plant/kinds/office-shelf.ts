import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Office wall shelf',
  code: 'OWS',
  class: 'non-plant',
  status: 'none',
  purpose:
    "The engineer's wall shelf: a rack for its boxed software, one centred row.",
  traits: ['box-like', 'functional', 'rack', 'supportable', 'wall-mounted'],
  meta: {
    rowWidth: 1.05,
    rowDepth: 0.26,
    gap: 0.006,
    facing: '+z',
  },
});
