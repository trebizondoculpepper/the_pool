import { describe, expect, it } from 'vite-plus/test';
import { ROOMS } from '../../toolkit/gallery/logic/dev-room-links';
import { ROOM_IDS } from './declarations/index';
import { ROOM_REGISTRY, registryProblems, worldRoomOf } from './registry';

describe('the room registry (#102)', () => {
  it('is sound: index and files agree, ids match, shared worlds resolve', () => {
    expect(registryProblems()).toEqual([]);
  });

  it('registers every room the game can open, and no other', () => {
    expect([...ROOM_IDS].sort()).toEqual([...ROOMS].sort());
  });

  it('builds a room that shares a world as the room it shares', () => {
    expect(worldRoomOf('dev60')).toBe('dev59');
    expect(worldRoomOf('CR_A_STEPS')).toBe('CR_A_ARCH');
    expect(worldRoomOf('dev59')).toBe('dev59');
  });

  it('finds problems in a broken registry', () => {
    const room = (id: string, extra = {}) => ({
      default: {
        id,
        build: { kind: 'module', module: 'm', start: 's' },
        ...extra,
      } as never,
    });
    expect(
      registryProblems(
        {
          './a.ts': room('b'),
          './c.ts': room('c', { sharesWorldWith: 'zz' }),
          './d.ts': room('d', { traits: [{ trait: 'nope' }] }),
        },
        ['c', 'a', 'x'],
        [],
      ),
    ).toEqual([
      './a.ts declares b, not a',
      'x is indexed but has no file',
      'd has a file but is not indexed',
      'the index is not sorted',
      'c shares an unregistered zz',
      'd names an unregistered room trait nope',
    ]);
  });

  it('names a builder for every room', () => {
    for (const room of Object.values(ROOM_REGISTRY))
      expect(['module', 'plant-hall-shell']).toContain(room.build.kind);
  });
});
