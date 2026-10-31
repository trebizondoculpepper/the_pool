# Reddit (r/the_pool_game)

Art and text for https://www.reddit.com/r/the_pool_game/, made 2026-10-31 in the itch.io page's style (`../itch_io/`).

| File                                         | Where it goes                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `the-pool-reddit-banner-1920x384.png`        | Mod Tools, Community appearance, Banner (desktop, 1920 × 384). Reddit crops the sides on narrow screens, so the logo and title sit in the middle. |
| `the-pool-reddit-banner-mobile-1600x480.png` | Community appearance, Mobile banner (1600 × 480): taller, the title larger, for phones.                                                           |
| `the-pool-reddit-icon-256.png`               | Community appearance, Avatar. Reddit shows it in a circle; the logo sits inside it. `the-pool-reddit-icon-512.png` is the 2× version.             |
| `description.md`                             | Community settings, description (500 characters at most).                                                                                         |

To re-render, put beside the pages in `source/`: `the-pool-logo.svg` (`resources/images/title/`), `Antonio-Variable.ttf` (`src/toolkit/components/core/assets/fonts/`), the caustics background (`../itch_io/`) and the four `c90-2*.png` decals (`resources/images/museum_decals/`), then run `node render.mjs <dir>` (playwright-core and Chrome).
