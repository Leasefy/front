---
phase: v7-03-estado-casos-hub
plan: 02
subsystem: portal-inquilino
tags: [tenant, casos, hub, dashboard, nav, CASO-01, CASO-03]
requires:
  - useTenantCases (v7-03-01) — read projection hook
  - TenantCase / CaseTone / CaseType (v7-03-01) — view-model types
  - useTenantNotifications — existing in-app notifications (CASO-03)
provides:
  - /inquilino/casos — "Mis casos" hub page
  - dashboard "Casos abiertos" stat card (real openCasesCount)
  - "Mis casos" tenant nav item
affects:
  - src/app/inquilino/page.tsx (dashboard)
  - src/app/inquilino/layout.tsx (nav)
tech-stack:
  added: []
  patterns:
    - list-hub skeleton copied from aplicaciones/page.tsx (loading Spinner + onboarding gate + error EmptyState)
    - honest "Próximamente" EmptyState sections (documentos/page.tsx precedent)
    - neutral Badge tone mapping (tone -> secondary/default/warning), icon+text pairing (DESIGN.md §7)
key-files:
  created:
    - src/app/inquilino/casos/page.tsx
  modified:
    - src/app/inquilino/page.tsx
    - src/app/inquilino/layout.tsx
decisions:
  - "Badges capped at neutral tone: neutral->secondary, info->default, attention->warning. Never destructive/alarm (Ley 1480 / PITFALLS 8)."
  - "Forward-ref types (PQRS/mantenimiento/acuerdos) render as EmptyState 'Próximamente' — zero fabricated rows."
  - "CASO-03: in-app strip links to the already-real /inquilino/notificaciones; push/WhatsApp is a disabled 'Próximamente' affordance, never 'activado'."
  - "Dashboard 'Casos abiertos' uses real openCasesCount folded into the combined loading gate; placed at the former :256 placeholder (5th card, wraps cleanly on grid-cols-2 lg:grid-cols-4)."
  - "CompleteProfileFirst context='rental' (no 'cases' context value exists; 'rental' is the neutral default)."
metrics:
  duration: ~15m
  completed: 2026-07-18
---

# Phase v7-03 Plan 02: "Mis casos" Hub + Dashboard Wiring + Nav Summary

Ships the tenant-facing **"Mis casos" hub** at `/inquilino/casos` — a read-only projection of
the tenant's real cases (pago + aplicación) as neutral status-badged rows linking to each detail
surface — plus honest **"Próximamente"** forward-ref sections and a CASO-03 in-app notifications
strip. Then wires the dashboard placeholder to a REAL "Casos abiertos" stat card and adds a
"Mis casos" nav item so the hub is reachable.

## What was built

### Task 1 — `src/app/inquilino/casos/page.tsx` (NEW)
- `'use client'` hub. Skeleton copied from `aplicaciones/page.tsx`: combined loading `Spinner`,
  `CompleteProfileFirst` onboarding gate, error `EmptyState`, `max-w-7xl` container, tenant bg
  `bg-[#f8f8f8] dark:bg-[#0e0e10]`. Source swapped for `useTenantCases()`.
- **Case list (CASO-01):** each `TenantCase` renders as a card row — type icon tile
  (pago→`CreditCard`, aplicación→`FileText`), `titulo`, a neutral status `Badge` (icon+text),
  a subline (`Responsable: {responsable} · Actualizado {relative updatedAt}`), and a `CaretRight`
  link to `case.detailLink`. Tone→Badge variant map: `neutral→secondary`, `info→default`,
  `attention→warning`. No `destructive`, no countdown, no urgency/credit-bureau copy.
- **Empty (CASO-04):** `cases.length === 0` → honest neutral `EmptyState` "Todo al día" /
  "All caught up" — never a fabricated count.
- **Forward-ref "Próximamente":** three `EmptyState`-backed cards for **PQRS** (`ChatCircle`),
  **Mantenimiento** (`Wrench`), **Acuerdos de pago** (`Handshake`). Zero rows.
- **CASO-03 strip:** a card stating Leasefy avisa **in-app** on case state changes, linking to
  `/inquilino/notificaciones` (with a subtle `unreadCount` badge from `useTenantNotifications`),
  plus a **disabled** "Push · WhatsApp — Próximamente" affordance (no "activado" state, no new
  cases poller here).

### Task 2 — dashboard stat card + nav item
- `src/app/inquilino/page.tsx`: imported `useTenantCases` + `ClipboardText`, called the hook,
  folded `casesLoading` into the combined loading gate, and **replaced the `:256` placeholder
  comment** (`{/* Casos abiertos: hub llega en v7-03 — no fabricar conteo */}`) with a real
  `<Link href="/inquilino/casos">`-wrapped "Casos" stat card showing `{openCasesCount}` +
  neutral sub-label ("Sin casos abiertos" when 0 / "Abiertos" otherwise). Existing
  Score/Arriendos/Applications/Next-Payment cards untouched.
- `src/app/inquilino/layout.tsx`: added `ClipboardText` import + a "Mis casos" / "My cases" nav
  item (`href: '/inquilino/casos'`) between Pagos and Documentos. No reorder/removal of existing
  items.

## Verification
- **Task 1 grep gate:** `GATE_OK` (useTenantCases present; ≥1 "Próximamente"; /inquilino/notificaciones present; 0 `variant="destructive"`; 0 datacr/urgency/MOCK).
- **Task 2 grep gate:** `GATE_OK` (useTenantCases + /inquilino/casos + openCasesCount on dashboard; /inquilino/casos in layout; `no fabricar conteo` comment gone).
- **`pnpm build`:** PASSED — `✓ Compiled successfully`; `/inquilino/casos` emitted (8.3 kB / 566 kB First Load).
- **`pnpm test`:** 594 passed / 7 failed (601 total). The 7 failures are the exact pre-existing set documented in `v7-01/deferred-items.md` (inmobiliaria AI / cotizador / risk-levels) — **0 NEW failures**; none touch the tenant `inquilino` portal.

## Deviations from Plan
- Used `CompleteProfileFirst context="rental"` because the component's `context` union has no
  `'cases'` member; `'rental'` is the neutral default. Cosmetic (onboarding-gate copy only).

## Threat surface
No new fetch, endpoint, authz, or schema surface introduced — the hub is a read-only projection
of already JWT-scoped `/…/mine` sources (T-v7-03-04/05/06 mitigations honored; zero new packages).
