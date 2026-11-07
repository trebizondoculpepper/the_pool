# 221: A colour-matrix display for the held phone

Tracked in [issue #77](https://github.com/trebizondoculpepper/the_pool/issues/77); status lives there. The owner, 2026-11-07, asks for the limited colour, low-resolution matrix appearance of an early handset. [Mission 220](220-series-30-phone-reference.md) establishes the close Nokia 2600 reference: its service manual gives a 128 × 128 pixel screen and 4,096 colours. Nokia's exact panel part is unverified, so [the display-technology research](../research/display-technologies.md) supplies a restrained colour STN visual target rather than a claim about the original component.

## Gameplay reason

The phone carries messages the player must read while moving through the plant. Its screen should look convincingly old and still show menu selection, unread state and message text clearly at desktop and portrait phone widths.

## Work

1. Draw the interface at a true 128 × 128 logical resolution and quantise each channel to four bits (at most 4,096 RGB colours). Upscale by nearest neighbour onto the existing phone texture, preserving crisp logical pixels through the 3D view.
2. Use original bitmap-style glyphs drawn in code, including readable message text and symbols. Do not copy Nokia's fonts, icons, logo or boot animation. Leave the handset's eventual invented maker/model to mission 222, where the app layer can pass registered brand data into the controls layer without breaking its import rule.
3. Add a subtle fixed pixel-cell grid, a muted palette and an even backlight wash to suggest a colour STN panel. Any smear or response effect must be short, legible and update at no more than 10 Hz. Static treatment should need no per-frame texture upload.
4. Retain the one context-sensitive Navi label and no second soft-key label from mission 220. C is the physical back control, not an on-screen soft key. Phone, Media and Radio remain placeholders; this mission does not add their content.
5. Keep the display redraw-on-visible-change rule. Verify with the component benchmark and check at portrait and desktop sizes, including with handset motion once mission 224 lands. The information overlay must continue to name the screen's content independently of its appearance.

## Acceptance

- A screen capture at the held handset's normal size shows distinct pixel cells, a restrained period palette and readable highlighted menu text and messages.
- The render has 128 × 128 logical pixels, no more than 4,096 quantised colours, and no smoothing when scaled to the 3D display texture.
- The screen texture uploads only when its visible frame changes; any optional response animation runs at 10 Hz or less. The component benchmark stays within budget.
- The UI shows one Navi action label and no copied Nokia artwork, fonts or tones.

## Dependencies and coordination

Mission 220 is merged. Mission 219 (#76) owns input and touch routing; this mission owns `phone-display.ts` and its rendering helpers. Mission 222 (#78) may later change menu layout, so the raster treatment should accept any `PhoneFrame` without room-specific behaviour. Mission 224 (#81) will test moving pixels for shimmer. The shared `CHANGELOG.md` is staged by hunk while these branches overlap.
