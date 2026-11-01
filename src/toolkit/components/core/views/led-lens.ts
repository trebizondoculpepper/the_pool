import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  RGBAFormat,
} from 'three';
import { createPs1Material } from '../parts/ps1-material';
import { LED_HOT_SPOT_FROM, ledLensPixels } from '../logic/led-lens';
import type { PanelKit } from './eighties-controls';

/**
 * The face of an indicator lens (the owner, 2026-11-01): one greyscale
 * radial gradient (`logic/led-lens.ts`), made once and shared by every
 * lens as its `map` and `emissiveMap`, tinted by the lens's own colour.
 * Unlit, the lens is dark coloured plastic under the room's light; lit, it
 * glows in its colour, whitening to a hot spot at its centre.
 */

let shared: DataTexture | null = null;

/** The one lens gradient, uploaded once; never disposed with a kit. */
export function ledLensTexture(): DataTexture {
  if (shared) return shared;
  const size = 64;
  const texture = new DataTexture(ledLensPixels(size), size, size, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  shared = texture;
  return texture;
}

/** How dark an unlit lens's colour is, and how far a lit one whitens. */
const UNLIT = 0.42;
const HOT = 0.6;

export interface LedLensFace {
  material: MeshStandardMaterial;
  /** Light the lens: 0 dark, 1 fully lit. Changes uniforms only. */
  set(level: number): void;
}

/** A lens face in `colour`, kept in the kit for disposal (not its texture). */
export function ledLensFace(kit: PanelKit, colour: string): LedLensFace {
  const tint = new Color(colour);
  const texture = ledLensTexture();
  const material = createPs1Material(
    {
      color: tint.clone().multiplyScalar(UNLIT),
      map: texture,
      emissive: tint,
      emissiveMap: texture,
      emissiveIntensity: 0,
      roughness: 0.28,
    },
    false,
    true,
  ) as MeshStandardMaterial;
  // A lit lens shows its own colour, as the plain glow it replaces did.
  material.toneMapped = false;
  const heat = { value: 0 };
  const ps1Compile = material.onBeforeCompile;
  const ps1Key = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    ps1Compile.call(this, shader, renderer);
    shader.uniforms.ledHeat = heat;
    shader.fragmentShader = `uniform float ledHeat;
      ${shader.fragmentShader}`.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      #ifdef USE_EMISSIVEMAP
        totalEmissiveRadiance += vec3(ledHeat * smoothstep(${LED_HOT_SPOT_FROM.toFixed(3)}, 1.0, emissiveColor.r));
      #endif`,
    );
  };
  material.customProgramCacheKey = function () {
    return `${ps1Key.call(this)}-led-lens-v1`;
  };
  kit.materials.push(material);
  return {
    material,
    set(level) {
      const l = Math.min(1, Math.max(0, level));
      material.emissiveIntensity = l;
      heat.value = l * HOT;
    },
  };
}
