# Roadmap: Leasefy

## Overview

Leasefy evoluciona de un frontend con mock data a una plataforma AI-agent donde propietarios e inmobiliarias hablan con un orquestador que despacha agentes especializados. Este roadmap cubre el frontend de la experiencia Beta — la interfaz conversacional, visualización de agentes, sistema de decisiones y briefings. El backend (orquestador, agentes, memoria) lo construye un desarrollador independiente usando nuestra documentación.

## Milestones

- ✅ **v1.0 Frontend MVP** - Phases 1-11 (shipped 2026-01-29)
- ✅ **v2.0 Design System & QA** - Phases 12-16 (shipped 2026-02-02)
- ✅ **v3.0 Inmobiliaria Module** - Inmobiliaria 1-10 (shipped 2026-02-08)
- ✅ **v3.1 Landing & SEO** - i18n, pricing, SEO (shipped 2026-02-10)
- 🚧 **v4.0 AI Agent Platform Beta** - Phases 17-25 (in progress)

## Phases

**Phase Numbering:**
- Phases 1-16: v1.0-v2.0 (complete)
- Inmobiliaria 1-10: v3.0 (complete)
- Phases 17-25: v4.0 AI Agent Platform Beta (current)

- [x] **Phase 1-16**: v1.0-v2.0 complete (see collapsed details below)
- [x] **Inmobiliaria 1-10**: v3.0 complete
- [x] **Phase 17: Beta Sidebar Integration** - Add Beta section to both dashboards with AI-optimized layout
- [x] **Phase 18: Chat Interface** - Core conversational UI with streaming, markdown, suggested prompts
- [x] **Phase 19: Conversation Management** - History, search, conversation list with date grouping
- [ ] **Phase 20: Agent Activity Display** - Visual agent execution indicators and inline result cards
- [ ] **Phase 21: Decision System** - Pending decision cards with options, recommendations, history
- [ ] **Phase 22: Briefing Display** - Daily/weekly AI briefings with sections and actions
- [ ] **Phase 23: Preferences & Autonomy** - AI autonomy settings, notification prefs, thresholds
- [ ] **Phase 24: API Client & Backend Docs** - Typed API client, mock layer, complete backend API spec
- [ ] **Phase 25: Polish & QA** - Dark mode, responsive, i18n, a11y, keyboard shortcuts

## Phase Details

<details>
<summary>✅ v1.0 Frontend MVP (Phases 1-11) — SHIPPED 2026-01-29</summary>

### Phase 1-11
All phases complete. Property catalog, application wizard, risk score display, landlord/tenant dashboards, contracts, pricing, maps, auth UI, UX polish.

</details>

<details>
<summary>✅ v2.0 Design System & QA (Phases 12-16) — SHIPPED 2026-02-02</summary>

### Phase 12-16
Design tokens, component redesign, QA functionality/visual audit, responsive/a11y audit, contract UX.

</details>

<details>
<summary>✅ v3.0 Inmobiliaria Module (10 phases) — SHIPPED 2026-02-08</summary>

### Inmobiliaria 1-10
Dashboard KPIs, propietarios, consignaciones, agentes, pipeline, cobros, dispersiones, reportes, operaciones, configuracion/docs/analytics.

</details>

<details>
<summary>✅ v3.1 Landing & SEO — SHIPPED 2026-02-10</summary>

i18n across entire codebase (ES/EN), pricing page redesign, SEO optimization (OG images, metadata, JSON-LD), locale fix.

</details>

### 🚧 v4.0 AI Agent Platform Beta

**Milestone Goal:** Interfaz conversacional AI en sección "Beta" de los dashboards existentes. El usuario habla con un orquestador que despacha agentes especializados. Frontend completo con mock data; documentación completa para que el backend developer implemente el orquestador y agentes con Claude API.

#### Phase 17: Beta Sidebar Integration
**Goal**: Beta section integrada en ambos dashboards sin romper funcionalidad existente
**Depends on**: Nothing (first v4.0 phase)
**Requirements**: BETA-01, BETA-02, BETA-03, BETA-04, BETA-05, BETA-06
**Success Criteria** (what must be TRUE):
  1. Sidebar de propietarios muestra item "Beta" con ícono AI/sparkle
  2. Sidebar de inmobiliarias muestra item "Beta" con ícono AI/sparkle
  3. Rutas /panel/beta y /panel/inmobiliaria/beta cargan layout dedicado
  4. Layout Beta tiene estructura optimizada para chat (no el layout estándar de páginas)
  5. Badge "Beta" visible indicando estado experimental
  6. Todas las páginas existentes del dashboard siguen funcionando sin cambios
**Research**: Likely (chat layout patterns, Claude Code-style UX)
**Research topics**: Chat-first layouts, sidebar integration patterns for AI assistants
**Plans**: 2 plans

Plans:
- [x] 17-01: Sidebar nav items + route structure for Beta in both dashboards
- [x] 17-02: Beta layout shell with chat-optimized structure

#### Phase 18: Chat Interface
**Goal**: Experiencia de chat conversacional completa con streaming y markdown
**Depends on**: Phase 17
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, CHAT-10
**Success Criteria** (what must be TRUE):
  1. Usuario puede escribir mensaje y enviarlo (Enter o botón)
  2. Mensajes del usuario aparecen como burbujas a la derecha
  3. Respuestas del asistente aparecen a la izquierda con branding Leasefy AI
  4. Texto del asistente aparece con efecto streaming (carácter por carácter)
  5. Respuestas soportan markdown (negritas, listas, tablas)
  6. Indicador de "escribiendo" visible mientras AI procesa
  7. Chat auto-scroll al último mensaje
  8. Mensaje de bienvenida con prompts sugeridos para nuevos usuarios
**Research**: Likely (SSE streaming patterns, markdown rendering in React)
**Research topics**: react-markdown, SSE client patterns, Vercel AI SDK chat hooks
**Plans**: 3 plans

Plans:
- [x] 18-01: Chat input component + message bubble components
- [x] 18-02: Streaming text renderer + markdown support
- [x] 18-03: Welcome state, suggested prompts, auto-scroll, typing indicator

#### Phase 19: Conversation Management
**Goal**: Historial de conversaciones navegable con búsqueda
**Depends on**: Phase 18
**Requirements**: CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, CONV-06
**Success Criteria** (what must be TRUE):
  1. Panel lateral muestra lista de conversaciones pasadas
  2. Botón "Nueva conversación" crea thread limpio
  3. Títulos auto-generados del primer mensaje del usuario
  4. Conversaciones agrupadas por fecha (Hoy, Ayer, Esta semana, Anterior)
  5. Acción de eliminar conversación con confirmación
  6. Búsqueda filtra conversaciones por texto
**Research**: Unlikely (standard list/search UI patterns)
**Plans**: 2 plans

Plans:
- [x] 19-01: Conversation list panel with date grouping and search
- [x] 19-02: New conversation, delete, title generation

#### Phase 20: Agent Activity Display
**Goal**: Visualización clara de qué agentes están ejecutando y sus resultados
**Depends on**: Phase 18
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06
**Success Criteria** (what must be TRUE):
  1. Indicador visual cuando el orquestador está despachando agentes
  2. Badges con nombre e ícono de cada agente (Cobranza, Pipeline, Documentos, etc.)
  3. Estado de ejecución visible (ejecutando/completado/fallido) inline
  4. Cards de resultado del agente colapsables dentro de la conversación
  5. Múltiples agentes pueden mostrarse ejecutando simultáneamente
  6. Estado de error con opción de reintentar
**Research**: Likely (agent visualization patterns, real-time status updates)
**Research topics**: Tool use visualization, Claude Code-style agent indicators, SSE event patterns
**Plans**: 2 plans

Plans:
- [ ] 20-01: Agent execution indicators + status badges
- [ ] 20-02: Agent result cards (collapsible, inline) + error states

#### Phase 21: Decision System
**Goal**: Sistema de decisiones pendientes donde AI presenta opciones y usuario decide
**Depends on**: Phase 18
**Requirements**: DCSN-01, DCSN-02, DCSN-03, DCSN-04, DCSN-05, DCSN-06
**Success Criteria** (what must be TRUE):
  1. Cards de decisión pendiente con 2-4 opciones integradas en el chat
  2. Cada opción muestra indicador de recomendación AI
  3. Usuario puede seleccionar opción que se envía como respuesta
  4. Cards de decisión se vuelven read-only después de seleccionar
  5. Contador de decisiones pendientes visible en sidebar
  6. Historial de decisiones accesible
**Research**: Unlikely (card-based selection UI, existing shadcn patterns)
**Plans**: 2 plans

Plans:
- [ ] 21-01: Decision card component with options, recommendations, selection
- [ ] 21-02: Decision counter badge, history view, read-only state

#### Phase 22: Briefing Display
**Goal**: Briefings diarios/semanales del AI con resumen ejecutivo y acciones
**Depends on**: Phase 18
**Requirements**: BRFG-01, BRFG-02, BRFG-03, BRFG-04, BRFG-05, BRFG-06
**Success Criteria** (what must be TRUE):
  1. Card de briefing diario visible al tope de la sección Beta
  2. Secciones del briefing: cobros, pipeline, mantenimiento, decisiones pendientes
  3. Cada sección expandible/colapsable
  4. Acciones tipo "Cuéntame más sobre cobros" abren chat con contexto
  5. Badge de notificación cuando hay nuevo briefing
  6. Briefings históricos navegables por fecha
**Research**: Unlikely (dashboard card patterns, existing component library)
**Plans**: 2 plans

Plans:
- [ ] 22-01: Briefing card with sections (cobros, pipeline, maint, decisions)
- [ ] 22-02: Briefing history, notification badge, chat integration actions

#### Phase 23: Preferences & Autonomy
**Goal**: Configuración de autonomía AI y preferencias del usuario
**Depends on**: Phase 17
**Requirements**: PREF-01, PREF-02, PREF-03, PREF-04, PREF-05
**Success Criteria** (what must be TRUE):
  1. Página de configuración de autonomía por categoría de agente
  2. Toggles auto/preguntar-primero/manual para cada tipo de agente
  3. Preferencias de notificación configurables
  4. Selector de tono de comunicación (formal/casual/profesional)
  5. Umbrales configurables (tolerancia mora, límites presupuesto mantenimiento)
**Research**: Unlikely (form/settings page patterns, existing config pages in inmobiliaria)
**Plans**: 2 plans

Plans:
- [ ] 23-01: Autonomy settings page with per-agent toggles
- [ ] 23-02: Notification preferences, tone selector, threshold settings

#### Phase 24: API Client & Backend Documentation
**Goal**: Capa de integración frontend-backend completa + documentación para backend dev
**Depends on**: Phase 18, Phase 20, Phase 21, Phase 22, Phase 23
**Requirements**: APIC-01, APIC-02, APIC-03, APIC-04, APIC-05, APIC-06, DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08
**Success Criteria** (what must be TRUE):
  1. Módulo de API client con TypeScript types para todos los endpoints
  2. Cliente SSE/streaming funcional para respuestas de chat en tiempo real
  3. Mock API responses que simulan comportamiento realista del orquestador
  4. Simulación de ejecución de agentes (delays, status updates)
  5. Flag de entorno para cambiar entre mock y API real
  6. Documento docs/BACKEND-API-V4.md con spec OpenAPI-style completa
  7. AI-AGENT-ARCHITECTURE.md actualizado con contrato exacto del frontend
**Research**: Likely (SSE patterns, Vercel AI SDK, OpenAPI spec format)
**Research topics**: Vercel AI SDK streaming, EventSource API, OpenAPI 3.0 spec patterns
**Plans**: 3 plans

Plans:
- [ ] 24-01: API client module + TypeScript types + environment switching
- [ ] 24-02: SSE streaming client + mock API layer with agent simulation
- [ ] 24-03: Backend API documentation (OpenAPI spec + architecture update)

#### Phase 25: Polish & QA
**Goal**: Beta section pulida, accesible, responsive, i18n, sin errores
**Depends on**: All previous v4.0 phases
**Requirements**: PLSH-01, PLSH-02, PLSH-03, PLSH-04, PLSH-05, PLSH-06, PLSH-07
**Success Criteria** (what must be TRUE):
  1. Dark mode funcional en toda la UI de Beta
  2. Experiencia mobile: chat full-screen, conversaciones como drawer
  3. Todos los strings Beta disponibles en ES y EN
  4. Atajos de teclado: Cmd+K nueva conversación, Esc cerrar
  5. Accesibilidad: screen reader, focus management, ARIA labels
  6. Loading states y error boundaries en todas las páginas Beta
  7. TypeScript strict, zero warnings en build
**Research**: Unlikely (established QA patterns from v2.0)
**Plans**: 3 plans

Plans:
- [ ] 25-01: Dark mode + responsive mobile chat
- [ ] 25-02: i18n strings + keyboard shortcuts + accessibility
- [ ] 25-03: Loading states, error boundaries, TypeScript strict, build validation

## Progress

**Execution Order:**
Phases 17 → 18 → 19 (can parallel with 20, 21, 22) → 23 → 24 → 25

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 17. Beta Sidebar Integration | 2/2 | Complete | 2026-02-10 |
| 18. Chat Interface | 3/3 | Complete | 2026-02-10 |
| 19. Conversation Management | 2/2 | Complete | 2026-02-10 |
| 20. Agent Activity Display | 2/2 | Complete | 2026-02-10 |
| 21. Decision System | 2/2 | Complete | 2026-02-10 |
| 22. Briefing Display | 0/2 | Not started | - |
| 23. Preferences & Autonomy | 0/2 | Not started | - |
| 24. API Client & Backend Docs | 0/3 | Not started | - |
| 25. Polish & QA | 0/3 | Not started | - |

## Notes

### What We Build (Frontend)
- Chat UI with streaming, markdown, conversation management
- Agent execution visualization (badges, spinners, result cards)
- Decision system (pending options, selection, history)
- Briefing display (daily summary, sections, actions)
- Preferences & autonomy settings
- Mock API layer simulating real backend behavior
- All Beta UI components

### What Backend Dev Builds (Using Our Docs)
- Claude API orchestrator with tool use
- Specialized agents (cobranza, pipeline, mantenimiento, documentos, comunicación, proactivo)
- 3-level memory system (short/medium/long term)
- WhatsApp gateway via Twilio
- Real database models and migrations
- SSE/streaming endpoints
- Background jobs for proactive briefings
- Architecture reference: `docs/AI-AGENT-ARCHITECTURE.md`

### Mock Data Strategy (v4.0)
- Mock conversations with realistic Colombian rental scenarios
- Mock agent executions with simulated delays (1-3s per agent)
- Mock briefing data with cobros, pipeline, mantenimiento summaries
- Mock decisions: "Renovar contrato?", "Aprobar candidato score 78?", "Autorizar reparación $450K?"
- Environment flag (`NEXT_PUBLIC_USE_MOCK_API=true`) for seamless switch to real backend

---
*Roadmap created: 2026-01-18 (v1.0)*
*Last updated: 2026-02-10 (v4.0 AI Agent Platform Beta)*
