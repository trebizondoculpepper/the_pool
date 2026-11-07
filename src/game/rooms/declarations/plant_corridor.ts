import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'plant_corridor',
  build: {
    kind: 'module',
    module: 'rendering/plant-corridor-room',
    start: 'startPlantCorridorRoom',
  },
});
