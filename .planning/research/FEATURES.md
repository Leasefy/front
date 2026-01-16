# Features Research: Arriendo Facil - Colombian Rental Marketplace

**Researched:** 2026-01-16
**Domain:** Rental marketplace with AI tenant scoring
**Market:** Colombia (primary), LATAM expansion potential
**Confidence:** MEDIUM-HIGH (based on global patterns + Colombia-specific context)

## Executive Summary

- **Table stakes are well-defined globally**: Property search with map, saved favorites, basic tenant application, landlord application dashboard are non-negotiable
- **Colombia-specific gap**: No local player offers AI-based alternative credit scoring - DataCredito dependency creates opportunity
- **Screening differentiation**: Explainability and fairness in AI scoring is the competitive moat - global platforms are being sued for "black box" discrimination
- **UX standard is Airbnb-level**: Professional photo galleries, mobile-first wizards with autosave, real-time status tracking are expected
- **Post-MVP opportunities**: Virtual tours, rent payment integration, and credit-building features have high value but can wait

**Primary recommendation:** Build table stakes features with Airbnb-level UX polish, then differentiate hard on transparent, FAIR AI scoring that explains decisions in plain language.

---

## Table Stakes Features

Features users expect from ANY rental marketplace. Missing these = immediate bounce.

### Property Listings

| Feature | Complexity | Why Table Stakes | Notes |
|---------|------------|------------------|-------|
| Property cards with photos | LOW | Basic expectation since 2010 | First 5 photos critical - Airbnb reports 20% more bookings with pro photos |
| Search with filters (price, bedrooms, location) | MEDIUM | Core navigation pattern | Include estrato, barrio, amenities for Colombia |
| Map-based search | MEDIUM | Standard since Zillow/Airbnb | Google Maps integration, draw-to-search, neighborhood data |
| Saved favorites/wishlist | LOW | Expected in all e-commerce/listing apps | Sync across devices, share with co-applicants |
| Sort by price/date/relevance | LOW | Basic usability | AI-powered relevance ranking is differentiator |
| Mobile-responsive listings | LOW | 70%+ traffic is mobile in LATAM | Mobile-first, not mobile-adapted |
| Contact landlord CTA | LOW | Core conversion action | Track engagement for landlord analytics |

**Complexity total:** ~4-6 weeks for MVP implementation

### Tenant Application

| Feature | Complexity | Why Table Stakes | Notes |
|---------|------------|------------------|-------|
| Online application form | MEDIUM | Paper applications are dead | Wizard pattern, not single long form |
| Document upload (ID, income proof) | MEDIUM | Required for any screening | Support camera capture, PDF, images |
| Autosave/resume later | LOW | Expected since 2015 | Critical for mobile users with interruptions |
| Application status tracking | LOW | Basic CX expectation | Pending/Submitted/Accepted/Declined states |
| Email/SMS notifications | LOW | Users expect updates | Real-time status change alerts |
| Mobile-friendly forms | LOW | Majority apply on mobile | Thumb-friendly zones, large touch targets |

**Complexity total:** ~3-4 weeks for MVP implementation

### Landlord Tools

| Feature | Complexity | Why Table Stakes | Notes |
|---------|------------|------------------|-------|
| Application inbox | LOW | Basic organization | List view with filtering |
| Applicant details view | LOW | Review submitted info | PDF export useful |
| Accept/Decline actions | LOW | Core decision workflow | With decline reason templates |
| Basic messaging | MEDIUM | Coordinate with applicants | In-app preferred, email fallback |
| Listing management | MEDIUM | CRUD for properties | Availability toggle, edit details |
| Email notifications | LOW | Stay informed | New application, message received |

**Complexity total:** ~3-4 weeks for MVP implementation

---

## Differentiating Features

Features that create competitive advantage. These are where Arriendo Facil wins or loses.

### Scoring & Screening (Core Differentiator)

| Feature | Complexity | Competitive Advantage | Implementation Notes |
|---------|------------|----------------------|---------------------|
| **Alternative credit scoring** | HIGH | DataCredito excludes 40%+ of renters (thin file, informal economy). AI scoring using bank transactions, utility payments, rental history. | Nova Credit, Plaid models show 98%+ coverage with bank data. Major differentiator for Colombia. |
| **Explainable AI scores** | HIGH | Competitors sued for "black box" discrimination (SafeRent lawsuits). HUD 2024 guidance requires explanation. | Score breakdown by factor: income stability, payment history, ID verification. Plain language explanations. |
| **Risk level visualization** | MEDIUM | A/B/C/D levels with color coding is unique. Most competitors show single number. | Traffic light colors, clear thresholds, what each level means |
| **Factor-by-factor breakdown** | MEDIUM | Shows WHY score is what it is. Builds trust, reduces discrimination claims. | "Income: Strong (3x rent). Payment history: Good (12 months on-time utility)." |
| **Score improvement tips** | LOW | Helps rejected applicants. Builds goodwill, reduces frustration. | "To improve: Add 3 more months of utility payment history" |
| **Portable screening reports** | MEDIUM | Apply once, share with multiple landlords. Reduces friction. | Colorado, California, others now require this option |

**Key insight:** The US rental industry is facing class-action lawsuits over AI screening discrimination. Building explainability from day one is not just ethical - it's legal protection and competitive moat.

### UX Innovation (Secondary Differentiator)

| Feature | Complexity | Competitive Advantage | Implementation Notes |
|---------|------------|----------------------|---------------------|
| **Airbnb-quality property cards** | MEDIUM | Metrocuadrado/Fincaraiz have dated UI. Modern cards = premium perception. | Photo-first, key stats visible, micro-interactions |
| **8-12 min wizard application** | MEDIUM | Break long forms into digestible steps. Show progress. | Accordion-style with summary preview, conditional logic |
| **Candidate ranking for landlords** | MEDIUM | Side-by-side comparison is rare. Most show list only. | Comparison table, highlight differences, bulk actions |
| **Application timeline** | LOW | Visual journey from applied to moved-in. | Vertical timeline with dates, status, next steps |
| **Real-time availability** | MEDIUM | Many listings on MC/FR are outdated (noted in research). | Landlord must confirm availability periodically |
| **Dark mode** | LOW | Standard 2025 expectation | Reduces eye strain, saves battery |

**Key insight:** Metrocuadrado and Fincaraiz have similar, dated interfaces. A modern, mobile-first UX alone would be noticed.

---

## Nice-to-Have (Post-MVP)

Features with value but not critical for launch. Prioritize based on user feedback.

### v1.1 Candidates (High Value, Medium Effort)

| Feature | Complexity | Value | Rationale |
|---------|------------|-------|-----------|
| Virtual tours / 3D views | HIGH | Increases engagement 14%+ | Requires landlord education, content creation tools |
| In-app rent payments | HIGH | Stickiness, payment data for scoring | Regulatory complexity in Colombia |
| Automated lease generation | MEDIUM | End-to-end platform | Legal review required for Colombia |
| Landlord reference automation | MEDIUM | Faster verification | Contact previous landlords automatically |
| Co-applicant/roommate flow | MEDIUM | Common use case | Shared favorites, combined applications |
| Push notifications app | LOW | Better engagement | Requires native app or PWA |

### v1.2+ Candidates (Future Roadmap)

| Feature | Complexity | Value | Rationale |
|---------|------------|-------|-----------|
| Credit building from rent | MEDIUM | Major tenant benefit | Report on-time payments to DataCredito |
| AI-powered property matching | HIGH | "Tinder for apartments" | Requires usage data, learning period |
| Maintenance request system | MEDIUM | Post-lease value | Different product category |
| Income verification via bank link | HIGH | Stronger scoring signal | Plaid-style integration |
| Video property tours | MEDIUM | COVID-era expectation | Async viewing option |
| Smart home integration | HIGH | Premium properties | IoT lock codes for viewings |

---

## Anti-Features

Features to deliberately NOT build. Either harmful, distracting, or commoditizing.

| Anti-Feature | Why NOT to Build | What to Do Instead |
|--------------|------------------|-------------------|
| **Full property management suite** | Scope creep. Buildium, AppFolio own this. Not our fight. | Focus on discovery + application flow. Partner/integrate for PM. |
| **Mortgage calculator** | Not relevant for rentals. Feature bloat. | Keep focused on rental journey only. |
| **"Black box" AI scoring** | Ethical/legal risk. SafeRent facing class actions. | Always show score factors and explanations. |
| **Automated rejection without review** | HUD 2024 guidance requires human review. Legal risk. | AI recommends, landlord decides. Always human in loop. |
| **Social media login only** | Excludes users, privacy concerns | Offer email/phone as primary, social as option |
| **Complex pricing tiers at launch** | Decision paralysis, support burden | Simple freemium: basic free, premium for landlords |
| **Blockchain/NFT anything** | Hype tech, no user value for rentals | Focus on real problems |
| **Chat with AI assistant for tenants** | Premature optimization, support expectation | FAQ, status tracking, then human support |
| **Neighborhood crime data** | Can reinforce discrimination, legal risk | Focus on positive amenities, transportation access |
| **Credit score requirement display** | Perpetuates DataCredito exclusion | Show "scoring not based on credit bureau" as differentiator |

**Key insight:** The biggest anti-feature is replicating US-style credit-dependent screening. This is the exact problem we're solving.

---

## Competitive Analysis

### Global Players (UX Reference)

| Platform | Strengths to Learn From | Weaknesses/Gaps |
|----------|------------------------|-----------------|
| **Zillow Rental Manager** | Free core platform, tenant screening integration, Rent Zestimate, AI leasing assistant, 34M monthly visitors | No alternative credit, US-only, screening paid add-on ($45) |
| **Apartments.com (Cozy)** | Syndication to 10+ sites, lower screening cost ($29-35), expense tracking | Forced to use their lease templates, less flexibility |
| **Airbnb** | Photo-first UX gold standard, wishlist sharing, motion design, parent-to-child navigation | Not a traditional rental platform, different use case |
| **TurboTenant** | Generous free tier, marketing to dozens of sites with one click, lead-to-lease flow | Feature depth requires premium |
| **RentSpree** | Fast screening, portable reports, agent-friendly | Not landlord self-serve focused |

### Colombia Players (Direct Competitors)

| Platform | Strengths | Weaknesses | Opportunity |
|----------|-----------|------------|-------------|
| **Metrocuadrado** | First mover (2001), largest inventory, brand recognition, 1000+ agency partners | Dated UI, no tenant screening, no application management, high % of stale listings | Modern UX, integrated screening, real-time availability |
| **Fincaraiz** | Strong national presence, similar inventory to MC | Same dated patterns, no innovation | Same as MC - UI/UX and screening integration |
| **La Haus** | Modern UI, VC-backed, focused on buying | Less rental inventory, premium market only | Broader market, rental focus |
| **Ciencuadras (Grupo Bolivar)** | Bank backing, integrated services | Newer, less inventory | Move faster while they build |

**Key Colombia insight:** Both major players (MC/FR) are search engines only - no integrated application, no screening, no landlord tools. The entire application/screening layer is a greenfield opportunity.

### Screening Specialists (Feature Reference)

| Platform | Key Features | Pricing | Relevance |
|----------|--------------|---------|-----------|
| **Naborly** | Naborly Score (500-900), color-coded risk, income analysis, rental history search, Credit Builder | $24.99/report | Score visualization, credit building feature |
| **RentPrep** | Human-verified (FCRA screeners), TransUnion partnership, income verification via bank link | $21-40/report | Human review model, bank-based income |
| **SmartMove (TransUnion)** | ResidentScore (rental-specific), 15% better eviction prediction than credit score | $25-40/report | Rental-specific scoring concept |
| **Nova Credit Income Navigator** | 98%+ US coverage, multiple income types (gig, traditional, alternative), bank + payroll + paystub | Enterprise pricing | Alternative income verification model |

**Key screening insight:** Naborly's color-coded 500-900 score with factor breakdown is closest to our A/B/C/D model. Their Credit Builder feature (helping tenants build credit) is a strong v1.1 candidate.

---

## Feature Dependencies

Build order matters. Some features enable others.

```
Phase 1: Core Platform
├── Property listings (enables search)
├── Basic search/filter (enables discovery)
├── Tenant registration (enables applications)
└── Landlord registration (enables listings)

Phase 2: Application Flow
├── Application wizard (depends on: tenant registration)
├── Document upload (depends on: application wizard)
├── Autosave (depends on: application wizard)
└── Status tracking (depends on: application wizard)

Phase 3: Scoring Engine (DIFFERENTIATOR)
├── Income analysis (depends on: document upload OR bank link)
├── ID verification (depends on: document upload)
├── Risk score calculation (depends on: income + ID)
├── Score explanation UI (depends on: risk score)
└── Factor breakdown (depends on: risk score)

Phase 4: Landlord Tools
├── Application inbox (depends on: application flow)
├── Candidate comparison (depends on: scoring engine)
├── Accept/decline flow (depends on: inbox)
└── Messaging (depends on: both parties registered)

Phase 5: Polish & Growth
├── Saved searches/favorites (depends on: search)
├── Map integration (depends on: listings)
├── Push notifications (depends on: mobile app)
└── Virtual tours (depends on: listings + content tools)
```

**Critical path:** Scoring engine is the differentiator but depends on application flow being complete first. Don't skip to scoring without solid application UX.

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Table stakes features | HIGH | Global consensus across all platforms studied |
| UX patterns (wizard, autosave, status) | HIGH | Well-documented best practices, 2025 standards |
| Scoring differentiation opportunity | HIGH | US lawsuits + HUD guidance + Colombia DataCredito gap all point same direction |
| Colombia competitor analysis | MEDIUM | Based on public website review, not insider knowledge |
| Pricing/business model | LOW | Did not research monetization models deeply |
| Regulatory requirements Colombia | MEDIUM | Law 1266 of 2008 for credit reporting, need legal review for AI scoring |
| Feature complexity estimates | MEDIUM | Based on similar implementations, actual may vary |

---

## Sources

### Primary (HIGH Confidence)

- [Ascendix Tech - Types of Rental Marketplaces & Must-Have Features](https://ascendixtech.com/how-to-create-rental-website/)
- [Codica - How to Build a Rental Marketplace](https://www.codica.com/blog/how-to-build-a-rental-marketplace/)
- [Zillow Rental Manager](https://www.zillow.com/rental-manager/)
- [Naborly Official](http://naborly.com/index.html)
- [RentPrep Reviews](https://realestatebees.com/software/rentprep/)
- [Plaid Identity Verification Docs](https://plaid.com/docs/identity-verification/)
- [HUD AI Tenant Screening Guidance](https://www.navigatehousing.com/understanding-the-new-hud-guidance-on-ai-in-tenant-screening-and-advertising/)
- [Georgetown Law - Discriminatory Impacts of AI Tenant Screening](https://www.law.georgetown.edu/poverty-journal/blog/the-discriminatory-impacts-of-ai-powered-tenant-screening-programs/)

### Secondary (MEDIUM Confidence)

- [TurboTenant Best Screening Services](https://www.turbotenant.com/rental-screening/best-tenant-screening-services/)
- [Stessa - Zillow vs Apartments.com](https://www.stessa.com/blog/zillow-rental-manager-vs-apartments-cozy/)
- [Eleken - Wizard UI Pattern](https://www.eleken..co/blog-posts/wizard-ui-pattern-explained)
- [UI Patterns - Autosave](https://ui-patterns.com/patterns/autosave)
- [Medellin Advisors - Building Credit in Colombia](https://www.medellinadvisors.com/building-credit-in-colombia-is-the-juice-worth-the-squeeze/)
- [AAA Colombia - Fincaraiz vs Metrocuadrado](https://aaacolombiasas.com/fincaraiz-vs-metrocuadrado/)
- [Mubrick Inmobiliaria - MC o FR Comparison](https://mubrickinmobiliaria.com/metrocuadrado/)

### Tertiary (LOW Confidence - Needs Validation)

- Colombia-specific regulatory requirements for AI scoring
- Exact market share of Metrocuadrado vs Fincaraiz
- Pricing benchmarks for Colombian rental platforms

---

## Validation Recommendations

Before finalizing feature scope:

1. **User interviews (tenants):** Validate pain points with DataCredito, application friction
2. **User interviews (landlords):** Validate desire for integrated screening, comparison tools
3. **Legal review:** AI scoring disclosure requirements in Colombia, Law 1266 implications
4. **Competitive deep-dive:** Create accounts on MC/FR, document exact feature sets
5. **Pricing research:** What do Colombian landlords pay for current screening (if any)?

---

*Research conducted for /gsd:research-project workflow. Feeds into /gsd:define-requirements for Phase-specific planning.*
