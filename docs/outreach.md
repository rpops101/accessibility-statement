# Outreach drafts

Per [seo-plan.md](seo-plan.md) §5, links and mentions move rankings far more
than on-page work in the first ninety days. **One link from a page that
already ranks beats a month of writing.**

These are drafted and ready to send. Send them yourself — they are personal
approaches to real people, and a form letter reads like one.

Two rules that apply to all of them:

- **Never claim the tool produces compliance.** It produces a draft for
  human review. Overclaiming to an accessibility audience is the fastest way
  to lose them, and this audience checks.
- **Lead with what is genuinely different**, not with a feature list. The
  differences that hold up: national formats in national languages, no
  email gate, and it runs client-side so nothing is uploaded.

---

## 1. DigitalA11Y generators roundup — highest value

**Why first:** the [roundup](https://www.digitala11y.com/accessibility-statement-generators-roundup/)
ranks on page one for "accessibility statement generator". A listing there
is worth more than months of content, and roundups are maintained precisely
because their authors want them complete.

**To:** the site's contact form, or the author's listed email.
**Subject:** `Open-source EU accessibility statement generator for your roundup`

> Hello,
>
> Your roundup of accessibility statement generators has been genuinely
> useful to me, and I think there is a gap in it I have just filled.
>
> I have released a free, open-source generator that differs from the tools
> currently listed in three ways:
>
> - It produces the statement in the **member state's national format and
>   language** — German, French, Spanish, Italian and Irish so far — with
>   the correct national enforcement body, verified against official
>   government sources. Every other generator I know of is generic and
>   English-only.
> - It also produces a **VPAT 2.5 / ACR in OpenACR format** and an
>   **Article 14 disproportionate-burden worksheet**, which nothing else
>   seems to generate at all.
> - It runs **entirely in the browser** — no upload, no account, no email
>   address. That is a property of how it is built rather than a policy: the
>   engine makes no network calls.
>
> It builds the statement from axe-core, pa11y or Lighthouse output plus a
> manual checklist, and it reports criteria it has not evaluated as
> unevaluated rather than assuming they pass.
>
> Try it: https://rpops101.github.io/accessibility-statement/generator/
> Source (MIT): https://github.com/rpops101/accessibility-statement
>
> Happy to answer anything, and no obligation at all if it is not a fit.
>
> Best,
> [your name]

---

## 2. W3C WAI tools list

**Why:** a `w3.org` link is about as strong a signal as this field offers,
and the project's posture — open source, standards-based, no overlay — is
exactly what they list.

**Where:** the WAI list of [evaluation tools](https://www.w3.org/WAI/test-evaluate/tools/)
has a submission form. Follow whatever it asks for exactly; curated lists
reject on process, not merit.

**Notes for the form fields:**

- **Purpose:** generates accessibility conformance documentation — an EU
  accessibility statement, a VPAT 2.5 / ACR in OpenACR format, and an
  Article 14 disproportionate-burden worksheet — from existing test results.
- **What it does not do:** it is not an evaluation tool. It consumes output
  from axe-core, pa11y and Lighthouse rather than performing testing itself.
  Say this plainly; it is what distinguishes the submission from an overlay.
- **Standards:** WCAG 2.1 and 2.2 levels A and AA, EN 301 549 v3.2.1.
- **Licence:** MIT.
- **Language support:** interface and output in English, German, French,
  Spanish, Italian and Irish.

---

## 3. awesome-a11y and similar curated lists

Low effort, durable links. Each is a pull request against a repository, so
read the contribution guidelines — most specify the exact line format and
reject anything else.

Suggested entry:

> [accessibility-statement](https://github.com/rpops101/accessibility-statement) — Generates EU accessibility statements, VPAT 2.5/ACR (OpenACR) and Article 14 disproportionate-burden worksheets from axe-core, pa11y or Lighthouse output. Per-country formats and languages. Runs offline.

Worth approaching: `awesome-a11y`, `awesome-accessibility`, and any
"awesome-eu-compliance" style list.

---

## 4. National accessibility communities

**Why this is the real prize:** the national-language terms are where there
is no competition, and these communities are where the people who search
them actually are. A German-language post about a German-language statement
generator reaches an audience no English-language competitor is speaking to.

Approach each in **its own language**, and lead with the country page rather
than the home page:

| Country | Link to lead with |
| --- | --- |
| Germany | `/de/` — names the MLBF and the Schlichtungsstelle BGG route |
| France | `/fr/` — names the DGCCRF and SignalConso |
| Spain | `/es/` — explains that enforcement is devolved to the autonomous communities |
| Italy | `/it/` — names AgID and the segnalazioni portal |
| Ireland | `/ie/` — explains the products/services authority split |

Do not machine-translate the post. The project has an AI-disclosure policy
for contributors, and posting machine-translated outreach to a community of
native speakers would be both obvious and against the spirit of it. If you
do not write the language, ask the pack contributor for that country — they
usually have the audience anyway, and being asked is a form of recognition.

---

## 5. Show HN

Covered in [launch-checklist.md](launch-checklist.md). The essentials:

- Title: `Show HN: Generate the EU accessibility statement the EAA requires, from your axe results`
- Link the repository, not a landing page.
- Position as **compliance and accessibility tooling, never as an AI tool.**
- Be present in the thread for the first few hours. Hacker News rewards the
  author answering questions, and the accessibility crowd there asks good
  ones — expect to be asked how this differs from an overlay, and answer
  that it is the opposite of one.

---

## What not to do

- **No paid links, guest-post farms or directory spam.** This is a
  compliance tool; being seen buying links is a credibility problem, not
  merely an SEO risk.
- **No approaching overlay vendors** for cross-promotion. Their reputation
  in this community would transfer to you, in the direction you do not want.
- **No mass mail.** Five careful, personal approaches will outperform fifty
  templated ones, and the accessibility community is small enough that
  people compare notes.
