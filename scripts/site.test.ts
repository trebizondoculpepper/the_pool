import { describe, expect, it } from 'vite-plus/test';
import { startupAssets } from './site.ts';

describe('startupAssets', () => {
  it('lists the game document, entry module, styles and preloads under game/', () => {
    const html = `
      <link rel="icon" href="./resources/images/icons/meta/favicon.svg" />
      <script type="module" crossorigin src="./assets/index-ABC.js"></script>
      <link rel="modulepreload" crossorigin href="./assets/three-DEF.js">
      <link rel="stylesheet" crossorigin href="./assets/index-GHI.css">
      <script src="https://example.com/x.js"></script>`;
    expect(startupAssets(html)).toEqual([
      'game/',
      'game/assets/index-ABC.js',
      'game/assets/three-DEF.js',
      'game/assets/index-GHI.css',
    ]);
  });

  it('skips external and non-module scripts', () => {
    expect(
      startupAssets(
        '<script type="module" src="https://cdn.example/a.js"></script><script src="./b.js"></script>',
      ),
    ).toEqual(['game/']);
  });
});
