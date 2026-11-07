import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev60',
  build: {
    kind: 'module',
    module: 'rendering/dev-corridor-room',
    start: 'startDevCorridorRoom',
  },
  sharesWorldWith: 'dev59',
});
