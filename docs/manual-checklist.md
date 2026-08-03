# The manual checklist

Automated tools cannot judge most WCAG criteria. They can tell you an image
has no `alt`; they cannot tell you whether the `alt` text is meaningful.
They can find a video element; they cannot tell you whether its captions
are accurate.

`manual.yaml` is where the rest of the evidence lives. Without it, a
statement generated from tool output alone would overstate what you know.

## Generating the template

`eaa-kit init` writes one, listing every WCAG 2.1 AA criterion automation
cannot fully judge, each with guidance:

```yaml
  # 1.2.2 Captions (Prerecorded) (Level A) — automation: none
  # How to check: Verify prerecorded videos with audio have accurate synchronized captions.
  - criterion: "1.2.2"
    status: not-evaluated
    evidence: ""
```

## Filling it in

```yaml
checklist:
  - criterion: "1.2.2"
    status: fail
    evidence: The product tour video on /features has no captions.
    evaluatedBy: A. Tester

  - criterion: "2.4.3"
    status: pass
    evidence: Tabbed the full checkout flow in Firefox and Safari; focus order follows the visual order throughout.

  - criterion: "1.2.1"
    status: not-applicable
    evidence: The service contains no audio-only or video-only content.
```

| Status | Meaning |
| --- | --- |
| `pass` | You checked, and it conforms |
| `fail` | You checked, and it does not |
| `partial` | Conforms in some places, not others |
| `not-applicable` | Nothing in the service triggers this criterion |
| `not-evaluated` | Not yet checked — the honest default |

Write the `evidence` field as though a regulator will read it, because one
might. "Checked" is not evidence. "Tabbed the full checkout flow in Firefox
and Safari; focus order follows the visual order" is.

## Precedence

Manual entries beat automated results: a human who looked outranks a tool
that guessed.

When a manual `pass` overrides an automated failure, eaa-kit records a
**conflict** in the trace artifact:

```
1.4.3 — Manual status "pass" overrides 1 automated failure(s) — verify the manual evidence.
```

The conflict is surfaced, not resolved. Overriding a tool is legitimate —
contrast failures on decorative elements, for instance — but it should be
visible to whoever signs the statement.

Two entries for the same criterion that disagree take the most severe
status and record the disagreement.

An entry left at `not-evaluated` does not override anything; automated
results still decide.

## Not evaluating everything is fine

Criteria left unevaluated appear in the statement under "Content not yet
evaluated". That is a legitimate, honest statement of position, and it is
far better than claiming a pass you cannot support.

What it does mean is that overall compliance can be at most **partial**:
`full` requires that everything was actually evaluated. That is deliberate.
