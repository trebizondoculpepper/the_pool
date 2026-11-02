import { worldStore } from '../toolkit/save/world-store';
import { installPlantContext } from './plant-context';

installPlantContext(worldStore('dev'));
