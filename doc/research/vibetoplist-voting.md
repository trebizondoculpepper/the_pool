# VibeTopList listing and vote buttons

Research checked 2026-10-31 against VibeTopList's [FAQ](https://vibetoplist.com/faq), [API documentation](https://vibetoplist.com/api-docs), [home page](https://vibetoplist.com/) and [registration page](https://vibetoplist.com/register). The earlier project note in `diary/2026-10-24-itch-sounds-and-electric-valves.md` recommended a public vote link until the game has a listing, player accounts and a server.

## What the service offers

A listing is free. The [FAQ](https://vibetoplist.com/faq) asks for a real game URL, description and a banner of exactly 728 × 90 pixels, GIF/PNG/JPG and at most 10 MB; it says listings publish on submission. The [home page](https://vibetoplist.com/) says the first three listings on an account go live immediately and later ones may be reviewed, so allow for moderation in the submission workflow. The existing itch.io banner is 1920 × 640, a different aspect ratio, so the listing needs its own banner rather than a simple resize.

Players vote at `https://vibetoplist.com/vote/<listing-slug>` on VibeTopList's own page, where they press Vote and complete its Cloudflare Turnstile challenge. The limit is one vote per IP per listing every 12 hours; monthly rankings reset on the first at 00:00 UTC, while all-time totals remain. The optional `?ref=<player>` is returned in a callback for rewards; this game has no player accounts to supply it. [FAQ](https://vibetoplist.com/faq), [API documentation](https://vibetoplist.com/api-docs).

The [callback API](https://vibetoplist.com/api-docs) sends POST and GET requests to a creator-owned endpoint after voting, with a callback secret, voter IP, player reference and unique vote ID. The pull and claim APIs require a private API key. Those contracts are for verified in-game rewards and need a trusted server, durable player identity and deduplication. A static browser game must not put either secret in its client bundle. The site also has a public listing JSON endpoint for rank and counts, but a checked response did not include an `Access-Control-Allow-Origin` header, so direct browser fetching from this game should not be assumed to work.

I found no project report beyond the diary note, and no configured VibeTopList listing slug in the repository. A check of the public listing JSON endpoint for the candidate slug `the-pool` returned 404 on 2026-10-31; this does not rule out a listing under another slug.

## Proposed first release

Suggested listing fields: title **The Pool**; category **Simulation**; game URL `https://salimfadhley.itch.io/the-pool`; tags **AI-Assisted**, **In-Browser**, **Single-Player** and **Free** if the submission form offers them. Draft short description: “Run the hidden machinery behind a British leisure centre. Walk from serene pool halls into working plant rooms, read real instruments and keep the water clean, warm and safe.” The 728 × 90 banner should use the approved logo and a strong pool/plant image, with no tiny copy.

1. Create a dedicated 728 × 90 banner from the approved _The Pool_ logo and a game screenshot, and prepare the listing copy. Register or sign in, submit one listing using the canonical [itch.io game URL](https://salimfadhley.itch.io/the-pool), then record the actual listing and vote URLs in a single project constant. Account creation and final submission are separate from this proposal.
2. Add a fifth illuminated `VOTE` button to the title panel's `TITLE_OPTIONS` and its keyboard, gamepad and accessible menu paths. Its action opens the actual public vote URL in a new browser tab from the press gesture, with a clear external-site label and `noopener` protection. Leave the current game and save untouched.
3. Add a `VOTE` push-button module to the Esc panel's GAME zone, using one of the panel's currently blank rack positions where the layout permits. The rack layout computes blanking plates from the declared modules, so the new button should be a real module rather than a click handler on a decorative blank. Update the panel's accessible mirror and plain-menu fallback with the same action. A player can then vote during play and return to the still-running game.
4. Show a static button label, with no vote count, countdown, reward, or claimed state. VibeTopList enforces its own cooldown and informs the voter there. Test the link from the title, in-game Esc menu, itch.io iframe and desktop build, including keyboard, touch and gamepad activation.

The first release needs only a public URL and no network call or player data from the game. If the game later gains accounts and a server, a separate feature could use `?ref`, a verified callback and idempotent reward handling. Do not infer a successful vote merely because a player returns to the game: the vote may have been rejected or abandoned.

## Decision needed before implementation

Use the canonical itch.io page as the listing's game URL, then use the actual slug assigned by VibeTopList. The owner can decide later whether a voting reward is worth adding; it is outside this first release.
