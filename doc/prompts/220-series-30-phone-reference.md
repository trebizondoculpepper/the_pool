# 220: Series 30 phone reference and single-key design

Tracked in [issue #75](https://github.com/trebizondoculpepper/the_pool/issues/75); status lives there. The owner, 2026-11-07: make the held phone convincingly resemble a **single-Navi-key Series 30** device. Start with reference images and screen dimensions before changing the interface. The [reference research](../research/phone-series-30.md) identifies the 2004 Nokia 2600 as the close match to the licensed 3D asset.

## Gameplay reason

The phone brings reports and clues into the world. Its controls and display must look like one coherent physical device, so the player can infer how to open Messages and back out by looking at the handset.

## Settled reference

- Nokia's 2600 has one context-sensitive Navi key, a separate C/exit key and four scroll directions; its screen is 128 × 128 pixels and supports 4,096 colours. The current Ilia_S model is a close visual match, though it is licensed as a generic “Mobile phone”. Preserve that provenance and do not add Nokia branding.
- Show one bottom action label for the Navi key, not a two-soft-key Series 60 strip. C handles back/exit. Map the game's Arrow keys, Enter and Escape to scroll, Navi and C; the touch hit regions align with the physical keys. Mission [219](219-phone-controls.md), [#76](https://github.com/trebizondoculpepper/the_pool/issues/76), implements the inputs.
- Phone, Media and Radio remain placeholders. Messages is the working menu route; [#78](https://github.com/trebizondoculpepper/the_pool/issues/78) verifies its selection, inbox, reader and back path. [#77](https://github.com/trebizondoculpepper/the_pool/issues/77) builds the separate colour matrix display effect from this screen reference.

## Input map for the follow-on missions

The asset has one combined `buttons_low` mesh, so these are visible regions of that mesh, not separately named key objects. Hit testing must use the rendered handset pose. World use (including gamepad A) is suppressed while the phone is raised.

| Visible region on `buttons_low` | Keyboard   | Gamepad               | Touch                                 | Main menu and Inbox                        | Message reader                     |
| ------------------------------- | ---------- | --------------------- | ------------------------------------- | ------------------------------------------ | ---------------------------------- |
| Four-way scroll pad             | Arrow keys | D-pad                 | Tap the matching direction            | Move the selection                         | Scroll the message                 |
| Blue Navi key                   | Enter      | A                     | Tap Navi                              | Open the selected item                     | No action until the reader has one |
| C key, left of the pad          | Escape     | B                     | Tap C                                 | Go back; at the main menu, lower the phone | Return to Inbox                    |
| Red power key                   | M          | D-pad Up while closed | Tap the phone HUD icon to raise/lower | No menu action while raised                | No reader action while raised      |

D-pad Up raises a closed phone and becomes scroll Up after it is raised. M and the phone HUD icon toggle it at any depth. Escape while the phone is raised always acts as C; only a later Escape with the phone down opens the game menu. LB/RB and the numeric keypad have no phone action. Long-press C is outside this mission set. Keep the existing four-icon main menu as a temporary layout from mission 214; [#78](https://github.com/trebizondoculpepper/the_pool/issues/78) owns its eventual Series 30-style list or carousel and the Messages flow.

The shipped handset should carry an invented maker and model from `brands.ts`. Nokia's name, logo, start-up animation, fonts and tunes are references only and must not appear in the game; [#80](https://github.com/trebizondoculpepper/the_pool/issues/80) supplies original beeps.

## Deliverable and acceptance

Keep the direct Nokia guide and service-manual links, original model provenance, dimensions, key diagram interpretation and proposed physical-to-game control mapping in `doc/research/phone-series-30.md`. This design mission changes no game code. The next missions can answer where the Navi, C and scroll targets are on the existing mesh, what the sole screen action label says on each page, and what logical display resolution to render. A reviewer can open the linked source images and check each claim.
