# 216: a landing page for The Pool Simulation

The owner, 2026-11-05. The intended domain is `https://thepoolsimulation.xyz/` (recorded in `AGENTS.md`). The site's root becomes a short public introduction and the existing web game lives at `/game/`. This is a separate website mission from the phone and fault-scenario work.

## Purpose

A visitor should quickly understand that this is an engineering game about finding and fixing the many things that can go wrong in swimming-pool plant, see what it looks like, and have an obvious invitation to try it.

## Owner-approved content and look

- A concise headline and short explanation of the pool-engineering and fault-finding idea, with little text overall. Use the game's existing light blue, dark blue and yellow logo motifs.
- Screenshot-derived artwork from the game, a prominent **Play now** action linking to `/game/`, and a compact explanation of the activity: explore the plant, diagnose a problem, make the repair. A few captioned images may show the rooms and working instruments.
- A simple email-updates field using Mailchimp's hosted or embedded form, with confirmation and a short explanation of what subscribers will receive. The owner will set up the Mailchimp account; do not build a mailing-list backend for this mission. Keep the form integration replaceable if the list later moves elsewhere.
- A restrained footer with source/licence and contact or social links where real destinations exist. Do not invent a press kit, FAQ answers, social accounts or email address.

## Delivery

Keep the game's relative asset paths working when it moves from the site root to `/game/`; preserve direct game and room links and the local development workflow. The current deployment is GitHub Pages, so the build and hosting arrangement must publish both routes under the custom domain when DNS and GitHub Pages domain setup are complete. The domain line in `AGENTS.md` records intent, not proof that registration, DNS or Pages configuration is done. Do not redirect the public root to the game.

## Acceptance

At the site root, a desktop or phone visitor sees the pitch, game-derived artwork, matching colour palette, a clear `/game/` link and the simple updates form once the owner supplies Mailchimp details. `/game/` loads the existing game with working assets and direct links. The page has readable text and sensible image alternatives, and the form does not imply that it is live before its real Mailchimp destination is configured.

## Records

Keep `TODO.md` and `CHANGELOG.md` current when implemented. Use only screenshots and art with known project provenance; attribute any external media in `CREDITS.md`. Verify both routes after deployment, including on a phone.
