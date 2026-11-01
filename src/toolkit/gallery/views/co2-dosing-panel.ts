import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createEngravedPlate } from '../../components/core/views/plant-signs';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createDialGauge } from '../../components/industrial-control/views/dial-gauge';
import { createPilotLamp } from '../../components/industrial-control/views/industrial-controls';
import type { Co2Doser } from '../../../game/plant/co2-dosing';

/** A Chlorella Chemicals dosing panel: its valve, pressure and flow follow the world. */
export function createCo2DosingPanel(kit: PanelKit) {
  const group = new Group();
  group.name = 'Chlorella Chemicals CO₂ dosing valve controller';
  const body = new MeshStandardMaterial({ color: '#d9ddd9', roughness: 0.55 });
  const valvePaint = new MeshStandardMaterial({
    color: '#59646b',
    roughness: 0.48,
  });
  kit.materials.push(body, valvePaint);
  group.add(new Mesh(new BoxGeometry(0.7, 0.9, 0.28), body));

  const title = createEngravedPlate(kit, ['CO₂ DOSING', 'VALVE CONTROLLER'], {
    width: 0.42,
    height: 0.08,
  });
  title.position.set(-0.1, 0.34, 0.145);
  group.add(title);
  panelMakerMark(kit, group, { width: 0.7, height: 0.9, z: 0.14 });
  const maker = createBrandBadge(kit, 'chlorella', {
    height: 0.035,
    maxWidth: 0.33,
  });
  maker.position.set(-0.12, -0.36, 0.145);
  group.add(maker);

  const gauge = createDialGauge(kit, {
    dia: 0.12,
    max: 6,
    unit: 'bar',
    legend: 'CO₂ INLET',
  });
  gauge.group.position.set(-0.18, 0.12, 0.165);
  group.add(gauge.group);
  const lamp = createPilotLamp(kit, 'green');
  lamp.group.position.set(0.16, 0.12, 0.155);
  group.add(lamp.group);
  const valve = new Mesh(new BoxGeometry(0.24, 0.16, 0.13), valvePaint);
  valve.position.set(0, -0.12, 0.21);
  valve.userData.live = true;
  group.add(valve);
  const label = createEngravedPlate(kit, ['CO₂ VALVE'], {
    width: 0.24,
    height: 0.06,
  });
  label.position.set(0, -0.23, 0.145);
  group.add(label);

  return {
    group,
    show(doser: Co2Doser, pressure: number) {
      gauge.set(pressure);
      lamp.set(doser.open && doser.delivering > 0);
      valvePaint.color.set(doser.open ? '#386b55' : '#59646b');
    },
    update(delta: number) {
      gauge.update(delta);
      lamp.update(delta);
    },
  };
}
