import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'A 3.5-inch floppy disk from the desk: a thin flat slab, picked up and carried, its paper label read.',
  extends: ['panel-like', 'holdable', 'readable'],
});
