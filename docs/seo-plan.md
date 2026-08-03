# SEO and discovery plan

How people find `accessibility-statement`, in priority order, with the
reasoning behind each choice. Written 3 August 2026, against a live reading
of the search results rather than general advice.

The short version: **do not fight for the head term in year one.** Win the
EU-specific and national-language long tail, where there is currently no
competition at all, using content only this project can produce.

---

## 1. Hosting, at zero cost

**Decision: no domain purchase. The site is hosted free.** That is a
perfectly good position — it costs you nothing and gives up less than people
assume.

### What a free host actually gives up

A custom domain is worth something, but mostly later. What matters in the
first year is links, content and topical relevance, and none of those depend
on owning a domain. `github.io` and `github.com` carry substantial authority
that a new domain would take six to twelve months to approach from zero. For
a developer tool, a GitHub-hosted site can genuinely out-rank a brand-new
custom domain for the first year.

What you give up is a keyword in the URL and full control of the address.
Both are recoverable later: point a domain at the same site, keep every path
identical, and redirect. Do that once, deliberately, rather than drifting.

### The two free options

**GitHub Pages** — free, but **only for public repositories**. Pages on a
private repo needs a paid GitHub plan. Since the repository is going public
before launch anyway, this is the natural choice, and it puts the site and
the code at the same origin:

```
https://rpops101.github.io/accessibility-statement/
```

**Cloudflare Pages** — also free, and works with a **private** repository if
you want the site up before the code is public. Free tier includes unlimited
bandwidth and free TLS. Use this if you want to publish the site first and
open the repo later.

Either is fine. GitHub Pages is simpler and is what the deploy workflow in
this repository targets.

### The one thing that costs nothing and matters most

**Pick the final URL before you launch and do not move it.** Every inbound
link, every mention in a roundup, every Show HN comment points at whatever
address you used. Moving later leaks authority and breaks links. A free
`github.io` URL you keep is worth more than a custom domain you migrate to
badly.

If you later want a domain, `accessibilitystatement.eu` was unregistered as
of 3 August 2026 — exact-match, and the TLD states the differentiator. It is
around €10–20/year and would be the single highest-value purchase this
project could make. But it is an optimisation, not a prerequisite, and
nothing in this plan depends on it.

### Why not a subdomain of an unrelated site

A tempting free option is a subdomain of a domain you already own for
something else. It was considered here and rejected, and the reasoning
generalises:

1. **There is usually nothing to inherit.** The authority people expect a
   subdomain to borrow is largely topical. A domain about an unrelated
   industry carries no signal for accessibility compliance, so the
   subdomain starts from zero either way.
2. **A small site has little authority to lend.** A brochure site with no
   content engine has minimal authority even for its own subject.
3. **Provenance matters more than usual here, which is the real cost.** This
   tool generates documents with legal weight, and its central risk is
   credibility. A compliance officer checking where a generated statement
   came from should find a project that is obviously about accessibility
   compliance. Landing instead on an unrelated commercial business is the
   opposite of reassuring, and it weakens the NLnet framing, where the pitch
   is a public-good commons.

`github.io` has none of those problems and costs the same: nothing.

Such a domain does have one good use — a **staging host** for previewing the
site before it goes public, never linked and marked `noindex`.

## 2. What the search results actually look like

I searched the two queries that matter before writing any of this.

**"accessibility statement generator"** — the head term. Nine of the ten
results are commercial:

| Result | What it is |
| --- | --- |
| [Accessible Web](https://accessibleweb.com/accessibility-statement-generator/) | Vendor lead magnet |
| [DigitalA11Y roundup](https://www.digitala11y.com/accessibility-statement-generators-roundup/) | **A roundup post — a link target, see §5** |
| [Acquia](https://www.acquia.com/products/acquia-web-governance/tools/accessibility-statement-generator) | Vendor lead magnet |
| [Siteimprove](https://www.siteimprove.com/toolkit/accessibility-statement-generator/) | Vendor lead magnet |
| [AccessibilityChecker](https://www.accessibilitychecker.org/statement-generator/) | Vendor lead magnet |
| [UserWay](https://userway.org/accessibility-statement-generator/) | Overlay vendor lead magnet |
| [WCAG.ie](https://wcag.ie/accessibility-statement-generator/) | Consultancy |
| [W3C WAI](https://www.w3.org/WAI/planning/statements/generator/) | The authoritative generic tool |
| [eCampusOntario](https://ecampusontario.pressbooks.pub/accessibilitystatements/chapter/generate-an-accessibility-statement/) | Educational |

Read that as a competitive map, not a wall. Every one of those generators is
**top-of-funnel for a scanner or an overlay subscription**, and every one is
**generic and international**. The W3C tool is the honest one and is
deliberately jurisdiction-neutral.

**"EU accessibility statement generator EN 301 549"** — the results are
*entirely* explainer articles from the same vendors
([Deque](https://www.deque.com/en-301-549-compliance/),
[Level Access](https://www.levelaccess.com/compliance-overview/en-301-549-compliance/),
[Allyant](https://allyant.com/compliance/en-301-549/),
[Acquia](https://www.acquia.com/blog/european-accessibility-act-and-en-301-549-your-complete-compliance-guide),
[Applause](https://www.applause.com/blog/european-accessibility-act-en-301-549/),
[Wikipedia](https://en.wikipedia.org/wiki/EN_301_549)).
Guides about the regulation. **No tool.**

### The gap, stated plainly

Nobody generates a **national-format, national-language** EU accessibility
statement. Nobody generates a **VPAT/ACR** alongside it. Nobody produces a
**disproportionate-burden worksheet** at all. There is a large, well-funded
crowd competing for the generic English head term, and an empty field
everywhere else.

That is where to compete.

---

## 3. The three assets nobody else can copy quickly

### 3.1 A free generator that runs entirely in the browser

**Built — see `site/`.** `npm run site` produces it; `npm run site:check`
verifies it. The engine is bundled for the browser with esbuild, with the
Node built-ins the CLI paths use replaced by stubs.

This was the single highest-leverage thing to build, and the architecture
already allowed it: `@accessibility-statement/core` is pure JavaScript with
**one dependency and no network access at all**. It runs client-side
unchanged. No backend, no database, no hosting bill beyond static files.

Which produces a claim no competitor can make honestly:

> **Your test results never leave your browser.** No upload, no account, no
> email address, no tracking.

Every competing generator is a lead-capture form. Several are run by overlay
vendors whose products the accessibility community actively distrusts.
Refusing to gate the tool is both the ethical position and the marketing
position, and it is the thing people will link to.

Ship it with a visible "download the CLI to put this in CI" path, since the
recurring-value story is `check` in a pipeline, not a one-off document.

### 3.2 Twenty-seven country pages, in the local language

**Built.** One page per pack per language: `/de/` and `/de/en/`, `/fr/` and
`/fr/en/`, and so on — thirteen pages today, one more every time a pack
merges. Generated from `pack.yaml` at build time, so they cannot drift from
what the tool produces.

This is programmatic SEO, but it is **not** thin doorway content, and that
distinction is what keeps it out of trouble. Each page carries genuinely
distinct, verified, hard-to-source material:

- the national act transposing Directive (EU) 2019/882
- the actual enforcement body, with address and contact route
- the conciliation route where national law provides one
- penalties and transition dates
- the statement wording **in that country's language**
- a live generator preloaded with that jurisdiction

Every fact is already in the packs, already source-cited, and already
verified against official sources. Build the pages from that data so they
cannot drift from what the tool produces.

Two rules that keep this legitimate:

- **Never publish a page for a pack that does not exist.** An empty
  "Bulgaria" page with a "coming soon" is the thin content Google penalises,
  and it is dishonest to a user who needs a Bulgarian statement today.
  Publish the page when the pack merges. That also makes each new pack a
  visible reward for its contributor.
- **The local-language content must be the pack's real translation**, not
  machine-translated marketing copy. The project has an AI-disclosure policy
  in `CONTRIBUTING.md`; the site must hold to the same standard.

### 3.3 The deadline

The EAA has been enforceable since 28 June 2025, with the next deadline on
**28 June 2027**. Demand for this term grows monotonically until then and
spikes as it approaches. That is roughly ten months of rising search volume
from now — unusually favourable, and the reason to start publishing early
rather than waiting for the tool to feel finished.

---

## 4. Keyword strategy, in three tiers

### Tier 1 — start here, effectively uncontested (months 0–3)

Long-tail, regulation-specific, currently served by nobody:

- `EAA accessibility statement generator`
- `European Accessibility Act accessibility statement template`
- `EN 301 549 accessibility statement`
- `disproportionate burden assessment template` / `Article 14 disproportionate burden`
- `OpenACR generator`, `VPAT 2.5 generator open source`
- `accessibility statement from axe results`
- `accessibility statement CI` / `accessibility regression CI`

These have modest volume. They also have near-zero competition and very high
intent — somebody searching "Article 14 disproportionate burden template" has
a deadline and a lawyer asking questions.

### Tier 2 — the real prize (months 3–9)

**National-language terms.** Every competitor publishes in English only.
There are 27 member states whose compliance officers do not search in
English:

| Language | Terms |
| --- | --- |
| German | `Erklärung zur Barrierefreiheit erstellen`, `Barrierefreiheitserklärung Generator`, `BFSG Erklärung` |
| French | `déclaration d'accessibilité générateur`, `déclaration accessibilité RGAA` |
| Spanish | `declaración de accesibilidad generador`, `Ley 11/2023 accesibilidad` |
| Italian | `dichiarazione di accessibilità`, `AgID dichiarazione accessibilità` |
| Dutch, Polish, Portuguese, Swedish… | as packs land |

This is where the pack commons converts directly into search coverage, and
where a well-funded English-language competitor cannot follow without doing
the same 27-country legal research you have already started.

### Tier 3 — the head terms (months 9+)

`accessibility statement generator`, `VPAT generator`, `accessibility
statement`. Only attempt these once the site has links and topical authority.
Ranking here is a consequence of Tiers 1 and 2, not a starting point.

---

## 5. Where authority actually comes from at launch

Search rankings follow links and mentions. In the first ninety days these
matter far more than anything on the site itself.

**High value, do these first:**

1. **Get listed in the [DigitalA11Y roundup](https://www.digitala11y.com/accessibility-statement-generators-roundup/).**
   It ranks on page one for the head term. One mention in a roundup that
   already ranks is worth more than months of blogging. Email the author with
   the specific angle: the only open-source generator that produces
   *national* EU statements plus VPAT and burden documentation.
2. **Submit to the [W3C WAI](https://www.w3.org/WAI/) tools list.** A `w3.org`
   link is about as strong a signal as this field offers, and the project's
   posture — open source, standards-based, no overlay — is exactly what they
   list.
3. **`npm` and GitHub.** Both already carry keyword-rich descriptions and
   topics. These rank on their own for tool queries and cost nothing.
4. **Show HN**, per the launch checklist. Positioned as compliance tooling,
   never as an AI tool.
5. **`awesome-a11y` and similar curated lists.** Low effort, durable links.

**Medium value, ongoing:**

- National accessibility communities — the German, French and Spanish
  accessibility scenes each have active mailing lists and forums, and they
  are the people who most need the national packs.
- EU public-sector accessibility coordinators, who deal with statements
  constantly under Directive (EU) 2016/2102.
- Conference talks and podcasts in the a11y space.
- Each merged jurisdiction pack is a small announcement, and its contributor
  usually has a national audience you do not.

**Do not bother with:** paid links, guest-post farms, directory spam. This is
a compliance tool; being seen buying links is a credibility problem, not just
an SEO risk.

---

## 6. Technical SEO

Most of this is easy for a static site, so the bar is "get it right", not
"work hard at it".

**The non-negotiable one:** the site must itself pass axe-core with zero
violations, and should be measurably excellent — real headings, keyboard
support, visible focus, proper contrast. The project already enforces this
for generated artifacts; the marketing site failing it would be fatal to the
product's credibility, and any competitor would notice. Accessibility and
technical SEO also overlap heavily: semantic headings, alt text, and clean
document structure serve both.

**Internationalisation.** With 27 language variants, `hreflang` is the thing
most likely to be got wrong:

- `hreflang` on every country page, including a self-reference
- `x-default` pointing at the English landing page
- Every alternate must link back reciprocally, or Google ignores the set
- Language codes must be correct (`de`, `fr`, `ga`, and region subtags only
  where a genuine regional variant exists)

**Canonicalisation.** The README and the site will share content. Keep them
deliberately different: the README is for developers evaluating the code, the
site is for people who need a statement. Where content genuinely duplicates,
the site is canonical.

**Structured data.** `SoftwareApplication` for the tool, `FAQPage` for the
regulation questions, `HowTo` for the generator walkthrough. These earn rich
results and are cheap to add.

**Basics.** XML sitemap including every country page; `robots.txt`;
self-hosted fonts; no render-blocking JavaScript on the landing page; the
generator's JS loaded only on the generator route. A static site should reach
excellent Core Web Vitals with no tuning.

**Measurement.** Google Search Console and Bing Webmaster Tools from day one,
before launch, so you have baseline data. Privacy-respecting analytics only —
Plausible, GoatCounter, or none at all. A tool whose selling point is "your
data never leaves your browser" cannot ship Google Analytics.

---

## 7. Sequence

**Before launch**

- [x] Landing page, browser generator, and country pages for all six packs —
      built, in `site/`, verified accessible with no network egress.
- [x] Sitemap, robots.txt, canonical URLs, `hreflang`, and
      `SoftwareApplication` / `HowTo` structured data.
- [ ] **Make the repository public** and enable Pages
      (Settings → Pages → Source: GitHub Actions). The deploy job is written
      and waiting; Pages is free only for public repositories.
- [x] **Google Search Console verified**, via the HTML-file method. The
      verification file is committed at `site/public/`, so it survives
      rebuilds — deleting it un-verifies the property at Google's next check.
- [ ] Submit `sitemap.xml` in Search Console (18 URLs). This is the only
      working discovery route here: `github.io`'s robots.txt lives at the
      origin root, where a project page cannot write.
- [ ] Bing Webmaster Tools — it can import directly from Search Console, so
      it costs about five minutes. Bing also feeds DuckDuckGo.
- [x] **og:image added** — a committed 1200×630 PNG, wired into every page
      with `summary_large_image`.

**Months 1–3 — Tier 1**

- [x] **A page per Tier 1 term — done.** `/european-accessibility-act/`,
      `/en-301-549/`, `/disproportionate-burden/`, `/vpat-acr-openacr/` and
      `/from-axe-results/`, each with FAQ structured data and sources on
      official domains.
- [x] og:image, breadcrumbs, valid JSON-LD, resolving internal links — all
      verified in CI rather than assumed.
- [ ] **Outreach — drafted and waiting in [outreach.md](outreach.md).** This
      is now the highest-value remaining action by a wide margin. The
      DigitalA11Y roundup already ranks on page one for the head term; one
      listing there outweighs the five pages above.
- [ ] Show HN and the 48-hour launch window.

**Months 3–9 — Tier 2**

- A country page for every merged pack, in its own language.
- Ask each pack contributor to review their country page. They are the only
  person who can tell you whether it reads naturally, and it deepens their
  investment in the project.
- National-community outreach per language.

**Months 9+ — Tier 3**

- Comparison and reference content aimed at the head terms.
- Revisit and refresh the Tier 1 pages; regulation content decays as
  standards move, and EN 301 549 v4.1.1 lands in this window — that is both a
  content-refresh obligation and a news hook.

---

## 8. What to measure

In priority order, matching the project's own success metrics:

1. **Search Console impressions and clicks for Tier 1 and Tier 2 terms.**
   Impressions move first and tell you Google understands what you are about.
2. **Country-page traffic per pack**, which tells contributors their work is
   being used — the single most effective retention signal you can give them.
3. **Generator completions**, measured without tracking individuals: a
   counter of documents produced, nothing more.
4. **npm downloads of `@accessibility-statement/core`**, especially as a
   transitive dependency.
5. Rankings. Useful as diagnostics; a poor goal on their own.

Ignore vanity metrics. Stars and pageviews are telemetry, not targets.

---

## 9. What not to do

- **Do not gate the generator behind an email address.** It is the entire
  differentiator versus every incumbent, and the moment you add a form you
  become one of them.
- **Do not bulk-generate content with an LLM.** The project has an
  AI-disclosure policy for contributors; violating it on the marketing site
  would be hypocritical, and thin AI content is directly targeted by search
  spam policies. Programmatic country pages built from verified pack data are
  a different thing entirely — real, sourced, and human-reviewed.
- **Do not publish pages for jurisdictions with no pack.**
- **Do not adopt overlay-vendor marketing tactics.** The accessibility
  community is unusually alert to them, and its goodwill is worth more than
  any ranking.
- **Do not claim the tool produces compliance.** It produces a draft for human
  review. Say that everywhere, including in the meta description. It is
  legally safer and, with this audience, it is more persuasive than the
  alternative.

---

## 10. Cost and effort

| Item | Cost |
| --- | --- |
| Hosting — GitHub Pages (public repo) or Cloudflare Pages (private) | €0 |
| Analytics — GoatCounter is free for non-commercial use, or ship none | €0 |
| Search Console, Bing Webmaster Tools | €0 |
| Domain — optional, deferred | €0 |
| **Total** | **€0** |

Nothing in this plan requires spending money. The only paid item ever worth
considering is a domain, and that can wait until the traffic justifies it.

At eight hours a week, a realistic split is roughly two hours on content, one
on outreach, and the rest on the tool. Outreach is the part most often
skipped and the part that actually moves rankings early — a single link from
a page that already ranks beats a month of writing.

---

## Summary

- **Do not host on a subdomain of an unrelated site**, even a free one. The
  topical mismatch gains nothing and the provenance damages a compliance
  tool's credibility. `github.io` costs the same and has neither problem.
- **Host free on GitHub Pages**, which requires the repository to be public —
  it is going public before launch anyway. Cloudflare Pages is the free
  option if you want the site up while the repo is still private. Decide the
  URL before launch and never move it.
- **Do not fight for "accessibility statement generator" in year one.** It is
  saturated by well-funded vendor lead magnets.
- **Win the EU and national-language long tail**, where the search results
  currently contain explainer articles and no tool at all.
- **Build the free in-browser generator.** The engine already runs offline
  with one dependency, so it runs client-side, costs nothing to host, and
  supports a privacy claim no competitor can match.
- **Turn the 27 packs into 27 local-language country pages.** That is the
  defensible asset, and it grows every time a contributor ships a pack.
