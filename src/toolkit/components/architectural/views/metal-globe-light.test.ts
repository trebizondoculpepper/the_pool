import { expect, it } from 'vite-plus/test';
import type { Material, Mesh } from 'three';
import { createMetalGlobeLight } from './metal-globe-light';

it('has no transmissive surface, which would make the renderer draw the scene twice a frame (#45)', () => {
  const globe = createMetalGlobeLight();
  const materials: Material[] = [];
  globe.traverse((o) => {
    const m = (o as Mesh).material;
    if (m) materials.push(...([] as Material[]).concat(m));
  });
  expect(materials.length).toBeGreaterThan(0);
  for (const m of materials)
    expect((m as { transmission?: number }).transmission ?? 0, m.type).toBe(0);
  // The diffuser still glows and is see-through by its opacity.
  const lower = globe.getObjectByName('translucent lower hemisphere') as Mesh;
  const diffuser = lower.material as Material & { opacity: number };
  expect(diffuser.transparent).toBe(true);
  expect(diffuser.opacity).toBeLessThan(1);
});
