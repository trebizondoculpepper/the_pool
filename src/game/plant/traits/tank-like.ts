import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'A closed vessel holding water or chemicals, standing on the floor; nothing moves on it (its roof may be walkable: set on the kind).',
  extends: ['box-like', 'floor-standing', 'fixed', 'container'],
});
