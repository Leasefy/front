# Roadmap: Leasefy

## Overview

Leasefy evoluciona de un frontend con mock data a una plataforma AI-agent donde propietarios e inmobiliarias hablan con un orquestador que despacha agentes especializados. v5.0 hace que la plataforma se sienta agéntica desde el minuto 0 para inmobiliarias y construye features que diferencian los planes Flex (pago por adjudicación).

## Milestones

- ✅ **v1.0 Frontend MVP** - Phases 1-11 (shipped 2026-01-29)
- ✅ **v2.0 Design System & QA** - Phases 12-16 (shipped 2026-02-02)
- ✅ **v3.0 Inmobiliaria Module** - 10 phases (shipped 2026-02-08)
- ✅ **v3.1 Landing & SEO** - (shipped 2026-02-10)
- ✅ **v4.0 AI Agent Beta** - Phases 17-25 (shipped 2026-02-10)
- 🚧 **v5.0 Agency Plan-Gated Features** - Phases 26-32 (in progress)

## Phases

- [x] **Phase 26: Plan Gating System** - Foundation hook + upgrade prompts for feature gating
- [ ] **Phase 27: Agent Dashboard UX** - Polish existing agent cards, feed, execution panel, detail sidebar
- [ ] **Phase 28: Agency Pricing Modal** - Polish Flex vs Subscription pricing modal
- [ ] **Phase 29: Advanced Reports** - Occupancy, collections, agent performance reports with charts
- [ ] **Phase 30: Executive Reports** - C-level summary dashboard with portfolio health score
- [ ] **Phase 31: Automatic Reminders** - Payment and contract reminders with configuration UI
- [ ] **Phase 32: Integration & QA** - Wire gating to all features, test all plan tiers, polish

## Phase Details

### Phase 26: Plan Gating System
**Goal**: Feature gating infrastructure that blocks premium features based on agency plan tier
**Depends on**: Nothing (foundation phase)
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05
**Success Criteria** (what must be TRUE):
  1. `useAgencyPlan` returns current tier and `hasFeature(featureName)` check
  2. Gating config maps feature names to minimum plan tiers
  3. Attempting to access a gated feature without the required plan shows an upgrade prompt
  4. Upgrade prompt opens the agency pricing modal
  5. Plan can be changed via localStorage for testing
**Research**: Unlikely (internal hook, existing patterns)
**Plans**: 2 plans

Plans:
- [ ] 26-01: Build useAgencyPlan hook with feature gating config
- [ ] 26-02: Build UpgradePrompt component and wire to pricing modal

### Phase 27: Agent Dashboard UX
**Goal**: Polish and commit the agentic dashboard experience (already built in session)
**Depends on**: Phase 26 (needs gating to show agents only on Flex plans)
**Requirements**: ADUX-01, ADUX-02, ADUX-03, ADUX-04, ADUX-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows agent cards + activity feed as primary section
  2. Agent Hub page at /panel/inmobiliaria/ai works with full agent list
  3. Clicking "¿Cómo funciona?" opens detail sidebar with step-by-step explanation
  4. Clicking activity item opens execution panel with step-by-step view
  5. Sidebar nav shows "Agentes AI" item with badge
**Research**: Unlikely (already built, polish only)
**Plans**: 2 plans

Plans:
- [ ] 27-01: Polish agent cards, activity feed height sync, colors
- [ ] 27-02: Polish execution panel and detail sidebar

### Phase 28: Agency Pricing Modal
**Goal**: Polish pricing modal with Flex vs Subscription models
**Depends on**: Phase 26 (upgrade prompt triggers modal)
**Requirements**: PRIC-01, PRIC-02, PRIC-03, PRIC-04
**Success Criteria** (what must be TRUE):
  1. "Mejorar Plan" button opens pricing modal (not navigates away)
  2. Modal shows Flex (per-lease) as default/recommended tab
  3. Flex plans highlight AI agents as differentiator with Sparkle icon
  4. Calculator slider shows monthly cost estimate based on adjudicaciones
**Research**: Unlikely (already built, polish only)
**Plans**: 1 plan

Plans:
- [ ] 28-01: Polish pricing modal, fix features, verify UX flow

### Phase 29: Advanced Reports
**Goal**: New report pages for occupancy, collections, and agent performance with trend charts
**Depends on**: Phase 26 (reports gated to Growth+)
**Requirements**: REPT-01, REPT-02, REPT-03, REPT-04, REPT-05, REPT-06
**Success Criteria** (what must be TRUE):
  1. Occupancy report shows vacancy rate, avg days vacant, breakdown by property
  2. Collections report shows mora rate, avg days late, recovery rate by month
  3. Agent performance report shows closings, conversion rate, days to close per agent
  4. Trend charts display 6-12 month history for each metric
  5. Reports only visible to Growth+ / Growth Flex+ plans (others see upgrade prompt)
  6. Basic PDF export available
**Research**: Unlikely (charting with existing patterns, mock data)
**Plans**: 3 plans

Plans:
- [ ] 29-01: Build occupancy and collections report pages with mock data
- [ ] 29-02: Build agent performance report and trend charts
- [ ] 29-03: Add PDF export and wire plan gating

### Phase 30: Executive Reports
**Goal**: C-level summary dashboard with portfolio health score and month-over-month comparison
**Depends on**: Phase 29 (uses same data patterns)
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04
**Success Criteria** (what must be TRUE):
  1. Executive summary shows key metrics on single page
  2. Month-over-month deltas show improvement/decline indicators
  3. Portfolio health score combines occupancy + collections + maintenance
  4. Only visible to Business+ / Business Flex+ plans
**Research**: Unlikely (extends Phase 29 patterns)
**Plans**: 2 plans

Plans:
- [ ] 30-01: Build executive summary page with health score
- [ ] 30-02: Add MoM comparison and wire plan gating

### Phase 31: Automatic Reminders
**Goal**: Configurable reminder system for payments and contract expiry with log
**Depends on**: Phase 26 (reminders gated to Growth+)
**Requirements**: RMDR-01, RMDR-02, RMDR-03, RMDR-04, RMDR-05, RMDR-06, RMDR-07
**Success Criteria** (what must be TRUE):
  1. Pre-payment reminder configuration exists (toggle + days before)
  2. Overdue reminder with first notice at configurable days
  3. Escalation reminder with second notice at configurable days
  4. Contract expiry alerts at 90/60/30 days configurable
  5. Configuration UI where user can toggle and set timing per type
  6. Reminder log shows history of sent reminders with status
  7. Reminders only configurable on Growth+ / Growth Flex+ plans
**Research**: Unlikely (UI configuration + mock scheduler)
**Plans**: 3 plans

Plans:
- [ ] 31-01: Build reminder configuration UI with types and timing
- [ ] 31-02: Build reminder log and mock scheduler
- [ ] 31-03: Wire contract expiry alerts and plan gating

### Phase 32: Integration & QA
**Goal**: Wire all gating, test plan tiers end-to-end, polish edge cases
**Depends on**: Phases 26-31
**Requirements**: Cross-cutting (GATE, REPT, EXEC, RMDR gating verification)
**Success Criteria** (what must be TRUE):
  1. Starter plan user sees upgrade prompts on reports, reminders, executive dashboard
  2. Growth plan user can access reports and reminders but not executive dashboard
  3. Business plan user can access everything
  4. Flex plan users see AI agents in their features
  5. All pages work without errors, no broken links
**Research**: Unlikely (testing and verification)
**Plans**: 2 plans

Plans:
- [ ] 32-01: Wire gating to all pages and test each plan tier
- [ ] 32-02: Polish UX, fix edge cases, final QA

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 26. Plan Gating | 2/2 | Complete | 2026-03-26 |
| 27. Agent Dashboard UX | 0/2 | Not started | - |
| 28. Agency Pricing | 0/1 | Not started | - |
| 29. Advanced Reports | 0/3 | Not started | - |
| 30. Executive Reports | 0/2 | Not started | - |
| 31. Automatic Reminders | 0/3 | Not started | - |
| 32. Integration & QA | 0/2 | Not started | - |
