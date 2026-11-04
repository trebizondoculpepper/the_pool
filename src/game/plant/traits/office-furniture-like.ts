import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    "A room's furniture: a desk, cupboard or cabinet that holds or stores.",
  extends: ['box-like', 'floor-standing', 'fixed'],
});
