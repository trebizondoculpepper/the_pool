import { BackSide, MeshStandardMaterial, PointLight } from 'three';
import type { Group, Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { markComponent } from '../../components/core/views/component-identity';
import { createPendantLamps } from '../../components/architectural/views/pendant-lamps';

/** Three guarded industrial pendants down the centre, above the upper mimic row. */
export function addControlRoomPendants(
  kit: PanelKit,
  room: Group,
  metre: number,
  roof: number,
) {
  const places = [-3, 0, 3].map((z) => ({
    x: 0,
    z,
    y: 4.9,
    top: roof - 0.2,
    size: 0.65,
  }));
  const bulb = new MeshStandardMaterial({
    color: '#fff5dc',
    emissive: '#ffdfaa',
    emissiveIntensity: 1.1,
    roughness: 0.45,
  });
  bulb.userData.lightFitting = true;
  const lining = new MeshStandardMaterial({
    color: '#a96537',
    emissive: '#d78643',
    emissiveIntensity: 0.5,
    roughness: 0.65,
    metalness: 0.35,
    side: BackSide,
  });
  lining.userData.lightFitting = true;
  const pendants = createPendantLamps(places, bulb, lining);
  markComponent(pendants.group, {
    name: 'Lumenhaus industrial pendant lights',
  });
  room.add(pendants.group);
  // The shell disposes mesh geometries and the kit's materials with the room.
  for (const { mesh } of pendants.built) {
    const material = mesh.material as Material;
    if (!kit.materials.includes(material)) kit.materials.push(material);
  }
  for (const p of places) {
    const badge = createBrandBadge(kit, 'lumenhaus', {
      form: 'wordmark',
      height: 0.02,
    });
    badge.position.set(p.x, p.y + 0.44, p.z + 0.22);
    pendants.group.add(badge);
    const light = new PointLight('#ffe8c8', 4.5 * metre * metre, 8 * metre, 2);
    light.name = 'Lumenhaus pendant lamp';
    light.position.set(p.x, p.y - 0.18, p.z);
    pendants.group.add(light);
  }
}
