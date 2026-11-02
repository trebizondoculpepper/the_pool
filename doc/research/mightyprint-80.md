# The Gateway 3000 MightyPrint 80: the Epson FX-80 it is modelled on

The owner (2026-11-02): put the line printer in dev68 and re-model it as an Epson FX-80; in our world it is a Gateway 3000 MightyPrint 80. Earlier: "The paper effect is excellent, but the design of the printer looks trash", and borrow the design of the popular printers of the era. This note records what the model takes from the FX-80 and where each figure comes from.

## Sources

- **[M]** Epson America, _FX-80 Printer User's Manual_, by David A. Kater, 1983 (P8294014-0), as scanned on bitsavers: `https://ftp.mirrorservice.org/sites/www.bitsavers.org/pdf/epson/printer/P8294014-0_FX80_Users_Manual_1983.pdf`. Read 2026-11-02 from its text layer. Page numbers below are the manual's own.
- **[P]** Photographs of surviving FX-80s, as remembered rather than measured: the putty-beige case with darker trim, the smoked brown lid, the maker's name at the front left. No catalogue photograph was found in this session (the Computer History Museum's Epson publicity folders, catalogue 102774508, are not described online). These colours are the model's choice, not a measured fact.

## Figures used

- **Size and weight** [M, p. 304, Appendix N]: 100 mm high × 420 mm wide × 347 mm deep; 7.5 kg, the tractor unit 0.5 kg more. The model's case is 420 × 347 × 100 mm (`MIGHTYPRINT_SIZE`).
- **Print** [M, p. 303]: 9-pin impact dot matrix; 160 characters a second; bidirectional, logic seeking; 80 columns of pica (2.1 × 3.1 mm characters), 10 to the inch; a line every sixth of an inch by default; paper feed about 150 ms a line. The model prints at 160 characters a second, seeks the nearer end of each line, feeds a line in 0.15 s, and draws its type at 10 to the inch and 6 lines to the inch.
- **Buffer** [M, pp. xvii–xviii]: 2K of RAM, used as an input buffer of "up to 2K of text and printer commands". The model holds 2048 bytes, each line costing its characters and CR LF.
- **Paper** [M, pp. 3, 7, 304]: standard 9½ × 11 in fanfold with ½-inch tear-off strips for the pin-feed holes; built-in pin (sprocket) feeders set to 9.5; paper width 9.5 to 10 in without the optional tractor. The model's paper is 9½ in wide, folded every 11 in (66 lines), its holes every ½ in in its strips.
- **Paper path** [M, pp. xxv, 9–10, Figure 1-7]: "Set a stack of paper on a flat surface directly behind or under the printer"; the paper runs under the plastic guide and under the paper roller, round the platen, and "should flow over the plastic guide to form a second stack"; the "plastic paper separator" keeps the incoming paper from the outgoing. The printer is supplied with "a smoke-colored plastic paper guide". The model feeds from a box on the stand's lower shelf, up through a slot behind the printer into its pin feeders, round the platen, out of the top over the smoked separator and down behind the stand to a pile on the floor.
- **Covers** [M, p. 4]: two covers, a rear cover that lifts off and a front lid that swings to vertical; the paper bail has three positions [M, p. 5]. The model has the beige rear cover, the smoked lid over the mechanism (through which the head is seen), and the bail with its rollers.
- **Controls** [M, pp. 2, 18, Figure 1-1]: on the top panel, the buttons ON LINE, FF (FORM FEED) and LF (LINE FEED), and the lamps POWER, READY, PAPER OUT and ON LINE. On power-up "you get a little dance from the print head" and POWER, READY and ON LINE light. "The FF (form feed) and LF (line feed) buttons have no effect when the printer is on line"; off line, LF feeds a line and FF feeds to the same relative position on the next form (top of form is where the paper stands at power-up). The model's panel is at the front right of the top deck, as on the FX-80, its keys and lamps worked exactly so.
- **Platen knob** [M, p. xxv, Figure 1-6]: "the paper advance knob on the right side of the printer". The model's knob is on the right side and turns with the platen.
- **Power switch** [M, pp. 14, 18]: "the switch on the left side of the printer". The model's rocker is on the left side, near the front.
- **Vent and switches** [M, p. 14]: the DIP switches are "under the upper-right vent". The model has a slotted vent at the top right rear (the switches themselves are not modelled).
- **Connector** [M, p. 17]: the interface connector is "at the left rear of the printer ... out of the paper path". The model has a Centronics-style connector at the left rear.
- **Ribbon** [M, p. 5]: a cartridge across the mechanism, in front of the print head. Modelled as a black cartridge across the well.

## Choices made

- **Off line, it holds**: lines sent while it is off line wait in its 2 KB buffer and print when it goes back on line; a line that will not fit is lost and counted (the alarm logger does not retry). The real FX-80 signals BUSY and the host waits; our alarm logger has no queue of its own, so the printer's buffer is where the waiting happens.
- **It finishes the line in hand** before going off line.
- **PAPER OUT never lights**: the stock is endless in the game, so the lamp is fitted and dark. Running out of paper is a possible later feature.
- **FORM FEED's run**: the FX-80's manual gives no figure for a form feed's speed; the model takes 0.05 s a line (3.3 s a form), an estimate.
- **Paper to the rear**: the FX-80's manual sends the printed paper back over the separator. The text is upright to someone standing in front, as it rises out of the lid, and falls behind the stand. The old teleprinter's paper fell to the front; dev0's test board, where the board is behind the printer, still sends it forward over the lid (`drape: 'front'`), with its box of stock behind the printer on the ledge ("directly behind").
- **Sound**: no recording of a dot-matrix printer is in the game's assets; the head's rasp and the feed motor are synthesised for now (`parts/mightyprint.ts`). A recording is a follow-up.
- **The brand**: Gateway 3000 already made the engineer's period PC (`site-dressing/views/period-pc.ts`). It is now a brand of its own in `brands.ts` (mark `carton`, the PC's cow-spotted carton, drawn by `core/views/cow-carton.ts`), so the printer carries the same badge.
