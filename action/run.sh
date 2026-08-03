#!/usr/bin/env bash
# Entry point for the accessibility-statement GitHub Action (FR-CI-1).
#
# Runs the regression check, renders the artifacts, and writes a Markdown
# summary the action posts as a pull-request comment. Exits non-zero only
# when conformance actually regressed — rendering problems surface as job
# failures with the CLI's own actionable error text.
set -uo pipefail

CONFIG="${INPUT_CONFIG:-a11y-statement.config.yaml}"
LOCK="${INPUT_LOCK:-a11y-statement.lock.json}"
OUT_DIR="${INPUT_OUT_DIR:-accessibility-artifacts}"
VERSION="${INPUT_VERSION:-latest}"
SUMMARY="${A11Y_STATEMENT_SUMMARY:-accessibility-statement-summary.md}"

# Prefer a CLI built in this checkout over the published package. That is
# what makes the action usable from a repository clone — including this
# repository's own self-test, which must exercise the action rather than a
# release artifact — and it keeps working before the first npm publish.
LOCAL_CLI="${GITHUB_ACTION_PATH:-$(dirname "$0")}/../packages/cli/dist/main.js"
if [ -f "$LOCAL_CLI" ]; then
  echo "Using the CLI built in this checkout: $LOCAL_CLI"
  EAA=(node "$LOCAL_CLI")
else
  EAA=(npx --yes "accessibility-statement@${VERSION}")
fi

common=(--config "$CONFIG")
[ -n "${INPUT_JURISDICTION:-}" ] && common+=(--jurisdiction "$INPUT_JURISDICTION")
[ -n "${INPUT_LANG:-}" ] && common+=(--lang "$INPUT_LANG")

status=0
regressions=0
compliance="unknown"

{
  echo "<!-- accessibility-statement-summary -->"
  echo "## Accessibility conformance (accessibility-statement)"
  echo
} > "$SUMMARY"

if [ "${INPUT_CHECK:-true}" = "true" ]; then
  if [ -f "$LOCK" ]; then
    check_json="$("${EAA[@]}" check "${common[@]}" --lock "$LOCK" --json)"
    status=$?
    if [ -n "$check_json" ]; then
      compliance="$(printf '%s' "$check_json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).compliance??"unknown")}catch{console.log("unknown")}})')"
      regressions="$(printf '%s' "$check_json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log((JSON.parse(s).regressions??[]).length)}catch{console.log(0)}})')"
      printf '%s' "$check_json" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  let r;
  try { r = JSON.parse(s); } catch { return; }
  const line = (c) => `| \`${c.criterion}\` | ${c.from} | ${c.to} |`;
  const table = (rows) => ["| Criterion | Was | Now |", "| --- | --- | --- |", ...rows.map(line)].join("\n");
  const out = [];
  out.push(`**Status:** ${r.compliance}`, "");
  if (r.regressions.length) {
    out.push(`### ${r.regressions.length} regression(s)`, "", table(r.regressions), "");
    out.push("Fix these, or record the new baseline deliberately with `accessibility-statement check --update`.", "");
  } else {
    out.push("No conformance regressions against the committed baseline.", "");
  }
  if (r.improvements.length) out.push(`### ${r.improvements.length} improvement(s)`, "", table(r.improvements), "");
  const t = r.totals ?? {};
  out.push("<details><summary>Criteria totals</summary>", "",
    `pass ${t.pass ?? 0} · fail ${t.fail ?? 0} · partial ${t.partial ?? 0} · not applicable ${t["not-applicable"] ?? 0} · not evaluated ${t["not-evaluated"] ?? 0}`,
    "", "</details>");
  process.stdout.write(out.join("\n") + "\n");
});' >> "$SUMMARY"
    fi
  else
    status=0
    {
      echo "No baseline at \`$LOCK\` yet."
      echo
      echo "Create one and commit it so future pull requests are checked against it:"
      echo
      echo '```bash'
      echo "npx accessibility-statement check --update"
      echo '```'
      echo
    } >> "$SUMMARY"
  fi
fi

if [ "${INPUT_RENDER:-true}" = "true" ]; then
  render_json="$("${EAA[@]}" render-all "${common[@]}" --out-dir "$OUT_DIR" --json)"
  render_status=$?
  if [ "$render_status" -ne 0 ]; then
    echo "accessibility-statement render-all failed" >&2
    exit "$render_status"
  fi
  if [ "$compliance" = "unknown" ] && [ -n "$render_json" ]; then
    compliance="$(printf '%s' "$render_json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).compliance??"unknown")}catch{console.log("unknown")}})')"
  fi
  {
    echo
    echo "The rendered accessibility statement, ACR and burden worksheet are attached to this run as the \`accessibility-statement-artifacts\` artifact."
    echo
    echo "_Artifacts are drafts for human review and do not constitute legal advice._"
  } >> "$SUMMARY"
fi

{
  echo "compliance=$compliance"
  echo "regressions=$regressions"
  echo "artifacts-path=$OUT_DIR"
} >> "${GITHUB_OUTPUT:-/dev/null}"

cat "$SUMMARY" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

exit "$status"
