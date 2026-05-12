# Leasefy AI Agents Sandbox

## ⚠️ UI Work — Read FIRST

**Before building, modifying, or reviewing ANY UI in this repo, you MUST read [`docs/DESIGN.md`](./docs/DESIGN.md).**

That file is the source of truth for:
- Design principles + anti-patterns (no glass morphism, no gradients on bubbles, uppercase primary buttons, etc.)
- Canonical component patterns (drawers, buttons, inputs, cards, banners) with file:line references
- Tokens (colors, radius, shadows, motion, typography)
- Lenis smooth scroll integration (mandatory `data-lenis-prevent` + `useLenis().stop()` for modals)
- Accessibility rules

When the user asks for UI work — no matter how small — read DESIGN.md first and apply it strictly. Do NOT invent patterns when a canonical one exists. If something seems missing from DESIGN.md, ASK or extend it; don't drift.

For color specifics: [`docs/COLOR_SYSTEM.md`](./docs/COLOR_SYSTEM.md) (referenced from DESIGN.md).

---

## What This Is

Sandbox branch (`sandbox/mastra-agents`) for building Leasefy's first 2 AI agents using **Mastra** framework. This is isolated from `main` — experiment freely.

## The Goal

Build 2 production-ready autonomous agents that power Leasefy's agentic experience for real estate agencies (inmobiliarias) in Colombia.

## Tech Stack

- **Framework**: Mastra (TypeScript AI agent framework, built on Vercel AI SDK)
- **LLM**: Claude API (Anthropic) — tool use + Vision for OCR
- **Database**: Supabase (Postgres)
- **Triggers**: Inngest (durable execution, event-driven)
- **Frontend**: Next.js 14 (already built — dashboard, execution panel, activity feed)
- **Notifications**: Twilio (WhatsApp), email
- **Currency**: COP (Colombian pesos)
- **Market**: Colombia

## Agent 01: Tenant Scoring (`tenant-scoring`)

**What it does**: Evaluates rental applicants automatically.

**Pipeline**:
1. Receives documents (cédula, certificación laboral, extractos bancarios)
2. OCR extraction with Claude Vision
3. Queries DataCrédito/TransUnion (credit bureaus)
4. Analyzes consistency (salary vs bank statements, employer verification)
5. Calculates score 0-100 with level A/B/C/D
6. Generates natural language explanation
7. Produces PDF with QR verification code
8. Notifies agency team

**Score weights**:
- Financial stability: 35%
- Rental history: 25%
- Document verification: 25%
- Personal profile: 15%

**Autonomy**: Fully autonomous. Escalates to human only when:
- Possible fraud detected (severe document inconsistencies)
- Model confidence < 60%
- Illegible documents

**Target**: < 3 minutes per evaluation, < 10% escalation rate

## Agent 02: Smart Matching (`smart-matching`)

**What it does**: When a candidate applies to a property, scans the agency's entire portfolio to find compatible alternatives and sends suggestions.

**Pipeline**:
1. Candidate applies to a property
2. Analyzes candidate profile (score, budget, zone, property type)
3. Scans all available properties in portfolio
4. Calculates compatibility per property:
   - Affordability: 40%
   - Risk fit: 30%
   - Preferences: 15%
   - Acceptance probability: 15%
5. Selects top 3 suggestions with explanations
6. Sends suggestions to candidate (WhatsApp/email)
7. Notifies the zone's sales agent

**Additional behaviors**:
- Reassigns leads to the best zone agent automatically
- Re-scans properties with no applicants for 7+ days (daily cron)
- Suggests alternatives when a candidate is rejected

**Autonomy**: Fully autonomous. Notifications configurable by agency.

## Architecture

```
Mastra (agent orchestrator)
  ├── Agent: Tenant Scoring
  ├── Agent: Smart Matching
  ├── Workflows (multi-step pipelines)
  ├── Memory (shared context)
  └── Tools (Supabase, Claude Vision, Twilio, DataCrédito)
         │
         ▼
Inngest (event triggers + durable execution)
         │
         ▼
Frontend (execution panel already built in main branch)
```

## Future Agents (19 total)

After these 2, the roadmap includes:
- Collections (cobranza) — payment reminders + escalation
- Contracts — generation, e-signatures, renewals
- Disbursements — owner payouts
- Pipeline — lead funnel management
- Maintenance — repair coordination
- Renewals — proactive contract renewals
- Communication — multi-channel messaging
- Documents — PDF generation
- Analytics — reporting
- Pricing — dynamic pricing
- Property Verification — property inspection
- Visits — visit coordination
- Fraud/KYC — identity verification
- Legal — legal assistance
- Onboarding — owner/property onboarding
- Retention — owner/tenant retention

That's why we chose Mastra — it scales to 19 agents with orchestration, not just 2.

## Key Files in Main Branch

The frontend for these agents is already built:
- `src/components/inmobiliaria/ai/` — Agent cards, activity feed, execution panel, detail sidebar
- `src/lib/types/ai-agents.ts` — Agent types, mock activity data, execution traces
- `src/app/panel/inmobiliaria/ai/page.tsx` — Agent Hub page
- `src/app/panel/inmobiliaria/page.tsx` — Dashboard with agent section
- `docs/AI_AGENTS_ARCHITECTURE.md` — Full 19-agent architecture spec

## How to Run

```bash
# Install dependencies
pnpm install

# Dev server
pnpm dev

# The app runs on localhost:3000 (or 3005 if port specified)
# Login: auto-login as agency user (no Supabase needed)
# Dashboard: /panel/inmobiliaria
# Agent Hub: /panel/inmobiliaria/ai
```

## Environment Variables Needed

```env
# Required for agents
ANTHROPIC_API_KEY=sk-ant-...        # Claude API
SUPABASE_URL=https://...            # Supabase project
SUPABASE_ANON_KEY=eyJ...            # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Supabase service role (for admin ops)

# Optional (for full functionality)
TWILIO_ACCOUNT_SID=...              # WhatsApp/SMS
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+1... # WhatsApp sender number
DATACREDITO_API_KEY=...             # Credit bureau (when available)
INNGEST_EVENT_KEY=...               # Inngest triggers
INNGEST_SIGNING_KEY=...             # Inngest verification
```

## Decisions Already Made

| Decision | Choice | Why |
|----------|--------|-----|
| Agent framework | Mastra | 19 agents need structure, workflows, memory. Built on Vercel AI SDK |
| LLM | Claude (Anthropic) | Tool use, Vision for OCR, long context |
| Execution | Inngest | Durable, event-driven, no timeout limits |
| OCR | Claude Vision | No separate OCR service needed |
| Colors | Neutral/sobrio | No flashy colors for agent UI |
| Plan gating | Flex plans only | AI agents are Flex plan differentiator |
| Default plan | Flex | Demo shows all features |
