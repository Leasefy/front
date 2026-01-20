# Phase 5: Landlord Dashboard - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<vision>
## How This Should Work

When landlords log in, they see their properties as cards with application counts — "5 candidatos" badges that show where the action is. It's a **property-first** experience: pick a property, then see all candidates for that property.

Candidates appear as **quick comparison cards** — landlords can scan 3-4 at a glance without clicking into details. Each card shows everything needed for basic decisions: the A/B/C/D score badge, key metrics (income, stability, history), and a short AI "asesor" snippet.

When a candidate looks promising, expand to see the full AI explanation from Phase 4 — the conversational scoring with drivers, flags, and suggested conditions. Decisions happen at both levels: quick actions on the card for obvious choices, detail view for important decisions that need the full context.

The overall feel is **premium service** — like having a property manager who already did all the homework. The AI analyzed everyone, ranked them, wrote assessments. The landlord just reviews the advisor's recommendations and makes the final call.

</vision>

<essential>
## What Must Be Nailed

- **Easy comparison** — Landlords can quickly compare candidates without clicking into each one. Badge + metrics + AI snippet all visible on the card.
- **Property-first navigation** — Start with properties, drill into candidates. Not a global inbox of all applications.
- **Premium service feel** — The AI did the work, landlord just decides. Like having an expert property manager.

</essential>

<specifics>
## Specific Ideas

- Property landing: Cards showing property photo + "X candidatos" badge
- Candidate cards: Score badge prominent, key metrics visible, short AI summary snippet
- Decision buttons: Pre-aprobar, Aprobar, Rechazar visible on card AND in detail view
- Detail view: Full RiskScoreDisplay from Phase 4 with typing animation
- Notes functionality: Nice to have, not essential for v1

</specifics>

<notes>
## Additional Context

This phase builds heavily on Phase 4's RiskScoreDisplay components. The candidate cards are essentially compact versions of the score display, with the full experience available on expand.

The "asesor de confianza" tone established in Phase 4 should extend to the dashboard — the whole experience should feel like working with a knowledgeable property manager.

Mock data: Use the 12 candidates created in Phase 4, associate them with properties for testing.

</notes>

---

*Phase: 05-landlord-dashboard*
*Context gathered: 2026-01-19*
