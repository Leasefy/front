# Frontend-First Vision

**Captured:** 2026-01-18
**Context:** Roadmap reorganization - frontend only, backend handled separately

## Division of Work

- **This project**: Frontend/UX experience only
- **Backend**: Another developer will build APIs based on the frontend experience we define
- **Integration**: Backend developer will integrate using our code as reference

## Core Experiences (Priority Order)

1. **Risk Scoring Display** (MOST IMPORTANT)
   - Conversational AI explanation style
   - "Asesor de confianza" tone - professional but warm
   - Level A/B/C/D as visual backup, narrative leads
   - Example: "Basado en lo que veo, este candidato tiene buen perfil porque..."

2. **Property Catalog**
   - Discovery experience
   - Browsing, filtering, property cards
   - Property detail with gallery

3. **Application Wizard**
   - Multi-step application flow
   - Document upload experience
   - Progress tracking and resume capability

4. **Landlord Dashboard**
   - Candidate evaluation experience
   - Score visualization with explanations
   - Decision-making interface

5. **Tenant Tracking**
   - Application status tracking
   - Timeline of events
   - Status updates

## Data Strategy

**Mock data realista**: All experiences work with realistic fictional data
- Believable Colombian properties, candidates, scores
- Complete user flows functional with hardcoded data
- Easy to swap for real API later

## What This Means for Phases

### Remove from scope:
- Prisma/database setup (backend responsibility)
- Seed scripts (backend responsibility)
- Scoring engine/algorithm (backend responsibility)
- State machine logic (backend responsibility)
- API endpoints (backend responsibility)

### Keep/Add to scope:
- UI components and design system
- Page layouts and navigation
- Form experiences and validation (frontend)
- Mock data for all screens
- Loading states, empty states, error states
- Responsive design
- Accessibility

---
*Vision captured: 2026-01-18*
