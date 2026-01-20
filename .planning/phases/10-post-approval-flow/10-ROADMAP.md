# Phase 10: Post-Approval Flow - Roadmap

## Overview

Esta fase completa el journey de arriendo desde la aprobación del candidato hasta el lease activo. Incluye contratos, pagos, pricing, cupones, y dashboards post-contrato.

## Plans

| Plan | Title | Wave | Status |
|------|-------|------|--------|
| 01 | Contract Generation & Signing UI | 1 | Complete |
| 02 | Pricing Page & Subscription Plans | 1 | Complete |
| 03 | Coupon System | 2 | Complete |
| 04 | Post-Contract Dashboards | 2 | Complete |
| 05 | Insurance Selection During Signing (Gap Closure) | 3 | Complete |

## Execution Strategy

### Wave 1: Foundation ✓
Plans 01 + 02 (complete):
- Contract types and signing UI
- Pricing page and subscription plans

### Wave 2: Enhancement ✓
Plans 03 + 04 (complete):
- Coupon system (depends on pricing)
- Post-contract dashboards (depends on contracts)

### Wave 3: Gap Closure ✓
Plan 05 (complete):
- Insurance selection during signing (closes verification gap #3)

## Key Deliverables

### Contract System
- [x] Contract types (Básico, Amoblado, Compartido)
- [x] Deel-style sequential signing flow
- [x] E-signature with legal compliance
- [x] Contract preview and status timeline
- [x] Insurance selection during signing

### Pricing System
- [x] Free/Pro/Business plans with features
- [x] Public pricing page
- [x] Upgrade flow in dashboard
- [x] Billing cycle toggle (monthly/yearly)

### Coupon System
- [x] 4 coupon types (PERCENTAGE, FIXED, FREE_MONTHS, FULL_ACCESS)
- [x] Validation with error messages
- [x] Checkout integration
- [x] Price summary with discounts

### Post-Contract Dashboards
- [x] Landlord: Active leases view
- [x] Tenant: My lease dashboard
- [x] Payment history
- [x] Payment method selection (PSE, cards, Nequi)

## Dependencies

- **Phase 5 (Landlord Dashboard)**: Contract flow starts from approved candidates
- **POST_APPROVAL_STRATEGY.md**: Research document with full strategy

## Success Criteria

1. Contract signing flow works end-to-end (mock)
2. Pricing page displays 3 tiers correctly
3. Coupons apply discounts correctly
4. Both landlord and tenant see post-contract views
5. Build passes without errors

---

*Phase: 10-post-approval-flow*
*Created: 2026-01-20*
*Completed: 2026-01-20*
*Plans: 5/5 Complete*
*Verification: 9/9 must-haves passed*
