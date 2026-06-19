---
name: scoring-domain
description: scoring evaluacion inquilino credit_check habeas-data proteccion seguros fianza RiskLevel awaiting_evaluation — dominio de scoring de arrendatarios
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

# Scoring Domain Skill

## Activation Contract

Invoke when touching: tenant evaluation/scoring flow, `credit_check`, `habeas_data` consent, `protection_options`, `ScoringRunStatus`, `RiskLevel`, or any component in `src/components/score/`.

## Hard Rules

- The scoring computation does NOT live in this repo. `src/lib/scoring/propertyMatching.ts` is UI display-only (colors, labels, acceptance probability). All scoring logic runs in the `Leasefy/agent` microservice and is consumed via HTTP.
- `credit_check` arrives at root level on the API response (not nested under `result`). Read the normalization logic in `applications.service.ts:397–415` before touching it.
- `CreditCheckBlock` renders nothing when `credit_check.status === 'not_evaluated'` or the field is absent — this is intentional (`CreditCheckBlock.tsx:67`).
- `ProtectionOption.isDemo` MUST be displayed visually when true.
- `habeasDataConsent: true` + `authorizationVersion` must be sent together on `CreateApplicationDto`. The backend rejects a consent submission without the version (`ApplicationContext.tsx:468`). The consent text is fetched once on mount via `getConsentText()` (`legal.service.ts`); on fetch failure the fields are omitted (graceful fallback).
- There are TWO status namespaces — do not mix them:
  - Agent hook: `ScoringRunStatus` = `'PENDING' | 'AWAITING_EVALUATION' | 'COMPLETED' | 'FAILED'` (uppercase, `ai-agents.ts:44`)
  - Landlord API: `EvaluationResult['status']` = `'pending' | 'queued' | 'running' | 'completed' | 'failed'` (lowercase, `applications.types.ts:335`)

## Key Paths

| What | Path | Key symbol / line |
|------|------|-------------------|
| Status types | `src/lib/types/ai-agents.ts:44` | `ScoringRunStatus`, `ScoringAwaitingReason` |
| Risk level type | `src/lib/types/risk-score.ts:13` | `RiskLevel = 'A' \| 'B' \| 'C' \| 'D'` |
| Credit check types | `src/lib/api/applications.types.ts:218` | `CreditCheckStatus`, `CreditCheckReasonCode` |
| Protection types | `src/lib/api/applications.types.ts:250` | `ProtectionProductType`, `ProtectionOption` |
| EvaluationResult | `src/lib/api/applications.types.ts:335` | landlord-facing result shape |
| credit_check normalization | `src/lib/api/applications.service.ts:397` | root-first + nested fallback |
| Habeas-data consent DTO | `src/lib/api/applications.types.ts:137` | `habeasDataConsent`, `authorizationVersion` |
| Consent text fetch | `src/lib/api/legal.service.ts` | `getConsentText()`, `GET /legal/consent-text` |
| Consent context | `src/lib/context/ApplicationContext.tsx:91` | fetched once on mount |
| Score UI barrel | `src/components/score/index.ts` | `ScoreCard`, `RiskScoreDisplay`, `CategoryBreakdown`, etc. |
| Display helpers | `src/lib/scoring/propertyMatching.ts` | `getAcceptanceProbabilityColors`, `getMatchScoreColor` |
| Credit check block | `src/components/inmobiliaria/CreditCheckBlock.tsx` | not_evaluated → render nothing |
| Candidate drawer | `src/components/inmobiliaria/CandidateDrawer.tsx:627` | renders `ProtectionOptionCard` + `CreditCheckBlock` |
| Evaluations service | `src/lib/api/evaluations.service.ts` | certificate download + `sendCertificateToOwner` |
| Agent hook | `src/lib/hooks/use-agent.ts:112` | `EvaluationResponse.credit_check` |
| Habeas-data agent routes | `src/lib/api/generated/agent.ts:901` | `/onboarding/{token}/habeas-data/*` (agent-side) |
| Application wizard | `src/app/aplicar/[propertyId]/page.tsx` | habeas-data consent in StepReview |
| Candidate list route | `src/app/panel/inmobiliaria/propiedades/[id]/candidatos/page.tsx` | score badge + CandidateDrawer |
| Demo page | `src/app/demo/score/page.tsx` | dev-only, not production |

## Decision Gates

- Adding new scoring UI? Use components from `src/components/score/` barrel — do not reinvent.
- Changing `credit_check` shape? Update normalization at `applications.service.ts:397` first, then types.
- New `protection_options` carrier? Add to `ProtectionOption` at `applications.types.ts:269` and handle `isDemo` visually in `ProtectionOptionCard`.
- Habeas-data consent changes? The consent registration is backend-only (`POST /onboarding/{token}/habeas-data/confirm`). The front only sends `habeasDataConsent` + `authorizationVersion` on the application DTO.
- `sendCertificateToOwner` recipient must be the PROPERTY OWNER's email — auto-resolving owner email is not yet built (`evaluations.service.ts` pending note).
- `awaiting_evaluation` handling? See `use-agent.ts` + `use-agent.test.ts:190`. The reason lives in `ScoringAwaitingReason` (`ai-agents.ts:34`).

## Execution Steps

1. Read `applications.types.ts` block at lines 218–284 for the full credit/protection type surface.
2. Check `applications.service.ts:397–415` for normalization before touching any `credit_check` data.
3. For consent flows, read `ApplicationContext.tsx:91–468` and `legal.service.ts` before changing anything.
4. For new score display components, follow the pattern of existing components in `src/components/score/` and export from `index.ts`.
5. Verify you are using the correct status namespace (uppercase vs lowercase) for your context.

## References

Cross-links: [[agent-api-contract]] (habeas-data routes live in generated/agent.ts), [[agency-permissions]] (CandidateDrawer is behind `PageGuard module="pipeline"`).
