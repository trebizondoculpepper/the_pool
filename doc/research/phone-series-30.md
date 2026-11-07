# The held phone: Series 30 reference

Research for [mission 220](../prompts/220-series-30-phone-reference.md), issue [#75](https://github.com/trebizondoculpepper/the_pool/issues/75), 2026-11-07. This is a design reference, not a claim that the game's licensed asset is an official Nokia product.

## Which family?

Nokia described [Series 30 as the platform for its basic voice and messaging phones](https://www.nokia.com/system/files/files/form20-f-11-pdf.pdf#page=208) and [Symbian as a separate smartphone platform](https://www.nokia.com/system/files/files/form20-f-11-pdf.pdf#page=208). The intended look is therefore **Series 30-inspired**, not “Symbian Series 30”. The game's [original phone asset](https://sketchfab.com/3d-models/mobile-phone-799470f0ca144092848ca2d5144dcb4f) is credited to Ilia_S under CC BY 4.0 in `CREDITS.md`; its source package and shipped adaptation are recorded in `doc/reuse-inventory.md`.

## Nokia 2600: the close visual match

The [2004 Nokia 2600 user guide, printed page 13](https://ringtones.specialtyansweringservice.net/wp-content/uploads/2014/08/manuals/nokia-2600-userguide.pdf#page=13) diagrams a single context-sensitive Navi key below the display, a separate C key to clear or leave a function, a four-way scroll pad, and a red power key. Its [service manual cover](https://www.mobilgyujtemeny.hu/letolt/Service%20manual/Nokia/nokia_2600_servicemanual_en.pdf#page=1) has a colour front image. These are the reference images for the handset and key cluster; link to the Nokia documents rather than copying their protected images into the repository.

The game's Ilia_S handset visibly matches the 2600's silver shell, black inset face, blue horizontal Navi key, C key on the left, red power key on the right, four-way pad and numeric keypad. This is a visual inference from the source-model preview and Nokia's documents; the model's creator did not identify it as a Nokia 2600 in the supplied licence. Its face and screen can serve the design without replacing the model or its attribution.

The [Nokia 2600 service manual, page 1](https://www.mobilgyujtemeny.hu/letolt/Service%20manual/Nokia/nokia_2600_servicemanual_en.pdf#page=1) specifies a **128 × 128 pixel, 4,096-colour display**. Contemporary descriptions call it a colour STN panel; the exact panel part is not established by that cover. Use this resolution and colour depth as the verified targets for [mission 221](https://github.com/trebizondoculpepper/the_pool/issues/77), with the period screen appearance informed by [display-technologies.md](display-technologies.md). The low resolution and physical display response are more important to the effect than an exaggerated RGB grid.

## Interface design for the existing model

Show **one** context-sensitive action label at the bottom of the display, aligned with the blue Navi key: `Select` or `Open` on a highlighted item. If a standby page is added later, its Navi label can be `Menu`; the present phone opens straight into its main menu. When reading a message, leave Navi unlabelled until it has an action; the scroll pad, not Navi, scrolls the text. The C key is the back or exit control; do not draw a second `Back` soft-key label. The four-way pad moves selection in the menu and scrolls a message. Keep Phone, Media and Radio as placeholders; Messages is the only working route until their own missions.

For keyboard, Arrow keys stand for the scroll pad, Enter for Navi and Escape for C/back, as settled in [mission 219](../prompts/219-phone-controls.md). On touch, hit regions must sit on the model's visible Navi, C and scroll keys and move with its projected pose. On gamepad, the D-pad stands for the scroll pad, with select/back buttons mapped through the shared control scheme. World movement and look remain available while the phone is raised; world use is held.

The current `phone-display.ts` draws two bottom labels (`Back` and `Open`) on a 512 × 512 canvas, and `first-person.ts` takes W/A/S/D for the phone. Those are known mismatches with the owner-approved design, assigned to [mission 219](../prompts/219-phone-controls.md) and the Messages navigation [ticket #78](https://github.com/trebizondoculpepper/the_pool/issues/78). This reference mission changes no game input or rendering code.

## Comparison references

The earlier [Nokia 1100 guide](https://www.instructionsmanuals.com/sites/default/files/2019-05/Nokia-1100-en.pdf) also shows a single Navi key, but its screen is monochrome. The later [Nokia 1600 guide](https://www.consumercellular.com/Content/PDFs/Manuals/Nokia_1600_UG.pdf) shows two selection keys; [Nokia's 2005 announcement](https://www.globenewswire.com/news-release/2005/06/02/1847935/0/en/The-Road-to-Three-Billion-Subscribers-Nokia-outlines-strategy-to-reduce-total-cost-of-mobile-phone-ownership-for-consumers-in-new-growth-markets.html) contrasts its colour screen with the 1110's monochrome display. The 2600 is the stronger match because it combines the owner's single-key choice, a colour display, and the existing model's face layout.
