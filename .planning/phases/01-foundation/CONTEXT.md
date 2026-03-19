# Phase 1: Foundation - Context

**Created:** 2026-01-18
**Phase Goal:** Project scaffolded, configured, and deploying to Vercel

## User Vision

### Priority Focus
- **Scoring as differentiator**: The existing MVP has the flow but lacks real Risk Scoring - this is where Arriendo Fácil will stand out
- **Realistic Colombian data**: Seed data must feel authentic (Colombian cities, COP prices, real property types)
- **Both properties AND candidates**: Seed data should include realistic tenant profiles for testing the scoring engine

### Key Quote
> "Lo más importante es que el sistema de scoring funcione perfectamente y que claramente tanto el usuario dueño de apartamento pueda ver las postulaciones a sus inmuebles y ver con ese scoring de cada postulado qué decisión puede tomar."

## Existing MVP Analysis

Explored: https://ai-risk-scoring-rent-ui2l.bolt.host

### What Exists (to replicate/improve)
- Property catalog with Colombian properties
- Property detail with pricing, amenities, rules
- 6-step application wizard capturing all required data
- "Mis Solicitudes" tracking page
- Role-based registration (tenant/landlord/both)

### What's Missing (our differentiator)
- Risk Score calculation (0-100)
- Level assignment (A/B/C/D)
- Driver explanations (3-6 per candidate)
- Risk flags as visual chips
- Suggested conditions (cosigner, deposit, insurance)
- Landlord dashboard with ranked candidates
- Score explainability for trust

## Phase 1 Scope

### Requirements Covered
- **FUND-01**: Next.js 14 App Router project scaffolded with TypeScript
- **FUND-02**: Tailwind CSS + shadcn/ui configured
- **FUND-03**: Prisma + PostgreSQL schema initialized
- **FUND-04**: Project deploys to Vercel successfully
- **FUND-05**: Seed data script creates demo content

### Success Criteria
1. `npm run dev` starts development server without errors
2. `npm run build` completes successfully
3. Vercel preview deployment works
4. Prisma can connect to database and run migrations
5. Seed script populates demo properties and users

## Technical Decisions

### Stack (from research)
- **Framework**: Next.js 14 App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Prisma
- **Auth**: Clerk (Phase 2, but schema prepared)
- **Deploy**: Vercel

### Seed Data Strategy
Colombian-realistic demo data:
- **Cities**: Bogotá, Medellín, Cali, Barranquilla, Cartagena
- **Properties**: 15-20 listings with realistic COP prices
- **Users**:
  - 3-5 landlords with property portfolios
  - 10-15 tenants with varying risk profiles (A/B/C/D distribution)
- **Applications**: Pre-seeded applications for testing scoring

### Database Schema Priorities
Prepare full schema even though Phase 1 only seeds basic data:
- User, Property, PropertyImage models
- Application model with all scoring fields
- ApplicationEvent for state machine
- Score, ScoreDriver, RiskFlag, SuggestedCondition models

## Constraints

- Colombia only (COP currency, Colombian cities)
- Spanish UI text where user-facing
- Email magic link auth (no SMS - deferred)
- Rule-based scoring first (no ML for MVP)

## Notes

Phase 1 sets the foundation. The database schema should be complete enough that Phase 6 (Risk Score Engine) can plug directly into it. Seed data should include realistic tenant profiles that will produce different score levels when the engine runs.
