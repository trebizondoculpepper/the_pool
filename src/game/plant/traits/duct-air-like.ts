import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'The air handling and extract units; floor- or wall-mounted per kind.',
  extends: ['box-like', 'fixed', 'operable'],
});
