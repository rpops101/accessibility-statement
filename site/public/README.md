# Passthrough files

Everything in this directory is copied verbatim to the root of the built
site. Use it for files that must exist at an exact URL.

The main use is **search-engine ownership verification**:

- Google Search Console → "HTML file" method → download `googleXXXX.html`
  and drop it here. It will be served at
  `https://rpops101.github.io/accessibility-statement/googleXXXX.html`.
- Bing Webmaster Tools → `BingSiteAuth.xml` works the same way.

These files are **not secrets** — they are public by design, since the whole
point is that anyone can fetch them. Committing them is correct, and it means
verification survives a rebuild. If you delete them, the property becomes
unverified after Google's next re-check.

The alternative is the meta-tag method, configured in `site/verification.json`.
