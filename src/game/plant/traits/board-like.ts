import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'A thin wall board read or watched: a mimic, an annunciator, a monitor.',
  extends: ['panel-like', 'wall-mounted', 'fixed', 'readable'],
});
