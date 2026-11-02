import { describe, expect, it } from 'vite-plus/test';
import {
  COLD_DECK,
  RAVELLO,
  SAMPLE_DECK,
  deckFloor,
  deckReadouts,
  ovenHeight,
  proverDialTurn,
} from './pizza-oven';

describe('the Ravello D, after the Amalfi D datasheet', () => {
  it('stands 1850 mm to its hood on the 800 mm prover', () => {
    expect(ovenHeight()).toBeCloseTo(1.85, 6);
    expect(RAVELLO.prover + RAVELLO.base + 2 * RAVELLO.deck).toBeCloseTo(
      1.7,
      6,
    );
  });

  it('is 1670 mm deep, hood and duct included (the drawing says 1698 overall)', () => {
    expect(
      RAVELLO.depth + RAVELLO.hoodOverhang + RAVELLO.ductDepth,
    ).toBeCloseTo(1.67, 2);
  });

  it('has each handle 100 mm above its deck’s floor, as drawn', () => {
    expect(RAVELLO.handles[0] - deckFloor(0)).toBeCloseTo(0.102, 6);
    expect(RAVELLO.handles[1] - deckFloor(1)).toBeCloseTo(0.102, 6);
  });

  it('has room across its front for the stile, the door and the column', () => {
    const door = RAVELLO.width - RAVELLO.stile - RAVELLO.column;
    expect(door).toBeGreaterThan(RAVELLO.chamber.w);
  });
});

describe('a deck’s displays', () => {
  it('show the chamber, the set point and the two powers, a point lit while heating', () => {
    expect(deckReadouts(SAMPLE_DECK)).toEqual({
      chamber: '322',
      setPoint: '330',
      ceiling: '7.',
      floor: '5.',
    });
  });

  it('are blank while the main switch is off', () => {
    expect(deckReadouts(COLD_DECK)).toEqual({
      chamber: '',
      setPoint: '',
      ceiling: '',
      floor: '',
    });
  });

  it('keep the powers to 0–9 and the set point to the chamber’s 450 °C', () => {
    const r = deckReadouts({
      ...SAMPLE_DECK,
      heating: false,
      ceiling: 12,
      floor: -3,
      setPoint: 600,
    });
    expect(r).toMatchObject({ ceiling: '9', floor: '0', setPoint: '450' });
  });
});

describe('the prover’s thermostat', () => {
  it('turns three quarters of a turn from OFF to 65 °C', () => {
    expect(proverDialTurn(0)).toBe(0);
    expect(proverDialTurn(65)).toBeCloseTo(1.5 * Math.PI, 6);
    expect(proverDialTurn(100)).toBeCloseTo(1.5 * Math.PI, 6);
  });
});
