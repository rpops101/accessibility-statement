# Recipe: GitHub Actions

Complete workflow — scan, check, publish. Adapt the scan step to your stack.

```yaml
name: Accessibility

on:
  pull_request:
  push:
    branches: [main]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - run: npm ci

      # 1. Serve the built site so it can be scanned.
      - name: Build and serve
        run: |
          npm run build
          npx --yes serve -l 4173 dist &
          npx --yes wait-on http://localhost:4173

      # 2. Produce evidence. Any supported tool works; several are better.
      - name: Scan with axe-core
        run: |
          npx --yes @axe-core/cli@4 http://localhost:4173 \
            --save axe.json --exit || true
        # `|| true` because the scan finding violations is not a CI failure
        # on its own — eaa-kit check decides that against the baseline.

      # 3. Generate artifacts and enforce the baseline.
      - uses: rpops101/eaa-kit/action@v1 # use @main until v1 is tagged
        with:
          jurisdiction: de
          lang: de

  # Optional: publish the statement to GitHub Pages on main.
  publish:
    if: github.ref == 'refs/heads/main'
    needs: accessibility
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: eaa-kit-artifacts
          path: site
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - uses: actions/deploy-pages@v4
```

## Without the action

If you would rather not add an action dependency:

```yaml
      - name: Accessibility conformance
        run: |
          npm install --no-save eaa-kit @eaa-kit/packs
          npx eaa-kit check
          npx eaa-kit render-all --out-dir eaa-artifacts

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: eaa-kit-artifacts
          path: eaa-artifacts
```

`if: always()` matters: when the check fails you especially want the
artifacts, because they show what changed.

## Scanning multiple routes

eaa-kit merges evidence across files and keeps per-URL provenance:

```yaml
      - name: Scan every route
        run: |
          mkdir -p reports
          for route in / /checkout /help /account; do
            slug=$(echo "$route" | tr -c '[:alnum:]' '-')
            npx --yes @axe-core/cli@4 "http://localhost:4173$route" \
              --save "reports/axe$slug.json" --exit || true
          done
```

```yaml
# eaa.config.yaml
evidence:
  paths:
    - "reports/"
```
