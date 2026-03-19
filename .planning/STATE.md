# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)
See: docs/AI-AGENT-ARCHITECTURE.md (created 2026-02-10) - **AI Agent Architecture Spec**
See: docs/BACKEND-API-V4.md (created 2026-02-10) - **Backend API Spec for AI endpoints**
See: docs/BACKEND-INTEGRATION.md (created 2026-01-29) - **Backend API Contract**
See: docs/FRONTEND-ARCHITECTURE.md (created 2026-01-29) - **Frontend Structure**

**Core value:** El usuario habla, los agentes ejecutan. La plataforma opera como un equipo autónomo de administración de arriendos.
**Current focus:** v5.0 milestone complete — Frontend 100% done. Ready to integrate real backend AI or plan next milestone.

## Current Position

Milestone: v5.0 — COMPLETE
Phase: All phases complete (1-26 + P1)
Status: Between milestones — ready for /gsd:new-milestone
Last activity: 2026-03-11 — v5.0 milestone archived

Progress: ██████████ 100% (v1.0 → v5.0 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 21
- Average duration: 3.9 min
- Total execution time: 1.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 17-beta-sidebar | 2/2 | 10min | 5min |
| 18-chat-interface | 3/3 | 11min | 3.7min |
| 19-conversation-management | 2/2 | 8min | 4min |
| 20-agent-activity-display | 2/2 | 6min | 3min |
| 21-decision-system | 2/2 | 7min | 3.5min |
| 22-briefing-display | 2/2 | 8min | 4min |
| 23-preferences-autonomy | 2/2 | 7min | 3.5min |
| 24-api-client | 3/3 | 9min | 3min |
| 25-polish-qa | 3/3 | 23min | 7.7min |

**Recent Trend:**
- Last 5 plans: 24-03 (4min), 25-01 (8min), 25-02 (8min), 25-03 (7min)
- Trend: QA plans take ~7-8min (more validation steps)

## Previous Milestones

- v1.0 MVP Frontend (2026-01-29): 11 phases, 35 plans
- v2.0 Design System & QA (2026-02-02): 4 phases
- v3.0 Inmobiliaria Module (2026-02-08): 10 phases, 33 plans
- v3.1 Landing & SEO (2026-02-10): i18n, pricing, SEO

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v4.0: Orquestador pattern = Claude API + tool use (not separate LLM per agent)
- v4.0: Beta lives in sidebar section, doesn't touch existing dashboards
- v4.0: Frontend builds UI + mock layer, backend dev builds real AI using our docs
- v4.0: Memory 3 levels (short/medium/long term)
- v4.0: WhatsApp via Twilio as primary communication channel
- 17-01: "AI Beta" as nav item label (NavItem.badge only supports numbers, not string badges)
- 17-01: AppSwitcher auto-detects workspace from pathname, no manual props required
- 17-01: Beta components live in src/components/beta/, routes at /panel/beta and /panel/inmobiliaria/beta
- 17-02: Full-screen fixed overlay (z-50) for "separate universe" — beta route is outside (landlord) group
- 17-02: Sidebar hidden on mobile (hidden md:flex) — mobile chat deferred to Phase 18
- 17-02: Tab state managed locally (useState), no routing per tab yet
- 17-02: Layout files are Server Components exporting Metadata, importing client BetaLayout
- 18-01: Local useState for chat state (no external SDK), swappable to real API in Phase 24
- 18-01: Character-by-character streaming simulation with punctuation-aware pauses (~40 chars/sec)
- 18-01: ChatContainer renders BetaWelcome as empty state, switches to chat on first message
- 18-01: ChatInput always visible in both empty and active states
- 18-02: react-markdown for markdown rendering (lightweight, handles streaming partial markdown)
- 18-02: @tailwindcss/typography for prose base styling with custom chat-tight overrides
- 18-02: Headings capped at h3 size in chat bubbles to prevent oversized text
- 18-02: 12 rich mock responses with markdown tables, lists, code blocks, bold formatting
- 18-03: TypingIndicator mirrors AssistantBubble layout for visual consistency
- 18-03: Smart auto-scroll with 100px threshold (suppressed when user scrolled up)
- 18-03: BetaChatProvider wraps at BetaLayout level for session-level persistence
- 18-03: useBetaChat remains standalone; context consumes it internally for testability
- 19-01: Multi-conversation state: Conversation[] with activeConversationId
- 19-01: localStorage persistence via serializeConversations/deserializeConversations
- 19-01: Date grouping: Hoy/Ayer/Esta semana/Anterior
- 19-01: Two-click delete pattern for conversation deletion
- 19-01: Search filters by title and message content
- 19-02: Merged into 19-01 (CRUD tightly coupled with state management)
- 20-01: Phosphor icon names as strings in AGENT_METADATA, mapped to components via ICON_MAP in AgentBadge
- 20-01: Completed/failed badges override agent color with green/red for universal status clarity
- 20-01: AgentActivityIndicator uses dashed border to distinguish from regular message bubbles
- 20-01: Activity block mirrors AssistantBubble layout (avatar + content) for visual consistency
- 20-02: Agent result summaries static per agent type for mock simplicity; real API returns actual results
- 20-02: Grid-rows-[0fr]/[1fr] for collapse animation (no hardcoded max-height)
- 20-02: activeAgentBlock as top-level state during execution, persisted to message.agentActivity on completion
- 20-02: Retry always succeeds (no recursive failure) for better demo UX
- 21-01: Decision attached after streaming completes via pendingDecisionRef (not inline during stream)
- 21-01: selectDecisionOption sends "He seleccionado: [label]" for natural conversation flow
- 21-01: Recommendation badges: green Recomendado, gray Neutral, red No recomendado
- 21-01: Read-only state uses emerald ring for selected option, opacity-50 for non-selected
- 21-02: DecisionEntry as flat array for simpler rendering (not grouped map)
- 21-02: Category badge uses AGENT_METADATA color tokens for consistency
- 21-02: Pending decisions listed before resolved for action-priority UX
- 22-01: BriefingSection summary always visible (not hidden inside collapse)
- 22-01: First section expanded by default, rest collapsed
- 22-01: sendBriefingAction switches to conversations tab via onTabChange callback
- 22-01: Briefing loaded from mock data, no localStorage persistence yet
- 22-01: Action button color-coded per section matching AGENT_METADATA tokens
- 22-02: onTabChange via ref in useBetaChat for stable callback identity (avoids re-render cascades)
- 22-02: BriefingHistory replaces direct BriefingCard rendering for date navigation
- 22-02: Amber 6px dot badge for briefing notification (distinct from indigo decision counter)
- 23-01: Indigo-600 background for active autonomy level in segmented control
- 23-01: PreferencesPanel renders in main content area via BetaLayout conditional (not sidebar)
- 23-01: Deep merge in updatePreferences to avoid replacing nested objects
- 23-01: All agents default to ask_first (safest conservative default for rental management)
- 23-02: Toggle switches use role=switch with aria-checked for accessibility
- 23-02: COP formatting uses toLocaleString('es-CO') for dot-as-thousands separator
- 23-02: Score indicator 3-tier color: red (<50), amber (50-69), green (70+)
- 23-02: Global reset button at panel bottom with red hover for destructive action affordance
- 24-01: AsyncGenerator<ChatStreamEvent> for sendMessage (not EventSource) — more idiomatic for async iteration
- 24-01: Underscore-prefixed params for stub methods to suppress unused variable warnings
- 24-01: Mock mode defaults true when NEXT_PUBLIC_USE_MOCK_API env var is unset
- 24-02: reader.releaseLock() in finally block for SSE parser cleanup
- 24-02: mockApi returns static data; hooks manage their own localStorage persistence
- 24-02: toApiBriefing helper converts DailyBriefing Date to ISO string for API shape
- 24-02: Private fetch() helper on LeasefyAIClient for JSON endpoints with auth headers
- 24-03: BACKEND-API-V4.md covers all 11 endpoints + SSE + agent events in single doc for backend dev convenience
- 24-03: Section 9 of AI-AGENT-ARCHITECTURE.md replaced entirely (old list was outdated vs implemented types)
- 24-03: Documented 11 endpoints (not 10) since briefings/latest is distinct from briefings list
- 25-01: DecisionHistory category badges used dynamic Tailwind classes (bg-${color}-100) which cannot be compiled -- replaced with static CATEGORY_BADGE lookup map
- 25-01: MobileSidebarDrawer uses fixed z-[61] (above z-[60] backdrop) without portal -- simpler than createPortal
- 25-01: MobileNewChatButton as separate component inside BetaChatProvider to access context
- 25-01: Drawer auto-closes on tab change for natural mobile navigation
- 25-01: safe-area-inset-bottom uses max() function for graceful fallback on non-notch devices
- 25-03: isLoading always false in mock mode, ready for real API latency
- 25-03: BriefingCard isLoading check placed after hooks to avoid rules-of-hooks violation
- 25-03: Pre-existing build errors (Server Components prerender) not addressed - outside Beta scope
- 25-02: labelKey pattern for static arrays -- store translation key string, resolve with t() at render time
- 25-02: DATE_GROUP_KEYS Record<DateGroup, string> maps internal Spanish keys to i18n keys for display
- 25-02: BetaKeyboardShortcuts renderless component inside BetaChatProvider for context access
- 25-02: Mock data strings (AGENT_RESULT_SUMMARIES, AGENT_ERROR_MESSAGES) kept hardcoded -- will be replaced by real API
- 25-02: UserBubble "TU" kept as literal (user initials, not translatable text)

### Decisions (P1-inmobiliaria-registration)

- P1-01: apiClient has no .put() — use .patch() for PATCH requests
- P1-01: Zod not installed — TypeScript validation helpers in src/lib/validation/ instead
- P1-01: AgencySetupWizard API calls are non-blocking (try/catch proceeds) — backend may not be deployed
- P1-01: INMOBILIARIA BackendRole maps to 'agency' frontend role (alongside AGENT)
- P1-01: seleccionar-rol routes to existing /onboarding/inmobiliaria page (not a new page)
- P1-02: AlertCircle does not exist in @phosphor-icons/react — use Warning icon
- P1-02: useAgencyOnboardingStatus.ts named distinctly to avoid collision with tenant use-onboarding-status.ts
- P1-02: Middleware is pass-through only — documents public routes for future server-side auth
- P1-03: Canonical types (InvitationInfo, OnboardingStep, AgencyOnboardingStatus) in inmobiliaria.ts — hooks import from there
- P1-03: agencyApi namespace added to inmobiliaria.service.ts (not a separate service file)
- P1-03: MOCK_STEPS array remains in useAgencyOnboardingStatus — swap with agencyApi.getOnboardingStatus() when backend deploys

### Pending Todos

None yet.

### Blockers/Concerns

- Pre-existing build errors on non-Beta routes (/, /auth, /pricing) due to Server Components prerender issues. Not blocking Beta functionality.
- i18n linter concern resolved: Beta components now properly use useI18n() with beta.* translation keys.

## Session Continuity

Last session: 2026-03-11
Stopped at: P1-03 complete — P1 milestone fully done
Resume file: none (P1 complete)
