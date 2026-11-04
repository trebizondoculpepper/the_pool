import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Sign',
  code: 'SG',
  class: 'non-plant',
  status: 'none',
  purpose: 'Displays a room notice, safety instruction or warning.',
  affordances: {
    interaction: 'inspect-only',
    solid: false,
  },
});
