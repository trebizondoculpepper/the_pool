# The Pool · YouTube channel artwork

These are ready-to-upload choices for [The Pool's YouTube channel](https://www.youtube.com/channel/UCdOuhX8q49IHAH5QEd_BhcA). My recommended pair is the **cutaway banner** and **navy logo**: the banner shows the quiet pool above the working plant, while the icon stays legible at small sizes.

| Choice                     | File                                                                                               | Character                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Cutaway banner             | [`the-pool-youtube-banner-cutaway-2560x1440.jpg`](the-pool-youtube-banner-cutaway-2560x1440.jpg)   | Pool above, machinery below; the clearest statement of the game. |
| Engineering section banner | [`the-pool-youtube-banner-section-2560x1440.jpg`](the-pool-youtube-banner-section-2560x1440.jpg)   | Symmetrical pool section and plant; more technical.              |
| Caustics banner            | [`the-pool-youtube-banner-caustics-2560x1440.jpg`](the-pool-youtube-banner-caustics-2560x1440.jpg) | Quiet, minimal match to the existing itch.io art.                |
| Navy channel logo          | [`the-pool-youtube-logo-navy-800.png`](the-pool-youtube-logo-navy-800.png)                         | The approved roundel on a dark ground.                           |
| Cyan channel logo          | [`the-pool-youtube-logo-cyan-800.png`](the-pool-youtube-logo-cyan-800.png)                         | The approved roundel on a bright ground.                         |

All banners are 2560 × 1440 JPEGs under 6 MB. Their lettering and emblem sit within the central 1544 × 423 px safe area, so YouTube can crop the top, bottom and sides for mobile, desktop and TV. The icons are 800 × 800 PNGs. These sizes follow [YouTube's current banner guidance](https://support.google.com/youtube/answer/10456525?hl=en).

To upload: in [YouTube Studio](https://studio.youtube.com/), open **Customization → Profile**, change the banner and profile picture, check the crop preview, then **Publish**. YouTube uses the same banner file with different crops on different devices.

The two new cutaway backgrounds are in [`source/`](source/) beside the editable [`artwork.html`](source/artwork.html) and [`render.mjs`](source/render.mjs). The marks reuse the project's approved vector logo at `resources/images/title/the-pool-logo.svg`, and the caustics background reuses the itch.io artwork. On the project Mac, run `node doc/marketing/youtube/source/render.mjs` to rebuild all five deliverables with headless Chrome and `sips`.
