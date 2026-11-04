import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'A valve or isolating fitting in a line, turned or actuated, closing the run; its form per kind.',
  extends: ['in-line', 'fixed', 'operable'],
});
