# The pizza oven: Moretti Forni serieP Amalfi D on its prover

The owner, 2026-11-02: "I want you to make a new devroom, for kitchen things. First and only item: A Moretti Forni pizza oven. Twin deck stood on a heat cupboard on 4 lockable wheels. Begin by looking up that product and make me a reference model." The owner then chose the Amalfi's style (serieP), over the iDeck and the PD 60.60 first looked at. The game's model is the Mozzetti Forni Ravello D (`src/toolkit/components/kitchen/views/pizza-oven.ts`, figures in `logic/pizza-oven.ts`), in dev70 · Kitchen.

## The product chosen

Moretti Forni serieP **Amalfi D**, two baking chambers 18 cm high, assembled on the **leavening prover 800 mm high** on wheels (US listing AMA0D02P, "Amalfi D C18 Electric Double Deck Oven with Proofer"). It is the closest real configuration to the owner's words: an electric twin-deck pizza oven on its own heated cupboard, on four castors. The Amalfi comes in A, B, C and D widths; D is the largest, and its datasheet is the one with a two-deck-on-prover drawing.

## Sources

- Moretti Forni datasheet "Amalfi D" (as distributed by Industry Kitchens), `EUR-COMP-D-2-L.pdf`: https://s3.amazonaws.com/zcom-media/sites/a0i0L00000VH4TSQA1/media/mediamanager/EUR-COMP-D-2-L.pdf. Page 1: description, construction, accessories, internal dimensions, photograph of the two-deck oven on its prover. Page 3: "2 baking chambers height 18cm (assembled with prover height 800mm)", rear, right side and front views with dimensions. Page 5: power.
- Moretti Forni manual for the serieP P60E, P80E and P120E (the Amalfi's chambers), via WebstaurantStore: https://www.webstaurantstore.com/documents/pdf/moretti_forni_amalfi_p60e-p80e_p120e_manual.pdf. Section 3.2 and fig. 17 (the chamber's two control panels and their 15 items), 3.4 (the vapour knob), 3.5 and fig. 18 (the prover's panel).
- WebstaurantStore listing, Amalfi D C18 double deck with proofer (AMA0D02P, discontinued): https://www.webstaurantstore.com/moretti-forni-amalfi-d-c18-electric-double-deck-oven-with-proofer-208v-45-5-16-x-43-11-16/15AAMA0D02PC.html. Overall 59 13/16" W × 58 3/16" D × 72 13/16" H; proofer 31 1/2" high, on casters, 149 °F, 1.8 kW.
- For comparison only: the AMACB18I two-deck listing at Silverchef (1320 W × 1330 D × 1860 H, chambers 650 × 1035 × 180), https://www.silverchef.com.au/products/02irf00000209i5_moretti-forni-amacb18i-2-deck-pizza-oven-with-stand ; and the iDeck PD 60.60 datasheet first looked at, https://s3.amazonaws.com/zcom-media/sites/a0i0L00000VH4TSQA1/media/mediamanager/EUR-PD-60.60.pdf (850 × 921 × 778 mm, electro-mechanical, two thermostats per chamber).

## Figures used (millimetres)

| What                                               | Figure                                       | Source                   |
| -------------------------------------------------- | -------------------------------------------- | ------------------------ |
| External width                                     | 1520                                         | datasheet p. 3           |
| Body depth                                         | 1365                                         | datasheet p. 3           |
| Overall depth, handles and hood to the rear duct   | 1698 (200 in front, 105 behind)              | datasheet p. 3 side view |
| Height to the hood's top, on the 800 prover        | 1850                                         | datasheet p. 3           |
| Height to the top of the optional ducting          | 2235 (dashed: not modelled)                  | datasheet p. 3           |
| Prover, floor to its top, castors included         | 800                                          | datasheet p. 3           |
| Castors, floor to the prover's underside           | 140                                          | datasheet p. 3           |
| Oven base under the lower deck                     | 100                                          | datasheet p. 3 rear view |
| Each deck's module                                 | 400                                          | datasheet p. 3 rear view |
| Hood                                               | 150                                          | datasheet p. 3 rear view |
| Steam exhaust collar on the hood, rear, Ø150       | 100 high                                     | datasheet p. 3 (D)       |
| Each chamber inside                                | 1150 W × 1115 D × 180 H, 1.28 m²             | datasheet p. 1           |
| Door handles' pivots above the floor               | 1002 and 1402                                | datasheet p. 3 side view |
| Control column width, measured from the front view | about 198                                    | datasheet p. 3, scaled   |
| Left stile (vapour knob), measured                 | about 122                                    | datasheet p. 3, scaled   |
| Chamber maximum                                    | 450 °C                                       | datasheet p. 1           |
| Prover maximum                                     | 65 °C                                        | datasheet p. 1           |
| Power, each chamber                                | 12.6 kW (400 V 3N); prover 1.5 kW (230 V 1N) | datasheet p. 3           |
| Weight                                             | 606 kg oven, 756 kg with prover              | datasheet p. 3           |

The overall depth: 200 + 1365 + 105 = 1670, 28 mm short of the drawing's 1698 overall; the model uses 1670 (the hood's overhang reaching the handles' front).

## Construction and look (datasheet p. 1 and its photograph)

- Structure of folded stainless steel; side panels of painted sheet metal; stainless hood (black in the photograph, rounded at the front, the maker's oval badge in its middle: chrome rim, black field, red mark, white name); stainless steam duct; rock wool insulation; dual halogen lighting in each chamber.
- Each door stainless, hinged at the bottom with a balancing spring, with a tempered glass window. The handle, from the photograph: a stainless tube bent into a U over the window, its two legs running down to black pivot blocks low on the door's sides, 1002 / 1402 mm from the floor.
- Vapour ducting by a manual butterfly valve, worked by a black ball knob on the front left of each chamber: pulled out, open; pushed in, closed (manual 3.4).
- Prover: stainless cabinet with tray guides, two hinged doors meeting in the middle, a round black knob on each near the top inner corner; heated by a thermostat to 65 °C.

## Controls

Each chamber (manual 3.2, fig. 17) has two panels on its front right:

- Upper: (1) main switch ON/OFF, illuminated, the panel below lit with it; (2) safety thermostat reset.
- Lower, electronic: (3) temperature +up / −down; (4) set temperature display (right); (5) ceiling power keys and (6) its display, 0 to 9; (7) floor power keys and (8) its display, 0 to 9, a dot in the corner of each lit while those elements draw; (9) START/STOP of the heating elements, a red LED in its corner; (10) ECONOMY, its red LED lit when ceiling + floor ≤ 9 (the elements never fed together) or flashing when chosen by hand; (11) the chamber's light; (12) the chamber's temperature display (left); (13) M (manual) and (14) P (20 programs), each with its LED; (15) TIMER (three baking timers, the clock and a daily start time).

The prover (manual 3.5, fig. 18): (1) indicator lamp ON/OFF; (2) inside light switch; (3) on/off and regulating thermostat, to 65 °C.

## What the datasheets do not give, and what was assumed

- The electronic panel's exact layout and legends: the manual numbers its items but its figure was not legible here, and the photograph is small. The model places them as the photograph suggests (chamber and set temperatures side by side in the middle, ceiling above and floor below on the right with their ▲▼ keys, six keys in two columns at the left) and labels them in English words (OVEN °C, SET °C, CEILING, FLOOR, START/STOP, ECO, LIGHT, M, P, TIMER) where the real panel uses pictograms.
- The castors: the drawing shows four swivel castors, the front pair with brake pedals, about Ø100 mm, 140 mm high overall. The owner asked for four lockable wheels, so all four are drawn as total-lock castors with red pedals; no maker's figure for the wheel was found.
- The prover's panel layout (lamp, switch, thermostat): from the photograph and the drawing's front view; the thermostat's scale (OFF, 20 to 65 °C over three quarters of a turn) is assumed.
- Colours: stainless front, sides painted a mid grey (the datasheet says painted, not which colour), the hood black as photographed, the badge after Moretti's red-and-white mark.
- The optional hood motor and self-condensing hood (dashed in the drawing) are not modelled; only the Ø150 collar and the duct down the back.
- The model is a reference model: its displays are drawn once in a sample state (on, heating, 322 °C against a 330 °C set point, ceiling 7, floor 5, lamps lit; prover at 30 °C). Making it work is a follow-up in `TODO.md`.
