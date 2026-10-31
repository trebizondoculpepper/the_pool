# Development Diary Entry - 2026-10-31

## Request

The owner wanted a BOOST button on the pit pump console that starts both pumps together and shuts itself down when the pit falls below its low level. The faster discharge intentionally exceeds the sewer consent. An in-game fine email was left for later.

## Implementation

The panel's illuminated BOOST button commands a one-shot boost state in the world. The existing STOP float is the low-level cutoff. While BOOST is active, both pumps that are not selected OFF run, giving a combined 20 m³/h through the existing discharge valve. Normal HAND/AUTO operation still interlocks to one pump. The sewer outfall's flowmeter, recorder and over-consent alarm read the increased flow from the world. The save version advances to 63 with the new state defaulting off for older saves.

## Verification

Focused tests cover both pumps starting, low-level release, faster pump-down, selector OFF, recorded sewer over-use and save migration.
