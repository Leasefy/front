# Phase 3: Application Wizard + AI Search - Roadmap

**Status**: Planned
**Plans Created**: 2026-01-19

---

## Phase Overview

Esta fase implementa el wizard de postulación de 6 pasos (CORE) más búsqueda AI y personalización.

### Vision Summary

1. **Application Wizard** - Flujo sin fricción que recolecta datos para scoring
2. **AI Search** - Input de lenguaje natural + filtros tradicionales (híbrido)
3. **Personalization** - "Para Ti" carousel + badges de calificación

---

## Plans Summary

| Plan | Focus | Files | LOC | Dependencies |
|------|-------|-------|-----|--------------|
| PLAN-01 | Wizard Foundation | ~8 | ~600 | None |
| PLAN-02 | Steps 1-3 (Personal, Empleo, Ingresos) | ~5 | ~800 | PLAN-01 |
| PLAN-03 | Steps 4-6 (Referencias, Docs, Review) | ~6 | ~900 | PLAN-01, PLAN-02 |
| PLAN-04 | AI Search | ~4 | ~500 | None |
| PLAN-05 | Personalization | ~5 | ~450 | PLAN-04 |

**Total Estimated**: ~28 files, ~3250 LOC

---

## Execution Order

```
Wave 1 (Parallel):
├── PLAN-01: Wizard Foundation
└── PLAN-04: AI Search

Wave 2 (Sequential after PLAN-01):
└── PLAN-02: Wizard Steps 1-3

Wave 3 (Sequential after PLAN-02):
└── PLAN-03: Wizard Steps 4-6

Wave 4 (After PLAN-04):
└── PLAN-05: Personalization
```

### Recommended Order
1. **PLAN-01** → Wizard foundation (types, context, shell)
2. **PLAN-04** → AI Search (can be done in parallel with wizard)
3. **PLAN-02** → Wizard steps 1-3
4. **PLAN-03** → Wizard steps 4-6 + confirmation
5. **PLAN-05** → Personalization (requires AI search, benefits from wizard for user profile)

---

## Key Files Created

### Types & Data
- `src/lib/types/application.ts` - All application/scoring types

### Wizard Components
- `src/lib/context/ApplicationContext.tsx` - Form state management
- `src/components/wizard/WizardShell.tsx` - Main container
- `src/components/wizard/WizardProgress.tsx` - 6-step progress bar
- `src/components/wizard/WizardNavigation.tsx` - Next/Back buttons
- `src/components/wizard/DocumentUpload.tsx` - Drag & drop uploader
- `src/components/wizard/ConfirmationScreen.tsx` - Success screen
- `src/components/wizard/steps/StepPersonal.tsx`
- `src/components/wizard/steps/StepEmployment.tsx`
- `src/components/wizard/steps/StepIncome.tsx`
- `src/components/wizard/steps/StepReferences.tsx`
- `src/components/wizard/steps/StepDocuments.tsx`
- `src/components/wizard/steps/StepReview.tsx`

### Search & Personalization
- `src/components/property/AISearchInput.tsx` - NLP search input
- `src/lib/search/parseSearchQuery.ts` - Query parsing
- `src/lib/context/UserProfileContext.tsx` - Mock user state
- `src/lib/scoring/qualificationScore.ts` - Affordability scoring
- `src/components/property/ForYouCarousel.tsx` - Personalized recommendations

### Routes
- `src/app/aplicar/[propertyId]/page.tsx` - Wizard page

---

## Scoring Data Collected

The wizard collects all data needed for AI risk scoring:

| Category | Data Points | Scoring Purpose |
|----------|-------------|-----------------|
| Personal | Name, Doc, DOB, Phone, Email, Address, Time at address, Marital status, Dependents | Identity, Stability |
| Employment | Status, Company, Industry, Position, Contract type, Tenure, Employer contact | Job security, Income verification |
| Income | Salary, Additional income, Source, Obligations, Available for rent | Affordability, Debt-to-income |
| References | Previous landlords, Employment refs, Personal refs | Verification, History |
| Documents | ID, Income proof, Employment letter, Bank statements, Credit report | Verification |

---

## Success Criteria (Phase Level)

- [ ] Complete wizard flow: Personal → Empleo → Ingresos → Referencias → Documentos → Review
- [ ] Wizard persists to localStorage (user can resume)
- [ ] Drag & drop document upload works seamlessly
- [ ] Review shows all data with edit capability
- [ ] Confirmation shows summary + next steps
- [ ] AI search parses natural language queries
- [ ] Hybrid: AI search + traditional filters work together
- [ ] "Para Ti" carousel shows best matches for logged-in users
- [ ] Qualification badges appear on property cards
- [ ] All personalization hidden for anonymous users

---

## Notes

- All frontend mock - no real backend integration
- Document files won't persist across refresh (browser limitation)
- "AI" search is regex-based parsing, not actual ML
- User profile is simulated via localStorage
- 30% affordability rule used for qualification scoring
