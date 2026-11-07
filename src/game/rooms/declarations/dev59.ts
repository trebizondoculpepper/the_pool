import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev59',
  build: {
    kind: 'module',
    module: 'rendering/dev-corridor-room',
    start: 'startDevCorridorRoom',
  },
});
