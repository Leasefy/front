# Phase 4: Risk Score Display - Plan Breakdown

**Phase Goal**: Premium AI scoring visualization - THE core differentiator
**Depends on**: Phase 3 (Application Wizard)
**Priority**: MOST IMPORTANT - Core value proposition

## Success Criteria (from main ROADMAP.md)

1. Score card with A/B/C/D level badge (prominent but not dominant)
2. **Conversational AI explanation** - "Basado en lo que veo, este candidato..."
3. Asesor de confianza tone - professional but warm
4. Key drivers displayed as supporting points
5. Risk flags shown as subtle warnings (not alarmist)
6. Suggested conditions based on profile
7. Score breakdown by category (collapsible detail)

## Design Philosophy

From FRONTEND-VISION.md:
- **Conversational AI explanation style** - narrative leads, level badge as visual backup
- **"Asesor de confianza" tone** - professional but warm, like a trusted advisor
- **Example tone**: "Basado en lo que veo, este candidato tiene buen perfil porque..."

## Plans Breakdown

### PLAN-01: Risk Score Types & Mock Data
**Goal**: Data foundation for all risk score UI
**Scope**: Types, mock candidates, pre-calculated scores
**Tasks**:
- Define RiskScore types (level, score, categories, drivers, flags)
- Define Candidate types (person + application + score)
- Create mock candidates data (10+ with varied profiles)
- Create mock AI explanations for each level
- Export constants for score levels (A/B/C/D) with colors

### PLAN-02: Score Card Component
**Goal**: Visual score display with level badge
**Scope**: ScoreCard, LevelBadge, CategoryBreakdown components
**Tasks**:
- Create LevelBadge component (A/B/C/D with colors)
- Create ScoreCard component (badge + summary)
- Create CategoryBreakdown accordion (income, stability, history)
- Style with Luxterra aesthetic
- Mobile responsive

### PLAN-03: Conversational AI Explanation
**Goal**: THE differentiator - "asesor de confianza" narrative
**Scope**: AIExplanation component with animated typing
**Tasks**:
- Create AIExplanation component
- Implement typing animation effect
- Display key drivers as bullet points
- Show risk flags as subtle warnings
- Add suggested conditions section
- Create conversational tone templates

### PLAN-04: Integration & Demo Page
**Goal**: Showcase risk score in context
**Scope**: Demo page, candidate selection, full flow
**Tasks**:
- Create /demo/score page for testing
- Candidate selector dropdown
- Full RiskScoreDisplay composite component
- Integration with landlord dashboard preview
- Responsive testing

## Execution Order

```
PLAN-01 (Types + Data) → PLAN-02 (Score Card) → PLAN-03 (AI Explanation) → PLAN-04 (Integration)
```

All plans can be done sequentially as each builds on the previous.

## Key Technical Decisions

1. **No backend dependency** - All scores pre-calculated in mock data
2. **Typing animation** - Use CSS or framer-motion for AI explanation
3. **Collapsible sections** - shadcn Accordion for category breakdown
4. **Level colors**: A=emerald, B=blue, C=amber, D=red
5. **Mobile-first** - Score card must work beautifully on phones

## Notes

- Phase 4 is the MOST IMPORTANT phase per FRONTEND-VISION.md
- This is what makes Arriendo Facil different from competitors
- The AI explanation tone is critical - warm, professional, trustworthy
- Landlords should feel confident making decisions based on these explanations

---
*Phase planned: 2026-01-19*
