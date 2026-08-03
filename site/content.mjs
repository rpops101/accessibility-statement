/**
 * Reference pages.
 *
 * These target the search terms identified in docs/seo-plan.md as
 * uncontested: the regulation-specific long tail, where the search results
 * currently hold vendor explainers and no tool. They are written to be
 * genuinely useful reference material first — a page that only exists to
 * rank is both worse content and, since 2024, worse SEO.
 *
 * Rules for anything added here:
 *   - Every legal claim carries a source. Link the instrument itself, on an
 *     official domain, not a vendor's summary of it.
 *   - Never state or imply that the tool produces compliance. It produces a
 *     draft for human review.
 *   - `faq` entries become FAQPage structured data, so they must be real
 *     questions with real answers, not keyword bait.
 *
 * `body` is a function of the site's link helper so pages can link each
 * other without hard-coding the base path.
 */

export const CONTENT_PAGES = [
  /* ---------------------------------------------------------------- */
  {
    slug: 'european-accessibility-act',
    title: 'What the European Accessibility Act requires in an accessibility statement',
    description:
      'The European Accessibility Act has been enforceable since 28 June 2025. What an accessibility statement has to contain, who must publish one, what the 2027 deadline covers, and how the requirement differs from the Web Accessibility Directive.',
    heading: 'What the European Accessibility Act requires in an accessibility statement',
    lede:
      'Directive (EU) 2019/882 has been enforceable since 28 June 2025. This is what it asks of the document, in plain terms, with the sources.',
    faq: [
      {
        q: 'Does the European Accessibility Act require an accessibility statement?',
        a: 'It requires service providers to publish information about how the service meets the accessibility requirements, in an accessible format, and to keep it as long as the service is offered. Annex V of Directive (EU) 2019/882 sets out what that information covers. In practice this is published as an accessibility statement, and most member states have built on the model statement already established for public-sector bodies by Commission Implementing Decision (EU) 2018/1523.',
      },
      {
        q: 'Who has to publish one?',
        a: 'Providers of the services listed in Article 2 — e-commerce, consumer banking, e-books, electronic communications, passenger transport information, and access to audiovisual media services — where they operate in the EU. Microenterprises providing services (fewer than 10 people and at most 2 million euro annual turnover) are exempted from the obligations by Article 4(5), though the exemption is narrower than it first appears and is worth checking with counsel.',
      },
      {
        q: 'What is the 28 June 2027 deadline?',
        a: 'Article 32 allows service contracts concluded before 28 June 2025 to continue unchanged until they expire, and no later than 28 June 2030, and allows self-service terminals in use before that date to run to the end of their economic life. The commonly cited 2027 date is when the transitional room for many arrangements closes in practice. Individual member states express these dates slightly differently in their own transposing law — Germany, for example, writes the 2030 date as 27 June.',
      },
      {
        q: 'Is this the same as the Web Accessibility Directive?',
        a: 'No, and they stack rather than replace each other. Directive (EU) 2016/2102 covers public-sector websites and mobile apps. The European Accessibility Act covers named private-sector products and services. An organisation can fall under both, and several member states apply different enforcement bodies to each.',
      },
    ],
    body: (u) => `
<h2>What the document has to contain</h2>
<p>Annex V of the Directive frames this as information about how the service meets the accessibility requirements. Read alongside the model statement that member states already use, that resolves to a document with these parts:</p>

<ul>
  <li><strong>A compliance status</strong> — fully compliant, partially compliant, or not compliant. Stating "partially compliant" honestly is a normal and acceptable outcome; overclaiming is the risk.</li>
  <li><strong>The non-accessible content</strong>, described specifically, with the requirement each part fails. Referencing the <a href="${u('/en-301-549/')}">EN 301 549 clause</a> is what makes this checkable rather than a gesture.</li>
  <li><strong>Anything excluded</strong> under a <a href="${u('/disproportionate-burden/')}">disproportionate-burden assessment</a>, and the alternative offered where one exists.</li>
  <li><strong>How the statement was prepared</strong> — self-assessment or third-party evaluation — and the date.</li>
  <li><strong>A feedback mechanism</strong>, so a user who cannot use the service can tell you and request the content another way.</li>
  <li><strong>The enforcement route</strong>, naming the body a user can escalate to if you do not respond adequately.</li>
</ul>

<p>That last point is where generic generators fall down, and it is not a detail. The competent body differs by member state and often by sector within a member state. Ireland designates different authorities for e-commerce, telecoms, banking and transport. Spain devolves enforcement to the autonomous communities. Germany gives consumers a conciliation route before the market surveillance authority. A statement that names the wrong body sends a real complaint to an organisation that cannot act on it.</p>

<div class="note">
  <p>The <a href="${u('/#countries')}">country pages</a> record the verified enforcement body for each jurisdiction this tool supports, with the sources and the date each was last checked.</p>
</div>

<h2>What "accessible format" means for the statement itself</h2>
<p>The information has to be provided in a way that people with disabilities can actually use. A statement published only as a scanned PDF, or as an image, fails on its own terms — an unusually visible failure, since it is the one document specifically about your accessibility.</p>
<p>In practice: real HTML with proper headings, or a tagged PDF if you need a document format. This tool emits self-contained HTML that is checked with axe-core in CI, and its PDF output carries a structure tree, a document language and a title.</p>

<h2>How honest the statement should be</h2>
<p>More honest than feels comfortable. The document is a declaration you can be held to, and the failure mode that causes trouble is claiming conformance you cannot evidence.</p>
<p>Two consequences worth internalising. Automated testing finds roughly a third of accessibility problems, so a statement generated only from a scanner cannot responsibly claim full conformance. And criteria you have not evaluated should be reported as not evaluated, rather than quietly omitted or assumed to pass. That is why this tool ships a <a href="${u('/from-axe-results/')}">manual checklist</a> alongside the automated evidence, and why its default posture is conservative.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://eur-lex.europa.eu/eli/dir/2019/882/oj">Directive (EU) 2019/882</a> — the Act itself; Annex V covers the information requirement, Article 14 the disproportionate-burden assessment</li>
  <li><a href="https://eur-lex.europa.eu/eli/dec_impl/2018/1523/oj">Commission Implementing Decision (EU) 2018/1523</a> — the model accessibility statement most national formats derive from</li>
  <li><a href="https://eur-lex.europa.eu/eli/dir/2016/2102/oj">Directive (EU) 2016/2102</a> — the Web Accessibility Directive, for public-sector bodies</li>
</ul>
`,
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'en-301-549',
    title: 'EN 301 549 and WCAG: how the two standards relate',
    description:
      'EN 301 549 is the harmonised European standard for ICT accessibility. How its clauses map onto WCAG success criteria, what version 3.2.1 contains, what changes with the WCAG 2.2 revision, and how to cite a clause in an accessibility statement.',
    heading: 'EN 301 549 and WCAG: how the two standards relate',
    lede:
      'EN 301 549 is the standard European accessibility law points at. For the web it is largely WCAG with a different numbering scheme — but the numbering is what a regulator expects to see cited.',
    faq: [
      {
        q: 'Is EN 301 549 the same as WCAG?',
        a: 'Not the same, but for web content it incorporates WCAG directly. Chapter 9 of EN 301 549 covers web content and its clauses correspond one-to-one with WCAG success criteria at levels A and AA: clause 9.1.4.3 is WCAG 1.4.3 Contrast (Minimum). The standard is broader than WCAG, adding chapters for hardware, software, documentation and support services that have no WCAG equivalent.',
      },
      {
        q: 'Which version applies?',
        a: 'EN 301 549 v3.2.1 is the version currently harmonised, and it incorporates WCAG 2.1 at level AA. A revision incorporating WCAG 2.2 is expected. Because a version change alters which criteria exist, pin the version your statement was assessed against and record it in the document rather than leaving it implicit.',
      },
      {
        q: 'Should an accessibility statement cite WCAG or EN 301 549?',
        a: 'Both, ideally. European law refers to the harmonised standard, so an EN 301 549 clause is the reference a market surveillance authority expects. WCAG numbers are what developers and testing tools use. Citing the pair — "WCAG 1.4.3, EN 301 549 clause 9.1.4.3" — means both audiences can follow the same finding without translation.',
      },
      {
        q: 'What changes with WCAG 2.2?',
        a: 'WCAG 2.2 removes 4.1.1 Parsing and adds six A and AA criteria: 2.4.11 Focus Not Obscured (Minimum), 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 3.2.6 Consistent Help, 3.3.7 Redundant Entry and 3.3.8 Accessible Authentication (Minimum). A statement assessed against 2.1 does not automatically hold against 2.2, because the set of criteria differs.',
      },
    ],
    body: (u) => `
<h2>The mapping, concretely</h2>
<p>For web content the relationship is mechanical. Chapter 9 of EN 301 549 mirrors WCAG numbering with a <code>9.</code> prefix:</p>

<div class="table-scroll">
<table>
<caption>How a finding reads in each scheme</caption>
<thead><tr><th scope="col">WCAG success criterion</th><th scope="col">EN 301 549 clause</th><th scope="col">Level</th></tr></thead>
<tbody>
<tr><th scope="row">1.1.1 Non-text Content</th><td>9.1.1.1</td><td>A</td></tr>
<tr><th scope="row">1.4.3 Contrast (Minimum)</th><td>9.1.4.3</td><td>AA</td></tr>
<tr><th scope="row">2.4.7 Focus Visible</th><td>9.2.4.7</td><td>AA</td></tr>
<tr><th scope="row">4.1.2 Name, Role, Value</th><td>9.4.1.2</td><td>A</td></tr>
</tbody>
</table>
</div>

<p>That is the whole trick for the web. It looks trivial written down, and it is still the step most often skipped: statements routinely cite WCAG numbers alone, which leaves the reader to do the translation into the scheme the law actually references.</p>

<h2>What EN 301 549 covers that WCAG does not</h2>
<p>The standard is considerably wider than web content. Its other chapters cover generic requirements and hardware (chapters 5 to 8), non-web documents (10), software (11), documentation and support services (12), and relay and emergency services (13).</p>
<p>If your service is a website or a web application, chapter 9 is the relevant part and WCAG conformance carries most of the weight. If you ship a mobile app, a desktop application, a kiosk or PDFs, the other chapters apply too and WCAG alone will not cover the obligation.</p>

<h2>Pin the version</h2>
<p>Standards move, and the set of criteria moves with them. A statement that says "conforms to EN 301 549" without a version is ambiguous the moment a revision publishes, and it will be read against whichever version the reader assumes.</p>
<p>Record the exact versions you assessed against. This tool writes both into every artifact and into its conformance baseline, so the standard used is part of the record rather than an assumption. Adding a new standard version to the tool is a data change, not a code change — the mapping tables are YAML.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://www.etsi.org/deliver/etsi_en/301500_301599/301549/">ETSI — EN 301 549 published versions</a></li>
  <li><a href="https://www.w3.org/TR/WCAG21/">WCAG 2.1</a> and <a href="https://www.w3.org/TR/WCAG22/">WCAG 2.2</a> (W3C Recommendations)</li>
  <li><a href="https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/">W3C — what is new in WCAG 2.2</a></li>
</ul>
`,
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'disproportionate-burden',
    title: 'Disproportionate burden under Article 14: what it means and how to document it',
    description:
      'Article 14 of the European Accessibility Act allows exemption where accessibility would impose a disproportionate burden — but only if you assess and document it. What the assessment must weigh, the five-year reassessment rule, and a free worksheet.',
    heading: 'Disproportionate burden under Article 14',
    lede:
      'The Act allows exemption where meeting a requirement would impose a disproportionate burden. The exemption is not self-executing: it exists only if you have actually assessed it and can produce the reasoning.',
    faq: [
      {
        q: 'What is a disproportionate burden under the European Accessibility Act?',
        a: 'Article 14 of Directive (EU) 2019/882 allows a provider to be exempted from specific accessibility requirements where meeting them would require a significant change to the product or service, or impose a disproportionate burden. It is an exemption from named requirements, not a blanket exemption, and it has to be justified against the criteria in Annex VI.',
      },
      {
        q: 'What does the assessment have to weigh?',
        a: 'Annex VI sets the criteria: the ratio of the net costs of compliance to the overall costs and revenues of the provider, the estimated costs and benefits for the provider weighed against the estimated benefit for persons with disabilities, taking account of the frequency and duration of use of the specific product or service. Organisation size matters, so a cost that is disproportionate for a small provider may not be for a large one.',
      },
      {
        q: 'How long does a disproportionate-burden assessment last?',
        a: 'Article 14(5) requires it to be reassessed at the latest every five years, when the service offering is modified, or when the market surveillance authority requests it. Five years is a ceiling rather than a schedule — a redesign restarts the clock regardless of how recently you assessed.',
      },
      {
        q: 'Do we have to tell anyone we are relying on it?',
        a: 'Yes. Article 14(6) requires the provider to inform the relevant authority when relying on the exemption, and the assessment documentation must be kept and produced on request. It should also appear in the accessibility statement, so a user encountering the excluded content understands why and what alternative exists.',
      },
    ],
    body: (u) => `
<h2>What the exemption is, and is not</h2>
<p>It is an exemption from <em>specific</em> requirements for <em>specific</em> content, justified by a documented cost–benefit assessment. It is not a way to defer accessibility work generally, and it does not survive being asserted without reasoning.</p>
<p>Two things make a claim fragile: applying it broadly rather than to named scope, and having no contemporaneous record of the assessment. An authority asking about it will ask for the documentation, and Article 14(6) obliges you to produce it.</p>

<h2>What the worksheet captures</h2>
<p>The <a href="${u('/generator/')}">generator</a> produces an Article 14 worksheet with the structure the assessment needs:</p>

<ul>
  <li><strong>The microenterprise check.</strong> Service providers with fewer than 10 people and at most 2 million euro turnover are exempted from the obligations by Article 4(5). This is a different exemption from Article 14 and worth establishing first, because if it applies the burden analysis may be moot.</li>
  <li><strong>The Annex VI criteria</strong>, as explicit prompts: the estimated cost of compliance, the benefit to the organisation, the estimated impact on people with disabilities, and the frequency and duration of use.</li>
  <li><strong>The excluded scope</strong>, named specifically, so the claim is bounded.</li>
  <li><strong>The reassessment date</strong>, computed as five years from the assessment date, alongside the two other triggers.</li>
</ul>

<p>Unfilled prompts render visibly as "to be completed" rather than being omitted. That is deliberate: a worksheet that hides its gaps invites you to file it half-done.</p>

<div class="note">
  <p>This page describes what the tool produces and is not legal advice. A disproportionate-burden claim is exactly the kind of decision to take with counsel — the tool structures and records the reasoning, it does not judge whether your claim holds.</p>
</div>

<h2>The honest use of it</h2>
<p>The most useful thing about writing the assessment down is that it is often unconvincing on paper. Costs estimated properly are frequently lower than assumed, and the "frequency and duration of use" criterion tends to expose that the excluded content matters more to users than it did to the roadmap.</p>
<p>A claim recorded in a document with a reassessment date, revisited on schedule, is a considerably better position than one made informally and never revisited. That is true whether or not anyone ever asks to see it.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://eur-lex.europa.eu/eli/dir/2019/882/oj">Directive (EU) 2019/882</a> — Article 14 and Annex VI</li>
  <li>Article 4(5) for the microenterprise exemption for services</li>
</ul>
`,
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'vpat-acr-openacr',
    title: 'VPAT, ACR and OpenACR explained',
    description:
      'A VPAT is the template, an ACR is the completed report, and OpenACR is the machine-readable format. What each term means, which VPAT edition to use in Europe, and how to generate an OpenACR-conformant report for free.',
    heading: 'VPAT, ACR and OpenACR explained',
    lede:
      'Three terms that get used interchangeably and should not be. The distinction matters when a customer asks you for one.',
    faq: [
      {
        q: 'What is the difference between a VPAT and an ACR?',
        a: 'A VPAT — Voluntary Product Accessibility Template — is the blank template published by the Information Technology Industry Council. An ACR, or Accessibility Conformance Report, is what you have once the template is filled in for a specific product at a specific version. Vendors routinely say "our VPAT" when they mean their ACR. If a customer asks for your VPAT, they want the completed report.',
      },
      {
        q: 'Which VPAT edition applies in Europe?',
        a: 'VPAT 2.5 comes in four editions. The EU edition reports against EN 301 549, which is the one European procurement expects. The INT edition covers WCAG, EN 301 549 and Section 508 together and is the safe choice if you sell into both Europe and the United States. The WCAG and 508 editions cover only their own standard.',
      },
      {
        q: 'What is OpenACR?',
        a: 'OpenACR is a machine-readable format for accessibility conformance reports, developed by the US General Services Administration. It expresses the same information as a VPAT-based ACR as structured YAML or JSON, so a report can be validated, diffed in version control and processed by tooling rather than only read as a document.',
      },
      {
        q: 'Is an ACR the same as an accessibility statement?',
        a: 'No, and you may well need both. An ACR is a detailed per-criterion conformance report, typically produced for procurement and customer due diligence. An accessibility statement is a public-facing document required by European law, naming your compliance status, a feedback route and an enforcement body. They draw on the same evidence and serve different audiences.',
      },
    ],
    body: (u) => `
<h2>The three terms</h2>
<dl class="facts">
  <dt>VPAT</dt><dd>The blank template, published by ITI. Currently at version 2.5.</dd>
  <dt>ACR</dt><dd>The completed report for a specific product and version. This is the thing customers actually want.</dd>
  <dt>OpenACR</dt><dd>A machine-readable expression of the same report, as YAML or JSON.</dd>
</dl>

<h2>Why machine-readable matters</h2>
<p>An ACR as a document is a snapshot that goes stale quietly. As structured data it becomes something you can operate on:</p>
<ul>
  <li><strong>It diffs.</strong> Commit it, and a change to your conformance position shows up in review like any other change.</li>
  <li><strong>It validates.</strong> Structure can be checked mechanically, so a report cannot silently omit criteria.</li>
  <li><strong>It regenerates.</strong> If the report is produced from test evidence rather than typed by hand, refreshing it is a build step rather than an afternoon.</li>
</ul>
<p>That last point is the one that changes behaviour. Hand-maintained ACRs are updated when someone remembers; generated ones are updated whenever the evidence is.</p>

<h2>The conformance vocabulary</h2>
<p>ACRs use a fixed set of terms per criterion, and using them precisely is most of what makes a report credible:</p>
<div class="table-scroll">
<table>
<caption>OpenACR adherence levels</caption>
<thead><tr><th scope="col">Level</th><th scope="col">Means</th></tr></thead>
<tbody>
<tr><th scope="row">supports</th><td>The functionality meets the criterion.</td></tr>
<tr><th scope="row">partially-supports</th><td>Some functionality does not meet the criterion.</td></tr>
<tr><th scope="row">does-not-support</th><td>The majority of functionality does not meet the criterion.</td></tr>
<tr><th scope="row">not-applicable</th><td>The criterion is not relevant to the product.</td></tr>
<tr><th scope="row">not-evaluated</th><td>Not assessed. Permitted only for Level AAA.</td></tr>
</tbody>
</table>
</div>
<p>The temptation is to record "supports" wherever nothing was found. Nothing found by an automated scan is not the same as conformance — automated testing reaches roughly a third of accessibility problems. A report built only from a scanner should say so in its evaluation-methods field.</p>

<h2>Generating one</h2>
<p>The <a href="${u('/generator/')}">generator</a> produces an OpenACR-conformant report from the same evidence as your accessibility statement, in YAML, JSON, HTML or Markdown. It runs in your browser; nothing is uploaded. The command-line tool does the same in CI, so the report tracks the code rather than a calendar reminder.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://www.itic.org/policy/accessibility/vpat">ITI — VPAT 2.5 and its editions</a></li>
  <li><a href="https://github.com/GSA/openacr">GSA OpenACR</a> — the schema and specification</li>
  <li><a href="${u('/en-301-549/')}">EN 301 549 and WCAG</a> — the standard the EU edition reports against</li>
</ul>
`,
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'from-axe-results',
    title: 'Turn axe-core, pa11y or Lighthouse results into an accessibility statement',
    description:
      'You already run accessibility tests in CI. How to turn that JSON into the accessibility statement the European Accessibility Act requires, what automated results can and cannot support, and why the manual checklist is not optional.',
    heading: 'Turn your existing test results into an accessibility statement',
    lede:
      'If you already run axe-core, pa11y or Lighthouse, most of the evidence for a statement exists. The gap is turning findings into a document that cites the right clauses and says only what the evidence supports.',
    faq: [
      {
        q: 'Can I generate an accessibility statement from axe-core results?',
        a: 'Partly, and the boundary matters. Automated tools reliably detect a subset of accessibility problems — commonly estimated at around a third — so axe results can evidence specific failures but cannot establish conformance for criteria no tool can judge, such as whether alt text is meaningful or whether focus order preserves meaning. A statement generated from a scanner alone should report those criteria as not evaluated rather than as passing.',
      },
      {
        q: 'What formats can be used as evidence?',
        a: 'This tool reads axe-core JSON (a single result or an array of per-page results), pa11y JSON and pa11y-ci JSON, and Lighthouse JSON reports. Multiple files merge into one project view with per-URL provenance kept, so a rule that fails on the checkout page and passes on the help page is recorded as exactly that.',
      },
      {
        q: 'What is the manual checklist for?',
        a: 'It covers the criteria automation cannot judge — media alternatives, meaningful sequence, focus order, error suggestion, consistent identification and the rest. The tool generates a template listing every WCAG A and AA criterion that automated testing cannot fully assess, with guidance on how to check each one, and manual entries take precedence over tool output.',
      },
      {
        q: 'Can this run in CI?',
        a: 'Yes, and that is the intended use. The check command compares current conformance against a committed baseline and exits non-zero when a criterion regresses, so a statement stays true after the day it was generated rather than becoming a stale snapshot.',
      },
    ],
    body: (u) => `
<h2>The pipeline</h2>
<p>Evidence in, document out, with every conclusion traceable back to what produced it:</p>
<pre><code>axe.json, pa11y.json, lighthouse.json, manual.yaml
        ↓
  parsed into findings, per rule and per URL
        ↓
  mapped: tool rule → WCAG criterion → EN 301 549 clause
        ↓
  conformance per criterion, with the evidence attached
        ↓
  statement · ACR · burden worksheet · traceability report</code></pre>

<h2>How a tool finding becomes a conformance claim</h2>
<p>Each rule maps to the success criteria it actually evidences. axe's <code>color-contrast</code> maps to WCAG 1.4.3, and therefore to EN 301 549 clause 9.1.4.3. Rules that map to no criterion — best-practice rules such as <code>region</code> — are kept and reported separately rather than being silently dropped or attributed to a criterion they do not evidence.</p>
<p>Where sources disagree, the precedence is fixed and documented: a manual assessment outranks a tool, a failure outranks a pass, and anything unevaluated stays unevaluated. Conflicts are surfaced rather than resolved quietly — if you record a manual pass over an automated failure, the traceability report says so, because whoever signs the statement should see it.</p>

<h2>What automated results cannot do</h2>
<p>This is the part worth being blunt about, because it is where generated statements go wrong. A scanner can tell you an image has no <code>alt</code> attribute. It cannot tell you whether the alt text you wrote is meaningful, whether the reading order survives CSS being disabled, whether your error messages suggest a correction, or whether a video's captions are accurate.</p>
<p>Those criteria are not optional parts of the standard. Leaving them unevaluated is a legitimate and honest position; recording them as passing because nothing was flagged is not. The generated manual checklist enumerates them with guidance so the gap is visible rather than implicit.</p>

<h2>Keeping it true</h2>
<p>A statement is accurate on the day it is generated. The <code>check</code> command exists so it stays that way: it compares the current conformance position against a committed baseline and fails the build when a criterion regresses.</p>
<pre><code>npx accessibility-statement check</code></pre>
<p>Losing coverage counts as a regression too — a criterion moving from evaluated to unevaluated is treated the same as a failure, because the statement's claim weakens either way.</p>

<h2>Try it</h2>
<p>The <a href="${u('/generator/')}">browser generator</a> takes a JSON report and produces the document immediately. Nothing is uploaded; the whole engine runs in the page. For the manual checklist, version control and the CI gate, use the command-line tool.</p>

<h2>Related</h2>
<ul>
  <li><a href="${u('/european-accessibility-act/')}">What the European Accessibility Act requires in a statement</a></li>
  <li><a href="${u('/en-301-549/')}">EN 301 549 and WCAG</a></li>
  <li><a href="${u('/vpat-acr-openacr/')}">VPAT, ACR and OpenACR</a></li>
</ul>
`,
  },
];
