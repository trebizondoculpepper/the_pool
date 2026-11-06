import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'Something to climb: a mobility aid the player mounts at either end and climbs between two floors (mission 18). Its climbing zone comes from the trait, through the room factory.',
  extends: ['functional', 'fixed'],
});
