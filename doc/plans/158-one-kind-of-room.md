# 158: Registry affordances and census

The owner started mission 158 on 2026-11-04. The owner's project brief named in `AGENTS.md` was not present at `/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md` on this machine, and a filename search and connected Drive search found no copy; the mission brief and `README.md` provide the working requirements used here.

## Stage 1: typed declarations

`EquipmentKind.affordances` is an optional declaration on the existing `EQUIPMENT_KINDS` spine. `kindAffordances` resolves it into an explicit record for every `KindId`. The default interaction is `decorative` for a decorative kind and `inspect-only` otherwise; portable is false; solid is true; the shape is the object's bounds; the top surface follows solidity; seat is absent. A seat declaration gives its height in metres and may override the default local +z look direction. This is metadata only: room controllers and scene builders still use their existing wiring.

The defaults are provisional. In particular, an existing usable control still resolves to `inspect-only` until the owner approves its kind-level override. This deliberately exposes the difference between present wiring and proposed registry behaviour in the census without changing play.

## Stage 2: census

The census must enumerate all `EQUIPMENT_KINDS` and compare their proposed flags with observed room behaviour. It also needs a source inventory of every `createFirstPerson` starter and scene mark (`markUsable`, `userData.portable`, `declareSeat`, placement targets and surfaces, and collision), then a scene scan of every room to connect those marks to registered kinds and stable refs. The existing `?audit=look` room-build path and `scanScene` cover the room and marked-owner side. The report will distinguish an unregistered behaving object from an object whose kind cannot yet be resolved; neither is silently counted as decorative. It will name the room builder and mark source where the data supports it, and list unresolved joins for the owner's ruling.

The owner reviews the proposed flags and unresolved objects in the generated report before the approved flags are written into the registry. Only then can the unresolved count reach zero. The first stage unblocks mission 159 independently of that review.

## Verification

`equipment-kinds.test.ts` enumerates every registered kind and checks the resolved defaults, then checks an override including a seat and non-solid kind. The required repository checks run before each stage is committed.
