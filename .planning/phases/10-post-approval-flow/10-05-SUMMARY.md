---
phase: "10-post-approval-flow"
plan: "05"
title: "Insurance Selection During Signing (Gap Closure)"
subsystem: "contract-signing"
tags: ["insurance", "upsell", "contract", "gap-closure"]
dependency-graph:
  requires:
    - "10-01 (Contract Signing)"
  provides:
    - "Insurance policy types"
    - "InsuranceSelector component"
    - "Insurance integration in contract flow"
  affects:
    - "Contract signing page"
    - "ContractPreview component"
tech-stack:
  added: []
  patterns:
    - "InsuranceSelector with tier cards"
    - "SelectedInsurance state pattern"
    - "ContractPreview with optional insurance display"
key-files:
  created:
    - "src/lib/types/insurance.ts"
    - "src/lib/data/mock-insurance.ts"
    - "src/components/contract/InsuranceSelector.tsx"
  modified:
    - "src/components/contract/index.ts"
    - "src/components/contract/ContractPreview.tsx"
    - "src/app/panel/[propertyId]/contract/[candidateId]/page.tsx"
decisions:
  - id: "insurance-tiers"
    description: "3 tiers: none ($0), basic ($45,000 COP), premium ($89,000 COP)"
  - id: "basic-recommended"
    description: "Basic tier marked as recommended with visual badge"
  - id: "insurance-before-signature"
    description: "Insurance selection appears above signature form in right column"
metrics:
  duration: "4.2 min"
  completed: "2026-01-20"
gap-closure:
  gap: "Insurance policy options presented during signing"
  source: "VERIFICATION.md / ROADMAP success criteria #3"
  status: "CLOSED"
---

# Phase 10 Plan 05: Insurance Selection During Signing (Gap Closure)

Insurance policy selection as an upsell step during contract signing, closing the gap identified in verification.

## One-liner

3-tier insurance selector ($0 / $45k / $89k COP) integrated into contract signing with visual cards and preview display.

## Gap Closed

**Original Gap from VERIFICATION.md:**
> The ROADMAP success criteria #3 states "Insurance policy options presented during signing" but the contract signing flow does not include any insurance selection UI.

**Resolution:**
- Created insurance types with 3 tiers
- Built InsuranceSelector component with visual policy cards
- Integrated into contract signing page before signature form
- ContractPreview shows selected insurance policy details

## What Was Built

### Types and Data
- **InsuranceTier**: 'none' | 'basic' | 'premium'
- **InsurancePolicy**: Complete policy definition with coverage details
- **InsuranceCoverage**: Property damage, liability, legal assistance, emergency repairs, rent default
- **SelectedInsurance**: UI state for policy selection
- **Mock data**: 3 policies with Colombian Peso pricing

### Insurance Tiers

| Tier | Price | Key Coverage |
|------|-------|--------------|
| None | $0/mes | No protection |
| Basic | $45,000/mes | $10M property, $5M liability, 2 months rent |
| Premium | $89,000/mes | $30M property, $15M liability, legal, 4 months rent |

### Components
- **InsuranceSelector**: 3-column grid of policy cards with icons, features, and selection state
- **ContractPreview** (updated): Shows selected insurance in emerald box below contract summary

### Integration
- Contract signing page includes InsuranceSelector in right column
- Appears when landlord is about to sign (isLandlordTurn)
- Selected insurance passed to ContractPreview for display

## Commits

| Hash | Description |
|------|-------------|
| 5a71f85 | Add insurance types and mock data |
| 748c212 | Integrate insurance selection in contract signing |

## Technical Decisions

### Insurance Pricing (Colombian Market)
- Basic: $45,000 COP/mes (~$11 USD) - affordable entry point
- Premium: $89,000 COP/mes (~$22 USD) - comprehensive coverage
- Pricing based on typical Colombian rental insurance market

### Visual Design
- Shield icons differentiate tiers (ShieldOff, Shield, ShieldCheck)
- Emerald color for recommended badge and premium tier
- Blue for basic tier, slate for none
- Feature list truncated to 3 items with "+N more" indicator

### State Management
- SelectedInsurance state in contract page component
- Passed down to ContractPreview as optional prop
- No persistence (would be saved on actual signing)

## Verification Results

- [x] Insurance types defined (InsurancePolicy, SelectedInsurance)
- [x] 3 insurance options: none, basic ($45k), premium ($89k)
- [x] InsuranceSelector component with cards
- [x] Insurance integrated in contract signing flow
- [x] Selected insurance shown in contract preview
- [x] Build passes without errors

## Deviations from Plan

None - plan executed exactly as written.

## Impact

This gap closure completes the insurance selection requirement from the ROADMAP:
- **Before**: Contract signing had no insurance options
- **After**: Landlord can select insurance policy before signing

The insurance upsell flow is now ready for backend integration to:
1. Store selected policy with contract
2. Process insurance premium payments
3. Generate insurance certificate PDFs
