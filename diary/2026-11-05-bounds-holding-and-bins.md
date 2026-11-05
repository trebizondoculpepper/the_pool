# Development Diary Entry - 2026-11-05

## Context

| Time      | Branch | Commit   | Task                                                       |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| 08:57 UTC | main   | 21a76316 | Mission 208 stage 1: bounds models, the desk first         |
| 09:05 UTC | main   | fc99ccd8 | The desk just a desk; PC tower and monitor components      |
| 09:10 UTC | main   | dfd800d2 | The PC above the plane it stands on, its leads on the desk |
| 09:15 UTC | main   | fe6a20fd | Mission 205 first step: the bin-like trait, the skip, dev5 |
| 09:20 UTC | main   | d0feeea7 | Mission 189: a holdable kind carryable by its trait alone  |
| 09:45 UTC | main   | 717c2569 | Mission 181: a thing let go low over a top lands on it     |
| 09:50 UTC | main   | 8d270997 | Test: a thing whose middle is past an edge falls           |

Contributors: Claude Code (ahnaa_dmitrieva) and the owner.

## Problem Statement

The engineer's desk's derived top came out 0.62 m deep where the desk is 0.8 m, because rays cast down on its drawn model missed its front strip. The owner asked for a simpler parallel version of an object, beside its high- and low-poly ones, that a trait switches on. Looking at the desk's CAD views then showed the PC and monitor drawn as part of the desk, and the owner asked for the desk to be just a desk, and for nothing of the PC (above all its leads, splines in 3D) to go below the plane it stands on. The owner then assigned missions 189 (holdable), 181 (supportable) and 205 (bin-like) for the morning, refining 205 as work went on.

## Our Approach

Every change followed the registry rule: behaviour comes from a kind's traits, set through the audit command, and from what an object's own builder declares, never from a room naming an object. The owner settled the design one question at a time: bounds mode is a trait; a declared box is preferred but one is fitted when none is given; blocking from the side is its own `solid` trait, opt-out, implying supportable, with named opt-outs such as `open-frame` (mission 208 stage 2, not yet built). Each change was checked in the browser on the shared dev server as well as by tests.

## Implementation

- Bounds models (`core/logic/bounds-model.ts`, `core/views/bounds-model.ts`): a few boxes and cylinders an object's builder declares with `setBoundsModel`. The `bounds-model` trait makes `derived-surfaces.ts` take their tops through the object's world matrix and cast no rays. The item audit's CAD views gained a BOUNDS toggle over HIGH or LOW.
- The desk: `createDesk` builds the desk alone, with its bounds model (the whole 1.6 × 0.8 m board at 0.73 m). `pc-tower` and `pc-monitor` are registered kinds with their own CAD views. A magic builder marked `alone` is used for a kind even where a room places it inside an assembly, and the CAD views now wait for a model loaded from a file, so the desk's own model appears in them for the first time.
- The PC: the keyboard, tilted on its feet, sank 5.6 mm into the desk; a lead's Catmull-Rom spline swung 12 mm into it. `createLead` now takes the surface it lies on and clamps a resampled centripetal spline above it. A test checks every part and lead.
- Holdable (189): `makeHoldablesPortable` gives every thing of a holdable kind a plain carrying component, sized from its body, where its builder gave none, so the stores' spill kits and the control room's test kit can be picked up.
- Bin-like (205, first step): the `bin-like` trait, the `skip` kind (which marks its own inside with `markBin`), and `RoomTraits.bins`, which gives each room's controller one shared bin tossing for the bin-like objects it finds. dev5 no longer adds its skip by hand. What lands can be picked out again.
- Supportable (181): `controls/logic/support-landing.ts`. A support takes a falling thing whose bottom is above its top, or one let go over it with part of itself above the top; never one reached from the side; and only where the thing's middle is over it.

## Outcomes

- What worked: the trait route kept every change small. The spill kit became carryable, and the skip a bin, with no room code. Checking in the browser found real things the tests did not: the desk missing from its CAD views, and the PC's parts in the desk's.
- Challenges: the owner's design moved during the session, so work was withdrawn as well as added. A first target-plane trajectory for the bin toss was written and taken out at the owner's word; it became mission 209. "Vulnerable" in a dictated message was "holdable". The shared checkout's pull with `--autostash` again conflicted on `CHANGELOG.md` with another agent's uncommitted line. It was resolved by keeping both lines and unstaging their work, and every commit since has been built in a private index from `origin/main`.
- Learned: inserting an import after the first `import` line breaks a file whose first import spans several lines; put new imports at the top. In the shell rooms `place` stands the walker up, so crouch after placing; and the first click on the canvas only takes the pointer.

## Next Steps

- One full `npm test` and `npm run build` over the day's pushes, when the machine's slot is free, and the day's `TODO.md` and `CHANGELOG.md` lines when mission 207 frees those files.
- Mission 205: the dustbin kinds, and the repair room, skimmer reveal and Hall 5 onto the trait.
- Mission 208 stage 2: `solid`, `open-frame`, the walker's collision from bounds models, a BOUNDS toggle in the magic room, a fit test.
- Mission 181: refusing a put-down that would overhang by more than half; things moving with a top that moves; the owner's question on load limits.
- Mission 209, the throw's trajectory, once the owner has discussed it.
