# Portal Inquilino — Audit A ("operate the relationship" core + shell)

Scope: `/inquilino` layout/auth shell, dashboard, pagos + PayRentModal, documentos, mensajes,
arriendo (+ [leaseId]), notificaciones, configuracion, perfil. Focus pillars: **1 Pagos**,
**3 Documentos**, **6 Comunicación** + arriendo/lease, dashboard, notifs, config, auth.

Method: read every file end-to-end + traced each page's hook → service → `apiClient`
(real HTTP to `NEXT_PUBLIC_BACKEND_URL`, default `http://localhost:3000`).

---

## Pillar-mapping table

| Area | Status | One-line note |
|------|--------|---------------|
| **1 · Pagos** | **HAS (real wiring, MOCK gateway)** | Real API (`useMyPaymentRequests` / `useLeasePaymentInfo`); estado de cuenta + historial + comprobar; but "pagar" hits `POST /pse-mock/process` — a **simulated PSE**, no Wompi/Bold, no real money. Only PSE method. |
| **3 · Documentos** | **PARTIAL** | Real API (`documentsApi.getByApplication`) but shows **only application docs** (cédula, ingresos, laboral…). No contrato / paz y salvo / recibos / póliza on this page (those live only on lease detail). |
| **6 · Comunicación** | **PARTIAL** | Real chat API (`useConversations`/`useChat`, polling, optimistic send). But keyed by **applicationId** (tied to applications, not the lease relationship); attach/image/emoji buttons inert; archive/mute/report are `alert()` stubs. |
| **Arriendo / lease** | **HAS (real)** | `useLeases`/`useLease` → real API. Lease detail = property, contract/insurance/inventory downloads, landlord contact, payment history, pay CTA. Strongest page. |
| **Dashboard home** | **PARTIAL (mostly hardcoded)** | `activeLeases=[]`, `activeApplications=[]`, `nextPayment=null` are **hardcoded empty** with `TODO(Backend)`. Only featured properties + score (mock) are wired. Match % is fake. |
| **Notificaciones** | **HAS (real)** | `useTenantNotifications` → real API, 2-min poll, mark-read / mark-all / delete all real. |
| **Configuración** | **PARTIAL (mostly mock)** | Theme + locale + MFA + reset-onboarding real. Notif toggles = local state only. Password / sessions (`mockSessions`) / download-data / delete-account = `setTimeout` simulations. |
| **Perfil** | **MISSING (fully mock)** | `formData` hardcoded ("María González", **Chilean** RUT + `+56` phone + Providencia). Save/avatar/delete all simulated. No profile API. |
| **Auth / access** | **HAS** | `ProtectedRoute allowedRoles={['tenant']}` on Supabase session. Dev/test `localStorage` bypass, **disabled in production**. |
| 2 · Solicitudes/PQRS | **MISSING** | No route, no UI. |
| 4 · Estado de casos (timeline) | **MISSING** | No mora/mantenimiento/jurídico timeline anywhere. |
| 5 · Acuerdos de pago (cobranza/cuotas) | **MISSING** | No agreement/installment UI. |

Routes present under `/inquilino`: `aplicaciones, arriendo, configuracion, contratos,
documentos, explorar, guardados, mensajes, notificaciones, pagos, para-ti, perfil`.
No `solicitudes`, `pqrs`, `casos`, `acuerdos`, `cobranza`.

---

## Overall shell-vs-real verdict

**Roughly 55–60% wired to real data.** The "relationship operation" spine — **arriendo,
pagos (estado de cuenta + historial + submit), documentos, mensajes, notificaciones** — all
call the real backend via `apiClient`. The two big caveats: (1) **payments run on a mock PSE
gateway** (`/pse-mock/*`), so the rail is UI-real but financially fake — no Wompi/Bold/real
PSE, no money movement; (2) the **dashboard home hardcodes leases/applications/next-payment to
empty**, so the landing page never reflects a tenant's real state. The clearly-fake surfaces are
**perfil (100% mock, Chilean sample data)** and most of **configuración** (password/sessions/
download/delete are `setTimeout` theater). Everything else (auth gating, notifs, chat text) is real.

---

## Per-page findings

### `src/app/inquilino/layout.tsx` — shell / nav / auth
- **What it has:** `<ProtectedRoute allowedRoles={['tenant']}>` → I18nProvider → TenantProfileProvider →
  SidebarProvider → `PlanSidebar` + `PlanHeader`. Nav (translated via `useTenantNavItems`):
  Panel, Explorar, Mi Arriendo, Aplicaciones, Contratos, Pagos, Documentos, Mensajes (badge:2 hardcoded).
  Profile-completion widget driven by `localStorage('plan_onboarding_tenant')` (2 steps) with
  cross-tab `storage` + custom `onboarding-updated` events.
- **Data source:** Auth REAL (`useAuth` / Supabase). Onboarding progress = **localStorage**, not API.
  Nav badge `2` on Mensajes is **hardcoded** in nav def (real unread badge only exists in the unused sidebar).
- **Completeness:** DONE for gating.
- **Gaps:** Nav **omits Notificaciones / Perfil / Configuración** (reached via header/deeplinks only).
  No nav entries for PQRS / casos / acuerdos (they don't exist). No plan-gating logic here for tenant.

### `src/app/inquilino/page.tsx` — dashboard home
- **What it has:** greeting hero, onboarding gate (`TenantDashboardEmpty` if <2 steps), "new user" welcome
  card, 4 stat cards (Score, Arriendos, Aplicaciones, Next-payment-or-CTA), "Propiedades para ti" grid,
  applications empty-state, quick-actions, tips/help.
- **Data source:** **MOCK/hardcoded** for the core: `const activeLeases: any[] = []`, `activeApplications: any[] = []`,
  `nextPayment = null`, `primaryLease = null` — all under a `// TODO (Backend): Replace these with actual API calls`
  block. Match badge = `92 - index*5` (fake). **REAL**: `useFeaturedProperties(4)` and `useEvaluation()` score —
  though `useEvaluation` is itself mocked (localStorage + fake IDs; see the `handleDownloadPDF` TODO admitting
  "useEvaluation está mockeado"). PDF via client-side `downloadScorePDF`, not backend certificate.
- **Completeness:** PARTIAL — renders, but stat cards always show 0 leases / 0 apps regardless of real data.
- **Gaps:** Never reflects a real active lease / next payment; score not wired to real evaluation service.

### `src/app/inquilino/pagos/page.tsx` (+ PeriodStatusCard)
- **What it has:** onboarding gate; clean empty-state when no active lease (no fake Visa); 3 stat cards
  (Próximo pago, Total pagado YTD, Pendiente); paginated payment **history** (APPROVED / PENDING_VALIDATION /
  REJECTED / DISPUTED / CANCELLED with reject reason + retry); sidebar `PeriodStatusCard` (NONE→pay CTA,
  PENDING→verificación, APPROVED→al día, REJECTED→reintentar) + quick links.
- **Data source:** **REAL** — `useLeases().getActive()`, `useMyPaymentRequests()`, `useLeasePaymentInfo()` →
  `leasesApi` / `tenantPaymentRequestsApi` → `apiClient` HTTP. Stats computed from real requests.
- **Completeness:** DONE for estado-de-cuenta + historial. "Pagar" opens `PayRentModal` (mock gateway — below).
- **Gaps:** No downloadable **comprobante/receipt PDF** per payment (quick-link "Ver recibos" just points to
  /documentos, which has no receipts). No multi-lease selector (uses `activeLeases[0]` only). No late-fee/mora detail.

### `src/components/tenant/PayRentModal.tsx` — payment rail
- **What it has:** 6-step flow (loading → period-blocked → confirm → form → processing → result). Form = bank
  select + person/document type + doc number + name + email, client-side validated. Result panels SUCCESS/
  PENDING/FAILURE. Lenis pause + `data-lenis-prevent` per DESIGN.md.
- **Data source:** **REAL API, MOCK GATEWAY.** `leasesApi.getPaymentInfo` + `psePaymentsApi.getBanks()` (`GET
  /pse-mock/banks`) then `psePaymentsApi.processPayment` (`POST /pse-mock/process`). Service header comment:
  *"PSE Mock service … devuelve SUCCESS/FAILURE/PENDING de forma determinística según el último dígito del
  documento."* Not a `console.log`, but **not a real gateway** — no Wompi/Bold, no real PSE redirect, no money.
- **Completeness:** DONE as a simulation; wiring is production-shaped (409 conflict handling, PENDING→request created).
- **Gaps:** Only **PSE**; no card/Bold/Wompi/Nequi. No real bank redirect / webhook confirmation. Real settlement absent.

### `src/app/inquilino/documentos/page.tsx`
- **What it has:** onboarding gate; 3 stats (Total / Verificados / Pendientes); search + type-filter pills;
  paginated card grid (view + download); viewer modal (image `<img>`, PDF `<iframe>`, else download).
- **Data source:** **REAL** — `useMyApplications()` then `documentsApi.getByApplication(app.id)` per application →
  `apiClient`. Doc URLs are real (Supabase storage). Type config maps backend UPPER_SNAKE keys.
- **Completeness:** DONE for **application** documents.
- **Gaps:** Only **application docs** (cédula/ingresos/laboral/extractos). **No contrato, paz y salvo, recibos de
  pago, póliza** here — contract/insurance/inventory downloads live *only* on lease detail. No tenant upload from
  this page. Pillar-3 "recibos/paz y salvos" essentially missing as a document surface.

### `src/app/inquilino/mensajes/page.tsx` (+ MessagesWidget)
- **What it has:** onboarding gate → `<MessagesWidget actor="tenant" />`: conversation list (search, unread
  badges, skeletons), chat pane (optimistic send, read receipts, 5s poll), info panel, options menu.
- **Data source:** **REAL** — `useConversations`/`useChat` → `messagesApi` → `apiClient`, with polling.
- **Completeness:** PARTIAL. Text send/receive works end-to-end.
- **Gaps:** Conversations are keyed by **applicationId** — messaging is bound to applications, not to an active
  lease/relationship (a tenant with a lease but no live application thread may see "Sin conversaciones").
  Attach-file / send-image / emoji buttons have **no handlers**. Archive / mute / report are `alert()` placeholders
  ("backend no las soporta aún"). No agency-vs-landlord routing choice.

### `src/app/inquilino/arriendo/page.tsx`
- **What it has:** onboarding gate; 3 stats (Arriendos activos, Total mensual, Estado general = hardcoded "Al día");
  active-lease cards (image, rent/admin/payment-day/vencimiento, contract progress bar, next-payment strip);
  error + empty states.
- **Data source:** **REAL** — `useLeases()` + `useMyPayments().getNextPayment()`.
- **Completeness:** DONE. Note: the "Estado general → Al día" stat is a **hardcoded string** (doesn't read period status).
- **Gaps:** Static "Al día" ignores real mora/pending; empty-state copy hardcoded ES only (no i18n).

### `src/app/inquilino/arriendo/[leaseId]/page.tsx`
- **What it has:** hero property card + contract timeline; pay CTA gated by real `currentPeriodStatus`; account-status
  card driven by real status; payment history; sidebar with **contract/insurance/inventory downloads**, landlord
  contact (email/phone/message link), payment-methods card.
- **Data source:** **REAL** — `useLease`, `useMyPaymentRequests().getForLease`, `useLeasePaymentInfo`. Downloads use
  real `lease.contractUrl/insuranceUrl/inventoryUrl`. `PAYMENT_METHODS` card is from a static constants file (display-only).
- **Completeness:** DONE — the most complete "operate the relationship" surface.
- **Gaps:** Payment-methods card is decorative (only PSE actually works in modal). No renewal / termination / PQRS action.
  "Enviar mensaje" deep-links to /mensajes but may land on empty inbox (application-keyed chat, see above).

### `src/app/inquilino/notificaciones/page.tsx`
- **What it has:** header with unread count + settings shortcut; filter pills (all/unread/payment/application/
  message/document); list with per-type icons (canonical backend codes), mark-read, delete, action deep-links;
  skeleton; summary bar.
- **Data source:** **REAL** — `useTenantNotifications` → `notificationsApi`, 2-min poll; mark/mark-all/delete real.
- **Completeness:** DONE.
- **Gaps:** No pagination (renders all). "Limpiar leídas" only hides client-side (`hideRead`), doesn't persist.
  No per-category notification preferences (config toggles don't map to these categories).

### `src/app/inquilino/configuracion/page.tsx`
- **What it has:** notification toggles (email/push/sms/payments/marketing); Security (MFA, change password,
  sessions); Preferences (dark mode, language); Data & Privacy (download data, reset onboarding, privacy/terms);
  Danger Zone (delete account) — all with modals.
- **Data source:** **MIXED.** REAL: `useTheme`, `setLocale`/i18n, `MfaSetupSection`, reset-onboarding (localStorage).
  **MOCK:** notif toggles = local `useState` only (no API/persistence); `mockSessions` hardcoded; password change /
  download data / delete account = `await new Promise(setTimeout)` simulations + toast.
- **Completeness:** PARTIAL — theme/lang/MFA real; account & privacy actions are theater.
- **Gaps:** Notification prefs not persisted; sessions fabricated; delete/download don't hit backend.

### `src/app/inquilino/perfil/page.tsx`
- **What it has:** setup-progress ring (5 hardcoded steps), avatar upload (drag/drop preview), editable Personal Info
  (name/email/phone/RUT/birth/address), emergency contact, verification-status card, employment-verify modal,
  2-step delete-account modal, quick stats.
- **Data source:** **FULLY MOCK.** `formData` seeded with `user?.name/email` fallbacks but otherwise **hardcoded
  Chilean sample data** ("María González", RUT `12.345.678-9`, `+56 9 …`, "Av. Providencia") — note this is Chilean,
  the product is Colombia. Save = `setTimeout`; avatar persists only to local `savedAvatar` state; setup steps /
  "1 arriendo · 12 pagos" / verification badges all hardcoded; delete = simulated.
- **Completeness:** STUB — visual only; nothing persists.
- **Gaps:** No profile API (get/update), no real avatar upload, no real verification state, wrong-country sample data.

### Components skimmed
- `TenantDashboardSidebar.tsx` — **NOT used by the layout** (layout uses `PlanSidebar`). Full alternate sidebar with
  Notificaciones/Perfil/Config/Guardados/Ayuda + real `useUnreadMessages` badge, but its profile widget is hardcoded
  ("80% completado", "María González" steps). Likely **dead/legacy** — flag for cleanup or adoption.
- `TenantDashboardEmpty.tsx` — onboarding empty dashboard; progress from **localStorage**, 2 steps, real links. DONE.
- `NoDataEmptyState.tsx` — config-driven empty states (rental/applications/payments/documents/messages/saved) over the
  universal `EmptyState` primitive. Note: pages actually use `CompleteProfileFirst` + inline `EmptyState`, so this
  helper is only partially referenced.
- `tenant/index.ts` — barrel exports only ApplicationCard / ApplicationStatusBadge / ApplicationTimeline.

### i18n note
Mixed model: shared strings use `useI18n().t('…')`, but **every page** also carries large numbers of inline
`locale === 'es' ? '…' : '…'` ternaries (arriendo empty-state and some copy are ES-only). Not hardcoded
single-language, but far from fully key-based.
