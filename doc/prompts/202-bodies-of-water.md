# 202: Bodies of water: falling in, wading and swimming

The owner, 2026-11-04. **A discussion brief, not for implementation yet:** it records the design as it is settled, one question at a time. Read `AGENTS.md` (no falling more than 1 m; not a platforming game), mission 175 (derived surfaces) and the trait rules (172, 177–201).

## Why (the owner)

"This is a game about swimming pools, and you might fall into a body of water." Swimming is not an important gameplay element; it should be at least slightly plausible when it happens.

## The trait

A new trait for bodies of water (a name such as `water-body`, in a new volume facet), on the kinds that hold water the player can enter: the pool basins and the Jacuzzi. Its gameplay reason: the player may end up in it, and what happens then follows from it. The pools are room architecture today, not registered kinds; under the registry rule each basin becomes a kind carrying the trait.

- **Its water level** is a plane: from the world state where the model knows the level, else the water mesh.
- **Its depth** comes from its floor, a derived surface (175's ray casting on the basin), so shallow and deep ends need no configuration.

## Entering the water (proposed)

When the walker leaves a surface over water, with fall height = the height left − the water level, and depth = water level − floor below:

1. **Shallow** (depth up to about chest height, 1.2 m): no real fall; the walker stands on the pool floor and **wades**, slower, head well above the water (the owner's exception: no distance to fall).
2. **Deeper:** the walker **swims**: head above the water level, at swimming speed (about 0.8 m/s against 1.4 m/s walking), bobbing gently.
3. **From a height** (more than about 1 m): a brief **submersion**, deeper the higher the fall (capped by the depth), then bobbing back up over about a second; an underwater tint and muffled sound while under.

The pool edge is a drop of under 1 m to the water, so walking off it is allowed; a higher drop is only ever into water. No jumping, diving, drowning, breath limits or underwater swimming.

## Getting out (the owner, 2026-11-04)

A simplified rule, as games have it, decided by whether the walker can stand where it is:

- **Shallow enough to stand** (the Jacuzzi, the foot bath, the lazy pool, a pool's shallow end): the walker clambers out over any edge, as onto a low step.
- **Too deep to stand:** the walker swims to a ladder or the steps (ladder zones already), or, perhaps, clambers out slowly over the edge; which, the owner has not decided.
- **Later, with climbing and clambering** (not yet designed, anywhere): one general rule for clambering over an edge, decided by the walker's camera height relative to the edge, in water as on land; the rule above is its first, simplified form.

## Still to discuss

- Out of deep water: a slow clamber over the edge, or only ladders and steps.

- Whether the player's state changes when wet (dripping, footsteps), with the material trait (201).
- What the view and sound do while submerged.
- Which water counts: pools and the Jacuzzi; never a tank's interior (its walkable roof's edges stop the walker).

## Records

When the design is settled: a plan, `TODO.md`, and missions for the trait and its behaviour.
