import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'Something to climb: a mobility aid the player mounts at either end and climbs between two floors (mission 18); not solid. The room factory climbs every kind that carries it.',
  extends: ['functional', 'fixed', 'climbable'],
});
