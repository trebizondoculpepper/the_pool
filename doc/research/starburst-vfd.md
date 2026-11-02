# A 14-segment (starburst) VFD of the early 1980s

Research for mission 143 (`doc/prompts/143-starburst-vfd.md`, the owner, 2026-11-02): a real early-1980s alphanumeric vacuum fluorescent display to model the Wash-O-Tron's new two-line display on. Checked 2026-11-02.

## What was made

- **The technology.** A VFD is a triode valve in a flat glass envelope under high vacuum: fine tungsten filaments coated with barium, strontium and calcium oxides, heated to about 650 °C, emit electrons; a photo-etched stainless-steel grid mesh (about 50 µm thick) over each digit switches them; they strike phosphor-coated anodes (the segments) on the back glass, which glow wherever both grid and anode are positive to the cathode. The phosphor that gives the familiar blue-green is zinc oxide, zinc-doped, peaking at 505 nm; it runs at about 50 V, not a CRT's thousands. Filaments are held taut by sheet-metal springs at the envelope's ends. Brightness is about 640 cd/m² for a standard part. Source: Wikipedia, "Vacuum fluorescent display".
- **Who made them.** Ise Electronics (later Noritake Itron) made the first multi-segment VFD in 1967; Futaba and NEC (who called theirs fluorescent indicator panels, FIP) made most of the alphanumeric glass of the late 1970s and 1980s, for cash registers, point-of-sale displays, instruments, terminals and industrial controllers. Hundreds of millions were made a year by the late 1980s. Source: Wikipedia, as above.
- **The 14-segment form.** Seven segments plus four diagonals and two centre verticals, the middle bar split in two (G1, G2), and often a decimal point as a fifteenth; it draws the whole Latin alphabet. Its conventional names are A to F round the outside, G1 and G2 across the middle, H, J and K above it (diagonal, vertical, diagonal) and L, M and N below. Source: Wikipedia, "Fourteen-segment display".
- **A real 20-digit starburst glass.** The Itron FIP20X1DB: a 20-digit alphanumeric VFD, 10 mm characters, its envelope 205 × 40 mm, probably made for a cash register or a point-of-sale pole display (Industrial Alchemy's listing of new old stock). Newhaven still lists single-line 14-segment VFD modules (M0116SY-161MSAR1 and M0116MY-161LSBR2-S2, 16 characters, "14 segment starburst"), descendants of the same glass.
- **Two lines of twenty.** Every 2 × 20 VFD module found (Futaba M202SD01LA, M202SD08HA, M202MD33AA; Newhaven M0220SD-202SDAR1; Noritake Itron CU20025) is a 5 × 7 or 5 × 8 dot matrix, with characters about 5 mm high (Futaba's module sheets give 4.8 to 8.9 mm). No 2 × 20 starburst glass was found in the datasheets reachable today: starburst glass was mostly made a line at a time, and two-line text went to dot matrix as it became cheap in the mid-1980s.

## The choice

The model is **a Futaba- or NEC-style 2 × 20 14-segment FIP glass of about 1982**: two rows of the single-line 20-digit starburst glass of the Itron FIP20X1DB and Futaba's alphanumeric tubes, on one envelope, at the 5 mm character height of the period's 2 × 20 modules so that it fits the Wash-O-Tron's display window. A two-row starburst glass was a custom order rather than a catalogue line, which suits a filter maker's own controller. It is drawn after the physics above:

- **Phosphor:** ZnO:Zn cyan-green, drawn `#5effc8` (about 505 nm seen through a cyan filter), with a dim grey-green ghost of every unlit segment: the phosphor is visible unlit through the glass, the period's giveaway.
- **Segments:** separate bars with rounded ends and gaps where they meet, as the anodes are printed; slanted a little, as many alphanumeric FIPs were.
- **Grid and filaments:** a fine mesh in a frame over each character; two hair-thin filaments a row across the whole width, a touch off level, between the glass and the anodes, so they move against the characters as the viewer moves.
- **Depth:** the anode plate 4.5 mm behind tinted front glass, the filaments 2 mm in front of it.
- **Power-on:** every segment lit for 0.8 s at power-on, as the period's controllers did on reset (a lamp test); off, dark glass with no ghosts. No source states this of a particular part; it is the common behaviour of segment-display controllers, recorded here as a choice.
- **Character set:** the 64-character upper-case set of the period's alphanumeric decoders, lower case folded to upper case; no colon, so times are written with a dash (`02-30`, the owner, 2026-11-02).

## Sources

- [Vacuum fluorescent display](https://en.wikipedia.org/wiki/Vacuum_fluorescent_display), Wikipedia: construction, phosphor, voltages, makers.
- [Fourteen-segment display](https://en.wikipedia.org/wiki/Fourteen-segment_display), Wikipedia: the segments and their uses.
- [FIP20X1DB VFD display](https://www.industrialalchemy.org/storearticleview.php?item=41), Industrial Alchemy: Itron's 20-digit alphanumeric glass, 10 mm characters, 205 × 40 mm.
- [Futaba M202SD01LA](https://www.mikrocontroller.net/attachment/448805/M202SD01LA.pdf) and [M202SD08HA](https://www.mikrocontroller.net/attachment/86950/M202SD08HA_-.pdf) datasheets: 2 × 20 VFD modules, 5 × 7 dots.
- [Newhaven M0116SY-161MSAR1](https://newhavendisplay.com/content/specs/M0116SY-161MSAR1.pdf): a single-line 14-segment VFD module (the PDF could not be read as text here; its listing gives the format).
