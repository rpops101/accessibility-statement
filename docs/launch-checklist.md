# Launch checklist

Distribution and launch steps that are *process*, not code. Kept in the
repository so they survive a gap in attention.

## Before making the repository public

- [ ] **Validate the name.** `eaa-kit` is a working name. Check npm
      availability for `eaa-kit`, `@eaa-kit/core` and `@eaa-kit/packs`;
      check for trademark collisions; and apply **the search test** — someone
      googling *"EU accessibility statement generator"* or *"VPAT generator
      open source"* should land on it. Name for the query, not for the pun.
      Renaming after launch costs far more than an hour of deliberation now.
- [ ] Record the README demo. A short screen capture of `init` →
      `render statement` → the rendered German statement, placed **above the
      fold**. This is the single highest-leverage asset in the repository:
      most visitors decide from it alone.
- [ ] Fill in the maintainer handle in `MAINTAINERS.md` and `.github/CODEOWNERS`.
- [ ] Create the labels the seeded issues use: `pack`, `reader`, `i18n`,
      `docs`, `data`, `standards`, `core`, `good first issue`, `help wanted`,
      `legal-accuracy`, `priority`.
- [ ] Seed the backlog: `node scripts/seed-issues.mjs` (55 issues, 51 of them
      good-first-issues). Do this **before** launch — an empty issue tracker
      converts nobody.
- [ ] Re-verify every pack's enforcement body against its official source and
      update `enforcement.verified`. Silver quality claims this is current.
- [ ] Publish the packages: `npm publish --workspaces --access public`.
- [ ] Publish the Action to the GitHub Marketplace, and tag `v1` so
      `eaa-kit/action@v1` resolves.

## Launch window

Everything inside one 48-hour window; a launch spread over two weeks reads as
no launch at all.

- [ ] **Show HN**, titled:
      `Show HN: eaa-kit – generate the EU accessibility statement the EAA requires, from your axe results`
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
3. Downloads of `@eaa-kit/core`, particularly as a transitive dependency of
   another testing tool
4. Stars — telemetry, not a target

The first number is the one that decides whether this project outlives its
first maintainer.
