import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../world';
import { INSTALLED_VALVES, installedValveOpen } from './installed-valves';
import { olympicFlowsOf } from './olympic-battery';

/**
 * Draining the Olympic's balance tank (the owner, 2026-10-25): its pumps'
 * drain (PL2-P1-DV1) to the backwash floor channel and so to the wet
 * hall's holding tank, and that emptied to the sewer by its pumps.
 */
const id = (tag: string) =>
  Object.values(INSTALLED_VALVES).find((v) => v.tag === tag)!.assetId;

describe('draining the Olympic’s balance tank', () => {
  it('is shut in service', () => {
    expect(olympicFlowsOf(newWorld()).drain).toBe(0);
  });
});

describe('Olympic tank floor drain', () => {
  it('is closed by default, including older saves missing its new key', () => {
    const w = newWorld();
    expect(w.installedValves[id('PL2-T1-DV1')]).toBe(false);
    expect(installedValveOpen({}, 'PL2-T1-DV1')).toBe(false);
  });
});
