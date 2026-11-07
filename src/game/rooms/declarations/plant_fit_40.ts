import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'plant_fit_40',
  build: {
    kind: 'module',
    module: 'rendering/plant-fit-room',
    start: 'startPlantFitRoom',
    args: [40],
  },
});
