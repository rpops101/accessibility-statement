# Recipe: GitLab CI

```yaml
stages: [build, accessibility]

variables:
  NODE_VERSION: '22'

build:
  stage: build
  image: node:22
  script:
    - npm ci
    - npm run build
  artifacts:
    paths: [dist/]
    expire_in: 1 day

accessibility:
  stage: accessibility
  image: node:22
  needs: [build]
  script:
    # 1. Serve the build and scan it.
    - npx --yes serve -l 4173 dist &
    - npx --yes wait-on http://localhost:4173
    - npx --yes @axe-core/cli@4 http://localhost:4173 --save axe.json --exit || true

    # 2. Enforce the baseline and render the artifacts.
    - npm install --no-save accessibility-statement @accessibility-statement/packs
    - npx accessibility-statement check --json | tee conformance.json
    - npx accessibility-statement render-all --out-dir accessibility-artifacts
  artifacts:
    when: always
    paths:
      - accessibility-artifacts/
      - conformance.json
    expire_in: 30 days
  rules:
    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

`when: always` on the artifacts is deliberate: when the check fails you
want the rendered statement, because it shows what changed.

## Posting the result on the merge request

```yaml
    after_script:
      - |
        if [ -f conformance.json ] && [ -n "$CI_MERGE_REQUEST_IID" ]; then
          body=$(node -e '
            const r = require("./conformance.json");
            const rows = r.regressions.map((c) => `| \`${c.criterion}\` | ${c.from} | ${c.to} |`);
            console.log([
              "## Accessibility conformance (accessibility-statement)",
              "",
              `**Status:** ${r.compliance}`,
              "",
              rows.length
                ? ["| Criterion | Was | Now |", "| --- | --- | --- |", ...rows].join("\n")
                : "No regressions against the committed baseline.",
            ].join("\n"));
          ')
          curl --silent --request POST \
            --header "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
            --data-urlencode "body=$body" \
            "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes"
        fi
```

`GITLAB_API_TOKEN` needs `api` scope. Mask it in the project's CI/CD
settings.

## Publishing the statement on GitLab Pages

```yaml
pages:
  stage: .post
  image: node:22
  needs: [accessibility]
  script:
    - mkdir -p public
    - cp accessibility-artifacts/statement.*.html public/index.html
    - cp accessibility-artifacts/* public/
  artifacts:
    paths: [public]
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

## Scheduled re-checks

The evidence goes stale even when your code does not — a dependency
upgrade can change rendered output. A weekly scheduled pipeline catches
that:

**CI/CD → Schedules → New schedule**, weekly, with `CHECK_ONLY=true`, and:

```yaml
  rules:
    - if: $CI_PIPELINE_SOURCE == 'schedule'
    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```
