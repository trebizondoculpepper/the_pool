import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev31',
  build: {
    kind: 'module',
    module: 'rendering/effects-playground-room',
    start: 'startEffectsPlaygroundRoom',
  },
});
