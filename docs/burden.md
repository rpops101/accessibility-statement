# Disproportionate burden (Article 14)

The European Accessibility Act allows a provider to be exempted from
specific accessibility requirements where meeting them would impose a
disproportionate burden. The exemption is not self-executing: it must be
**assessed and documented**, and the documentation must be produced on
request.

`eaa-kit render burden` generates that document from your configuration.

> This page describes what the tool produces. It is not legal advice, and
> a disproportionate-burden claim is exactly the kind of decision to take
> with counsel.

## Configuration

```yaml
organisation:
  name: Example GmbH
  employees: 42
  turnoverEUR: 5000000

dates:
  preparation: "2026-08-03"
  burdenAssessment: "2026-07-01"   # defaults to preparation

burden:
  claimed: true
  exclusions:
    - scope: "Archived PDF documents published before 2020"
      reason: "Remediation estimated at 40 person-days for under 0.1% of traffic."
      criteria: ["1.1.1"]
  costBenefit:
    estimatedCost: "EUR 40,000 (40 person-days plus tooling)"
    organisationBenefit: "Low: the archive is not part of the purchase flow."
    disabledUserImpact: "Low: equivalent content is available in HTML."
    frequencyOfUse: "Approximately 300 views per month across 12,000 documents."
  notes: "To be reassessed with the 2027 redesign."
```

## What the worksheet contains

**Micro-enterprise check.** Service providers that are micro-enterprises —
fewer than 10 employees **and** at most €2 000 000 annual turnover — are
exempt from the Act's service obligations (Article 4(5)). The worksheet
reports one of three outcomes, and when `employees` or `turnoverEUR` is
missing it says the check could not be performed rather than assuming.

**Cost–benefit reasoning.** The four prompts correspond to the criteria in
Annex VI: the cost of compliance relative to the provider's resources, the
estimated benefit to the organisation, the estimated impact on people with
disabilities, and the frequency and duration of use of the service.
Unfilled prompts render as *(to be completed)* — visibly incomplete rather
than quietly absent.

**Scope exclusions.** What exactly is excluded, and why. Each exclusion also
appears in the accessibility statement, because a statement that omits the
exemptions it relies on is incomplete.

**Reassessment date.** Article 14(4) requires the assessment to be renewed
at the latest five years after it was made, when the service offering
changes, or at the request of the market surveillance authority. eaa-kit
computes the five-year date from `dates.burdenAssessment`. (A 29 February
assessment rolls to 1 March, since the anniversary does not exist.)

## What it does not do

It does not decide whether your claim is valid. It structures the
reasoning, records it in a form an authority can read, and computes the
dates you will otherwise forget. The judgement stays with you and your
counsel — which is why every worksheet carries the draft watermark until
someone signs it.

A claim recorded in eaa-kit and reviewed annually is a considerably better
position than one made in an email thread nobody can find.
