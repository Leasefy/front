# Leasefy Frontend (rent/mvp)

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

## Architectural Update (2026-04-07)

**Mastra and the AI agents now live in a separate microservice repo: [`Leasefy/agent`](https://github.com/Leasefy/agent).**

This frontend repo (`Leasefy/front`) no longer contains `src/mastra/`. The frontend consumes the agent service via HTTP API. Local dev requires cloning `Leasefy/agent` as a sibling directory and running it alongside this app:

```
~/rent/
  ├── mvp/      ← this repo (frontend, Next.js 14)
  ├── agent/    ← Leasefy/agent (microservice, runs on :4000)
  └── back-main/ ← Leasefy/back (monolith backend)
```

To run agents locally, see `~/rent/agent/INTEGRATION_CHECKLIST.md`.

## What This Is

This repo is the **frontend** for Leasefy's agency dashboard. It used to host the first 2 AI agents (tenant-scoring, smart-matching) directly, but the agent code was extracted into the `Leasefy/agent` microservice on 2026-04-07 (commit `60e773c`). The frontend keeps the UI for agents (cards, activity feed, execution panel) and calls the microservice via API.

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
Frontend (this repo, Leasefy/front)
   ├── Agent UI (cards, execution panel, activity feed)
   └── HTTP client → AGENT_SERVICE_URL
                       │
                       ▼
        Leasefy/agent (microservice, port :4000)
          ├── Mastra (agent orchestrator)
          │   ├── Agents: tenant-scoring, smart-matching, suggestion-email
          │   └── Tools: calculate-score, calculate-compatibility,
          │              extract-document, escalate-to-human, etc.
          ├── Inngest functions (durable pipelines)
          │   ├── tenant-scoring-pipeline
          │   ├── smart-matching-pipeline
          │   └── daily-stale-property-report
          ├── Express server with JWT auth + role checks
          ├── Prisma + Supabase Postgres
          └── lib/ — credit-score, fraud-detection, income-analysis,
                     consistency-check, document-freshness
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
# Frontend (this repo)
pnpm install
pnpm dev
# → localhost:3000 (or 3005)
# Dashboard: /panel/inmobiliaria
# Agent Hub: /panel/inmobiliaria/ai

# Agent microservice (sibling repo, required for end-to-end agent testing)
cd ~/rent/agent
npm install
npm run db:generate
npx inngest-cli@latest dev   # Terminal A — Inngest Dev Server
npm run dev                  # Terminal B — service on :4000
curl http://localhost:4000/health   # → { "status": "ok" }
```

## Environment Variables Needed

```env
# Frontend → agent service
AGENT_SERVICE_URL=http://localhost:4000   # microservice URL
AGENT_API_KEY=leasefy-agent-secret-2026   # shared secret for /metrics etc.

# Supabase (shared with agent service)
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ⚠️ NOTE: ANTHROPIC_API_KEY, INNGEST_*, TWILIO_*, DATACREDITO_API_KEY
# live in the AGENT microservice's .env, NOT here.
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
| Mastra location | Separate repo `Leasefy/agent` | Microservice owns agents; frontend calls via HTTP. Decided 2026-04-07 (commit `60e773c`) |
