# Requirements: Leasefy

**Defined:** 2026-01-18
**Updated:** 2026-02-10 (v4.0 requirements added)
**Core Value:** El usuario habla, los agentes ejecutan. La plataforma opera como un equipo autónomo de administración de arriendos.

## v1-v3 Requirements (COMPLETE)

All v1 through v3.1 requirements shipped. See previous milestones in MILESTONES.md.

<details>
<summary>v1 Requirements (54 total — all complete)</summary>

### Foundation (FUND) — Phase 1 ✓
- [x] **FUND-01**: Next.js 14 App Router project scaffolded with TypeScript
- [x] **FUND-02**: Tailwind CSS + shadcn/ui configured
- [x] **FUND-03**: Prisma + PostgreSQL schema initialized
- [x] **FUND-04**: Project deploys to Vercel successfully
- [x] **FUND-05**: Seed data script creates demo content

### Authentication (AUTH) — Phase 2 ✓
- [x] **AUTH-01**: User can register with email magic link (OTP)
- [x] **AUTH-02**: User can log in with magic link
- [x] **AUTH-03**: User session persists across browser refresh
- [x] **AUTH-04**: User can log out from any page
- [x] **AUTH-05**: User role distinction (tenant vs landlord) established

### Catalog (CATL) — Phase 3 ✓
- [x] **CATL-01** through **CATL-07**: Property catalog with filters, wishlist, detail, map

### Property Management (PROP) — Phase 4 ✓
- [x] **PROP-01** through **PROP-05**: Property CRUD and photo management

### Application Flow (APPL) — Phase 5 ✓
- [x] **APPL-01** through **APPL-08**: Application wizard with autosave

### Risk Score Engine (SCOR) — Phase 6 ✓
- [x] **SCOR-01** through **SCOR-11**: Full scoring engine display

### Tenant Experience (TENT) — Phase 7 ✓
- [x] **TENT-01** through **TENT-05**: Tenant tracking dashboard

### Landlord Experience (LAND) — Phase 8 ✓
- [x] **LAND-01** through **LAND-12**: Landlord candidate management

### State Machine (STAT) — Phase 9 ✓
- [x] **STAT-01** through **STAT-04**: Application state transitions

### UX Premium (UXPL) — Phase 10 ✓
- [x] **UXPL-01** through **UXPL-05**: Skeletons, empty states, micro-interactions

</details>

## v4.0 Requirements — AI Agent Platform Beta

Requirements for v4.0 milestone. **Scope: Frontend UI + Backend API documentation.**
Claude builds the frontend. Backend developer builds the AI orchestrator and agents using our documentation.

### Beta Sidebar Integration (BETA)

- [x] **BETA-01**: "Beta" section visible in propietarios sidebar with sparkle/AI icon
- [x] **BETA-02**: "Beta" section visible in inmobiliarias sidebar with sparkle/AI icon
- [x] **BETA-03**: Beta section has its own route group (/panel/beta/*, /panel/inmobiliaria/beta/*)
- [x] **BETA-04**: Beta section has dedicated layout with chat-optimized structure
- [x] **BETA-05**: Beta badge/label indicates experimental status
- [x] **BETA-06**: Existing dashboard functionality unchanged (no regressions)

### Chat Interface (CHAT)

- [x] **CHAT-01**: Chat input with send button, Enter to send, Shift+Enter for newline
- [x] **CHAT-02**: User message bubbles (right-aligned, user avatar/initials)
- [x] **CHAT-03**: Assistant message bubbles (left-aligned, Leasefy AI branding)
- [x] **CHAT-04**: Streaming text display (typewriter/character-by-character rendering)
- [x] **CHAT-05**: Markdown rendering in assistant messages (bold, lists, tables, code)
- [x] **CHAT-06**: Typing indicator while AI is processing
- [x] **CHAT-07**: Auto-scroll to latest message
- [x] **CHAT-08**: Welcome message with suggested prompts for first-time users
- [x] **CHAT-09**: Conversation persists across page navigation within session
- [x] **CHAT-10**: Empty state when no conversations exist

### Conversation Management (CONV)

- [x] **CONV-01**: Conversation list sidebar showing past conversations
- [x] **CONV-02**: New conversation button creates fresh thread
- [x] **CONV-03**: Conversation titles auto-generated from first message
- [x] **CONV-04**: Conversations grouped by date (Hoy, Ayer, Esta semana, Anterior)
- [x] **CONV-05**: Delete conversation action with confirmation
- [x] **CONV-06**: Search/filter conversations by text

### Agent Activity Display (AGNT)

- [x] **AGNT-01**: Visual indicator when AI orchestrator is dispatching agents
- [x] **AGNT-02**: Agent name badges with icons (Cobranza, Pipeline, Documentos, Mantenimiento, etc.)
- [x] **AGNT-03**: Agent execution status (running/completed/failed) shown inline
- [x] **AGNT-04**: Agent result cards displayed inline in conversation (collapsible detail)
- [x] **AGNT-05**: Multiple agents can show as executing simultaneously
- [x] **AGNT-06**: Error state when agent execution fails with retry option

### Decision System (DCSN)

- [ ] **DCSN-01**: Pending decision cards embedded in conversation with 2-4 options
- [ ] **DCSN-02**: Each option shows AI recommendation indicator (recommended/neutral/not recommended)
- [ ] **DCSN-03**: User can select an option which sends it as their response
- [ ] **DCSN-04**: Decision cards become read-only after selection (shows what was chosen)
- [ ] **DCSN-05**: Pending decisions counter in Beta sidebar nav item
- [ ] **DCSN-06**: Decision history accessible (what was decided and when)

### Briefing Display (BRFG)

- [ ] **BRFG-01**: Daily briefing card displayed at top of Beta section
- [ ] **BRFG-02**: Briefing sections: cobros summary, pipeline updates, mantenimiento, decisiones pendientes
- [ ] **BRFG-03**: Each briefing section expandable/collapsible
- [ ] **BRFG-04**: Briefing actions: "Cuéntame más sobre cobros" → opens chat with context
- [ ] **BRFG-05**: New briefing notification badge in sidebar
- [ ] **BRFG-06**: Historical briefings browsable by date

### Preferences & Autonomy (PREF)

- [ ] **PREF-01**: Settings page for AI autonomy levels per category (cobranza, mantenimiento, comunicación)
- [ ] **PREF-02**: Autonomy toggles: auto/ask-first/manual for each agent type
- [ ] **PREF-03**: Notification preferences: what AI notifies about and via which channel
- [ ] **PREF-04**: Communication tone preference (formal/casual/professional)
- [ ] **PREF-05**: Threshold settings (mora tolerance, maintenance budget limits)

### API Client & Mock Layer (APIC)

- [x] **APIC-01**: API client module with typed endpoints for chat, conversations, decisions, briefings
- [x] **APIC-02**: SSE/streaming client for real-time chat responses
- [x] **APIC-03**: Mock API responses that simulate realistic orchestrator behavior
- [x] **APIC-04**: Mock agent execution simulation (delays, status updates)
- [x] **APIC-05**: Mock briefing data with realistic Colombian rental scenarios
- [x] **APIC-06**: Environment flag to switch between mock and real API

### Backend API Documentation (DOCS)

- [x] **DOCS-01**: OpenAPI-style spec for POST /api/v1/ai/message (chat endpoint with streaming)
- [x] **DOCS-02**: OpenAPI-style spec for GET/POST/DELETE /api/v1/ai/conversations
- [x] **DOCS-03**: OpenAPI-style spec for GET/POST /api/v1/ai/decisions
- [x] **DOCS-04**: OpenAPI-style spec for GET /api/v1/ai/briefings
- [x] **DOCS-05**: OpenAPI-style spec for GET/PUT /api/v1/ai/preferences
- [x] **DOCS-06**: WebSocket/SSE protocol documentation for streaming responses
- [x] **DOCS-07**: Agent execution status event schema documentation
- [x] **DOCS-08**: Updated AI-AGENT-ARCHITECTURE.md with exact frontend contract

### Polish & QA (PLSH)

- [ ] **PLSH-01**: Dark mode compatible across all Beta UI
- [ ] **PLSH-02**: Responsive design: mobile chat experience (full-screen chat)
- [ ] **PLSH-03**: i18n support (ES/EN) for all Beta strings
- [ ] **PLSH-04**: Keyboard shortcuts (Cmd+K for new chat, Esc to close)
- [ ] **PLSH-05**: Accessibility: screen reader support, focus management
- [ ] **PLSH-06**: Loading states and error boundaries for all Beta pages
- [ ] **PLSH-07**: TypeScript strict mode, zero build warnings

## Out of Scope (v4.0)

| Feature | Reason |
|---------|--------|
| Real AI orchestrator backend | Backend developer builds this using our docs |
| Real agent execution | Mock simulation in frontend, real in backend |
| WhatsApp integration backend | Documented in API spec, backend implements |
| Real Claude API calls | Backend responsibility |
| Payment processing | Separate backend concern |
| ML-based scoring | Future milestone |
| Multi-country | Colombia only |
| Bland.ai phone calls | Future phase, not beta |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BETA-01 | Phase 17 | Complete |
| BETA-02 | Phase 17 | Complete |
| BETA-03 | Phase 17 | Complete |
| BETA-04 | Phase 17 | Complete |
| BETA-05 | Phase 17 | Complete |
| BETA-06 | Phase 17 | Complete |
| CHAT-01 | Phase 18 | Complete |
| CHAT-02 | Phase 18 | Complete |
| CHAT-03 | Phase 18 | Complete |
| CHAT-04 | Phase 18 | Complete |
| CHAT-05 | Phase 18 | Complete |
| CHAT-06 | Phase 18 | Complete |
| CHAT-07 | Phase 18 | Complete |
| CHAT-08 | Phase 18 | Complete |
| CHAT-09 | Phase 18 | Complete |
| CHAT-10 | Phase 18 | Complete |
| CONV-01 | Phase 19 | Pending |
| CONV-02 | Phase 19 | Pending |
| CONV-03 | Phase 19 | Pending |
| CONV-04 | Phase 19 | Pending |
| CONV-05 | Phase 19 | Pending |
| CONV-06 | Phase 19 | Pending |
| AGNT-01 | Phase 20 | Pending |
| AGNT-02 | Phase 20 | Pending |
| AGNT-03 | Phase 20 | Pending |
| AGNT-04 | Phase 20 | Pending |
| AGNT-05 | Phase 20 | Pending |
| AGNT-06 | Phase 20 | Pending |
| DCSN-01 | Phase 21 | Complete |
| DCSN-02 | Phase 21 | Complete |
| DCSN-03 | Phase 21 | Complete |
| DCSN-04 | Phase 21 | Complete |
| DCSN-05 | Phase 21 | Complete |
| DCSN-06 | Phase 21 | Complete |
| BRFG-01 | Phase 22 | Complete |
| BRFG-02 | Phase 22 | Complete |
| BRFG-03 | Phase 22 | Complete |
| BRFG-04 | Phase 22 | Complete |
| BRFG-05 | Phase 22 | Complete |
| BRFG-06 | Phase 22 | Complete |
| PREF-01 | Phase 23 | Complete |
| PREF-02 | Phase 23 | Complete |
| PREF-03 | Phase 23 | Complete |
| PREF-04 | Phase 23 | Complete |
| PREF-05 | Phase 23 | Complete |
| APIC-01 | Phase 24 | Complete |
| APIC-02 | Phase 24 | Complete |
| APIC-03 | Phase 24 | Complete |
| APIC-04 | Phase 24 | Complete |
| APIC-05 | Phase 24 | Complete |
| APIC-06 | Phase 24 | Complete |
| DOCS-01 | Phase 24 | Complete |
| DOCS-02 | Phase 24 | Complete |
| DOCS-03 | Phase 24 | Complete |
| DOCS-04 | Phase 24 | Complete |
| DOCS-05 | Phase 24 | Complete |
| DOCS-06 | Phase 24 | Complete |
| DOCS-07 | Phase 24 | Complete |
| DOCS-08 | Phase 24 | Complete |
| PLSH-01 | Phase 25 | Pending |
| PLSH-02 | Phase 25 | Pending |
| PLSH-03 | Phase 25 | Pending |
| PLSH-04 | Phase 25 | Pending |
| PLSH-05 | Phase 25 | Pending |
| PLSH-06 | Phase 25 | Pending |
| PLSH-07 | Phase 25 | Pending |

**Coverage:**
- v4.0 requirements: 63 total
- Mapped to phases: 63
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-18 (v1)*
*Last updated: 2026-02-10 after v4.0 roadmap creation*
