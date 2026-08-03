# Launch checklist

Distribution and launch steps that are *process*, not code. Kept in the
repository so they survive a gap in attention.

## Before making the repository public

- [x] **Name chosen and availability confirmed, 3 August 2026.** The project
      is `accessibility-statement`, with `a11y-statement` as a short CLI
      alias. `accessibility-statement`, `@accessibility-statement/core` and
      `@accessibility-statement/packs` were all free on npm; claim the scope
      when you first publish.
- [ ] **Trademark check.** Not done. "EAA" is a common initialism; a quick
      search of the EUIPO register before launch is cheap insurance.
- [x] **The search test — addressed by the rename.** The package name is now
      the head search term itself. The README H1 is "Accessibility Statement
      Generator", supplying the verb, and the npm descriptions and keywords
      carry the long tail: *VPAT generator*, *ACR*, *OpenACR*,
      *EN 301 549*, *European Accessibility Act*.
- [ ] **Add GitHub repository topics** — GitHub topics are indexed and are
      free discovery: `accessibility`, `a11y`, `accessibility-statement`,
      `vpat`, `wcag`, `en-301-549`, `european-accessibility-act`,
      `compliance`, `openacr`.
- [ ] **Trademark still unchecked** for the new name too, though a
      descriptive phrase is far harder for anyone to claim than a coined one.
- [ ] **Decide the final home.** Everything points at
      `github.com/rpops101/accessibility-statement`, which is where the code
      lives. The `accessibility-statement` GitHub organisation was unclaimed
      as of 3 August 2026 if you want the project to live there instead;
      GitHub redirects old URLs after a transfer, but update them in the
      source anyway so clones and npm pages are not one hop behind.
- [x] **README hero image — done.** `docs/assets/demo.svg` shows the terminal
      session beside the statement it produces, above the fold. Regenerate
      with `npm run gen-demo` if the CLI output changes. It is deliberately
      static: GitHub may strip `<style>` from an SVG, and several renderers
      freeze CSS animations at t=0, which would show an empty terminal.
- [ ] Optional: record a real screen capture for the launch post. The static
      hero covers the README; a short video is better on social channels,
      and only a human with a screen recorder can make one.
- [ ] Fill in the maintainer handle in `MAINTAINERS.md` and `.github/CODEOWNERS`.
- [ ] Create the labels the seeded issues use: `pack`, `reader`, `i18n`,
      `docs`, `data`, `standards`, `core`, `good first issue`, `help wanted`,
      `legal-accuracy`, `priority`.
- [ ] Seed the backlog: `node scripts/seed-issues.mjs` (55 issues, 51 of them
      good-first-issues). Do this **before** launch — an empty issue tracker
      converts nobody.
- [x] **Enforcement bodies verified against official sources on 3 August 2026**
      for all five launch packs plus the EU pack, and several were wrong —
      see the commit history. `enforcement.verified` is set accordingly.
      Re-verify before launch if that date has gone stale; the monthly
      `pack-links` workflow catches dead and moved URLs in the meantime, but
      it cannot tell you a live URL points at the wrong organisation.
- [ ] Publish the packages: `npm publish --workspaces --access public`.
- [ ] Publish the Action to the GitHub Marketplace, and tag `v1` so
      `rpops101/accessibility-statement/action@v1` resolves.

## Launch window

Everything inside one 48-hour window; a launch spread over two weeks reads as
no launch at all.

- [ ] **Show HN**, titled:
      `Show HN: accessibility-statement – generate the EU accessibility statement the EAA requires, from your axe results`
      Link the repository, not a landing page.
- [ ] Post to accessibility communities (web-a11y Slack, WebAIM list,
      relevant Mastodon and LinkedIn groups), EU-developer communities, and
      the r/accessibility and r/webdev subreddits where their rules allow.
- [ ] Position it as **compliance and accessibility tooling — never as an AI
      tool.** AI framing carries a measured category penalty on Hacker News
      in 2026, and this is not an AI tool.
- [ ] Have review capacity that week. The launch window is when the first
      contributors arrive, and the 24-hour reply promise matters most exactly
      then.

## Funding calendar

- [ ] **NLnet** — the window opens **3 September 2026**, deadline
      **3 November 2026**. Needs the repository public with the launch packs
      in place. The strongest framing is the pack commons: a public good that
      no vendor will crowdsource.
- [ ] **GitHub Secure Open Source Fund** — rolling, $10k. The security
      posture (no network, one dependency, logic-less templates) is the
      argument, and it is already true.
- [ ] **Hacktoberfest, October 2026** — opt in **only** with the backlog in
      place and daily review capacity for the month. See MAINTAINERS.md.
- [ ] **Claude for Open Source**, community-builder track — apply once the
      contributor count is real, not projected.

## What success looks like, in priority order

1. Unique external contributors with merged pull requests
2. Pack coverage across the 27 member states
3. Downloads of `@accessibility-statement/core`, particularly as a transitive dependency of
   another testing tool
4. Stars — telemetry, not a target

The first number is the one that decides whether this project outlives its
first maintainer.
