# Phase 17: Beta Sidebar Integration - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<vision>
## How This Should Work

When a propietario or inmobiliaria user clicks "AI Beta" in the app switcher, they enter a **separate universe** — a completely independent experience from the classic dashboard. It feels like entering another app within Leasefy, similar to how Slack workspaces switch between different contexts.

The experience is **ChatGPT-style** but with a twist: the sidebar isn't just conversations. It's a **Mission Control** with tabs:
- **Conversaciones** — past and active chat threads
- **Agentes** — live status of what each agent is doing (Cobranza, Pipeline, Documentos, etc.)
- **Decisiones** — pending decisions that need the user's attention
- **Briefing** — daily/weekly AI summary of their operation

The right side is the chat area where the actual conversation happens.

Switching between the classic dashboard and Beta happens via an **app switcher** at the top (like Slack workspace selector): "Dashboard" | "AI Beta" — click to switch worlds.

The visual language **matches the existing Leasefy dashboard** (same bg-plan-page, same card styles, same design tokens) but adapted to the chat-first layout. It should feel like the same product, just a different mode.

</vision>

<essential>
## What Must Be Nailed

- **Mission Control feeling** — when you enter Beta, you feel like you're in the command center of your rental operation. Not a chatbot, a command center.
- **App switcher** — clean, intuitive way to toggle between classic dashboard and AI Beta universe, like Slack workspaces
- **Separate universe** — Beta is its own layout, its own navigation, its own world. The classic sidebar disappears, replaced by the Mission Control sidebar with tabs.

</essential>

<specifics>
## Specific Ideas

- Mission Control sidebar has tabs: Conversaciones | Agentes | Decisiones | Briefing
- ChatGPT-style layout: sidebar left + chat area right
- App switcher at top of sidebar for switching between "Dashboard" and "AI Beta"
- Same visual language as existing Leasefy dashboard (not a different design system)
- Both propietarios and inmobiliarias dashboards get this Beta section
- Eventually, Beta could "kill" the rest of the platform — it should be built as a first-class experience, not an afterthought

</specifics>

<notes>
## Additional Context

The user's long-term vision is that the AI conversational interface replaces the traditional dashboard entirely. Beta is the path to that future. So this needs to feel complete and powerful from day one, not like a sidebar experiment.

The classic dashboard keeps working untouched. Both worlds coexist. The app switcher is the bridge.

Route structure should support both user types:
- Propietarios: /panel/beta/*
- Inmobiliarias: /panel/inmobiliaria/beta/*

</notes>

---

*Phase: 17-beta-sidebar-integration*
*Context gathered: 2026-02-10*
