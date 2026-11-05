import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    "An engineer's desk: a passive floor-standing work surface you can put things on.",
  extends: [
    'box-like',
    'floor-standing',
    'fixed',
    'supportable',
    'bounds-model',
  ],
});
