import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'shared_plant_layout',
  build: {
    kind: 'module',
    module: 'rendering/shared-plant-layout',
    start: 'startSharedPlantLayout',
  },
});
