import { Texture } from 'three';
import type { Material, Mesh, Object3D } from 'three';
import { textureBytes } from '../logic/component-bench';

/**
 * Shared by the component benchmark (mission 094) and the magic room's
 * visual cost (mission 135), so both count alike.
 */
/** Its distinct materials and textures, and the textures' bytes. */
export function resources(object: Object3D) {
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  object.traverse((o) => {
    const m = (o as Mesh).material as Material | Material[] | undefined;
    if (!m) return;
    for (const material of Array.isArray(m) ? m : [m]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
      const uniforms = (
        material as { uniforms?: Record<string, { value: unknown }> }
      ).uniforms;
      for (const u of Object.values(uniforms ?? {}))
        if (u?.value instanceof Texture) textures.add(u.value);
    }
  });
  let bytes = 0;
  for (const t of textures) {
    const image = t.image as { width?: number; height?: number } | undefined;
    if (image?.width && image.height)
      bytes += textureBytes(image.width, image.height, t.generateMipmaps);
  }
  return { materials, textures, bytes };
}
