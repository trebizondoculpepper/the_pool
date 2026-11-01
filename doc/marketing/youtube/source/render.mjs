import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'pool-youtube-render-'));
try {
  for (const [asset, file, width, height] of [
    [
      'banner-cutaway',
      'the-pool-youtube-banner-cutaway-2560x1440.jpg',
      2560,
      1440,
    ],
    [
      'banner-section',
      'the-pool-youtube-banner-section-2560x1440.jpg',
      2560,
      1440,
    ],
    [
      'banner-caustics',
      'the-pool-youtube-banner-caustics-2560x1440.jpg',
      2560,
      1440,
    ],
    ['avatar-navy', 'the-pool-youtube-logo-navy-800.png', 800, 800],
    ['avatar-cyan', 'the-pool-youtube-logo-cyan-800.png', 800, 800],
  ]) {
    const png = file.endsWith('.png')
      ? join(output, file)
      : join(profile, `${asset}.png`);
    const url = `${pathToFileURL(join(here, 'artwork.html'))}?asset=${asset}`;
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--no-first-run',
        '--disable-gpu',
        '--hide-scrollbars',
        `--user-data-dir=${join(profile, asset)}`,
        `--window-size=${width},${height}`,
        '--virtual-time-budget=1500',
        `--screenshot=${png}`,
        url,
      ],
      { stdio: 'ignore' },
    );
    if (file.endsWith('.jpg'))
      execFileSync(
        'sips',
        [
          '-s',
          'format',
          'jpeg',
          '-s',
          'formatOptions',
          '90',
          png,
          '--out',
          join(output, file),
        ],
        { stdio: 'ignore' },
      );
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}
