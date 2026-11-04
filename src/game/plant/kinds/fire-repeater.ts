import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Fire alarm repeater',
  code: 'CP',
  class: 'non-plant',
  status: 'none',
  purpose: 'Repeats the building fire-alarm status.',
  traits: ['board-like'],
});
