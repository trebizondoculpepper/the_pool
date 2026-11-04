import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Sign',
  code: 'FX',
  class: 'decorative',
  status: 'none',
  purpose: 'Displays room safety notices.',
  traits: ['decorative', 'fixed', 'panel-like', 'wall-mounted'],
});
