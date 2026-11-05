# 217: connect the custom domain to GitHub Pages

The owner, 2026-11-05. The domain `thepoolsimulation.xyz` is registered with Porkbun. Keep hosting the static website and game on GitHub Pages. This mission handles the domain configuration after [216](216-game-website.md) publishes the landing page and game route at the existing GitHub Pages project URL. A possible future backend would use `api.thepoolsimulation.xyz`; do not create or point that subdomain until a backend exists and has its own deployment brief.

## Purpose

Make `https://thepoolsimulation.xyz/` serve the landing page and `https://thepoolsimulation.xyz/game/` serve the game, with valid HTTPS. Preserve the existing GitHub Pages URL during the transition.

## Scope

- Inspect the current GitHub Pages publishing source and Porkbun DNS records before changing them. Confirm domain ownership and use GitHub's current custom-domain and DNS instructions at execution time rather than relying on copied IP addresses in this brief.
- Configure the GitHub Pages custom domain for the repository, then set the required apex-domain records in Porkbun. Decide whether `www.thepoolsimulation.xyz` should redirect to the apex; if used, configure it according to GitHub's guidance. Avoid wildcard DNS and unrelated changes.
- Wait for DNS and certificate issuance, enable or confirm HTTPS enforcement, and verify the root, `/game/`, direct game and room links, and the site's assets from the custom domain. Confirm the old GitHub Pages URL still reaches the site or redirects correctly.
- Keep `api.thepoolsimulation.xyz` available for a later active backend. This mission does not deploy an API, add an API DNS record, or move hosting away from GitHub Pages.

## Coordination

Mission 216 can be implemented and verified at the existing GitHub Pages URL without waiting for this mission. Begin the domain cutover only after its root page and `game/` route are deployed and checked. The owner has not supplied Porkbun CLI or API access in this session; use the authorized account interface or another approved access method when the DNS work begins.

## Acceptance

The custom-domain root and `/game/` load over HTTPS, including direct room links and assets. GitHub Pages reports the custom domain correctly, DNS resolves to the intended Pages site, and no backend or `api` subdomain is mistakenly published. Record the final DNS configuration and verification results without exposing credentials.

## Records

Keep `TODO.md` and `CHANGELOG.md` current when implemented. Follow [GitHub's custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) for the then-current setup and verify from outside the development machine.
