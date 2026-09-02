# Phase v7-06: Solicitudes / PQRS — Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 8 anticipated new + 6 anticipated modified
**Analogs found:** 13 / 14 (1 hard gap: business-days calc)

> Worktree: `/Users/nicolasgarcia/rent/mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`). All paths below are absolute-from-repo-root inside that worktree.

Requirements (ROADMAP.md:126-135):
- **SOLI-01** — abrir solicitud de mantenimiento/reparación con descripción + fotos
- **SOLI-02** — abrir PQRS formal tipada REUSANDO `pqrs.types.ts` (`solicitanteTipo:'inquilino'`, mismo vocabulario de estados que la agencia — no forkear)
- **SOLI-03** — timeline con SLA 15 días hábiles computado + visible; nunca en blanco; interino etiquetado "estimado"
- **SOLI-04** — transparencia de responsabilidad de costo (Ley 820: dueño/inquilino/split); costo a cargo del inquilino requiere aprobación de cotización antes de ejecutar

**Key external-dep decision (ROADMAP.md:135):** NestJS/agent `POST /pqrs` + `GET /pqrs/mine` tenant-scoped (backend puede ir atrás). Real `slaVenceAt` lo da el motor; **interino = `createdAt + 15 días hábiles`, calendario Colombia SIN FESTIVOS** (weekdays-only), etiquetado "estimado".

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|-------------------|------|-----------|----------------|-------|
| `src/lib/api/pqrs.service.ts` **(new)** | service | CRUD (create + list) + honest-degrade | `src/lib/api/lease-documents.service.ts` + `tenant-payment-requests.service.ts` | exact |
| `src/lib/utils/business-days.ts` **(new)** | utility | transform (date math) | — none — | **GAP** |
| `src/lib/types/solicitud-view.ts` **(new)** OR extend `tenant-case.ts` | model/view-model | transform (status→tone/label + SLA) | `src/lib/types/tenant-case.ts` | exact |
| `src/lib/hooks/use-tenant-pqrs.ts` **(new)** | hook | request-response (fetch `/pqrs/mine`) | `useMyPaymentRequests` in `src/lib/hooks/useLeases.ts:231` | exact |
| `src/app/inquilino/solicitudes/page.tsx` **(new)** | route/page | CRUD list + resumen | `src/app/inquilino/casos/page.tsx` + agency `pqrs/page.tsx` | exact |
| `src/app/inquilino/solicitudes/[id]/page.tsx` **(new)** | route/page | detail + timeline + SLA | `src/app/inquilino/casos/[caseId]/page.tsx` | exact |
| `src/components/tenant/NuevaSolicitudModal.tsx` **(new)** | component | form + file upload + submit | `src/components/tenant/PayRentModal.tsx` (shell) + MessagesWidget file-picker + `documents.service.ts` upload | role+partial |
| `CostoResponsabilidad` transparency block (SOLI-04) **(new, inline or component)** | component | presentation | honest-banner idiom in `documentos/page.tsx:504-596` | partial |
| `src/lib/api/pqrs.types.ts` **(MODIFY — additive only)** | model | — | itself | reuse |
| `src/lib/types/tenant-case.ts` **(MODIFY)** | model | add pqrs/mant mappers | own `paymentStatusToTone/Label` | exact |
| `src/lib/hooks/use-tenant-cases.ts` **(MODIFY)** | hook | emit pqrs/mant rows | own `paymentRequestToCase` | exact |
| `src/app/inquilino/casos/page.tsx` **(MODIFY)** | page | fill PQRS/mant "Próximamente" | own `ProximamenteSection` (:150-181) | exact |
| `src/app/inquilino/layout.tsx` **(MODIFY)** | layout | add nav item | own nav array (:31-44) | exact |
| i18n keys (agency `pqrs` namespace exists) | config | — | `inmobiliaria.pqrs.*` | reuse |

---

## Pattern Assignments

### 1. `src/lib/api/pqrs.service.ts` (service, CRUD + honest-degrade) — NEW

**Analog:** `src/lib/api/lease-documents.service.ts` (isEndpointUnavailable) + `src/lib/api/tenant-payment-requests.service.ts` (list-mine 403/404 → []).

**Copy the `isEndpointUnavailable` gate verbatim** (`lease-documents.service.ts:67-72`) — it is already copy-pasted across `messages.service.ts:19-24` and `agent-contact.service.ts:64-69`, so it is the established idiom:
```typescript
function isEndpointUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 0);
}
```

**List pattern** — mirror `tenant-payment-requests.service.ts:16-28` (403/404 → `[]`, honest degrade, never fabricate):
```typescript
async getMine(): Promise<SolicitudPqrs[]> {
  try {
    return await apiClient.get<SolicitudPqrs[]>('/pqrs/mine');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return [];
    throw err;
  }
}
```

**Create pattern** — mirror `lease-documents.service.ts:100-112` (`apiClient.post`, rethrow a typed `…Unavailable` error on not-live so the UI stays honest — never fabricate an id/radicado). Body must carry `solicitanteTipo:'inquilino'` server-side is authoritative; the create returns the server-assigned `SolicitudPqrs` (with `radicado`). Do NOT compute `radicado` client-side.

**What differs:** this service has a REAL `POST` (create) and a REAL `GET /pqrs/mine`, unlike the pure contract-stubs. Photo bytes do NOT go in the JSON create body — see modal pattern #7 (multipart via `documentsApi.upload`, or the create returns an id then attach). Import `apiClient, ApiError` from `./client` and the types from `./pqrs.types`.

---

### 2. `src/lib/utils/business-days.ts` (utility, date transform) — NEW — **⚠️ GAP, NO ANALOG**

There is **no** business-days / Colombian-holiday / `addBusinessDays` helper anywhere in `src/lib` (confirmed: only the `PQRS_SLA_BUSINESS_DAYS = 15` constant and prose mentions of "días hábiles" in `contract-templates.ts`). `use-carrier-sla.ts` is an unrelated cotizador SLA and does not compute calendar days.

**Build a small pure helper** — `addBusinessDays(from: Date, n: number): Date` that skips Sat/Sun only. Per ROADMAP.md:135 the interim estimate is **"calendario Colombia, sin festivos"** → **weekday-only, do NOT build a holiday table.** The authoritative `slaVenceAt` comes from the M1 engine; the frontend interim is explicitly an estimate.

Guardrail (PITFALLS 8 / SOLI-03): the SLA output must render as a neutral factual date, **never a red live countdown**. Label the interim value **"estimado"**. Reuse the existing `formatRelative(iso, locale)` helper (duplicated in `casos/page.tsx:84-99` and `casos/[caseId]/page.tsx:87-102`) for "en N días" copy, or `es-CO` `toLocaleDateString`.

---

### 3. `src/lib/types/solicitud-view.ts` OR extend `src/lib/types/tenant-case.ts` (model) — NEW/MODIFY

**Analog:** `src/lib/types/tenant-case.ts` — the whole "pure, TOTAL source-status mapper" pattern (`paymentStatusToTone` :93-106, `paymentStatusToLabel` :112-127).

**Copy the mapper shape** for the 6-member `PqrsEstado` union (`pqrs.types.ts:15-21`). Two new pure total mappers with `assertNever` exhaustiveness (tenant-case.ts:85-87):
```typescript
export function pqrsEstadoToTone(e: PqrsEstado): CaseTone {
  switch (e) {
    case 'recibida': case 'asignada': case 'en_proceso': case 'en_cotizacion': return 'info';
    case 'resuelta': case 'cerrada': return 'neutral';
    default: return assertNever(e);
  }
}
```
**Guardrail (CASO-04 / PITFALLS 8):** `CaseTone` (tenant-case.ts:45) is capped at `'attention'` — there is intentionally NO alarm level. Do NOT introduce a destructive/danger tone for `reclamo`/urgente. `PqrsPrioridad='urgente'` must NOT map to an alarm color.

**Type mapping to the caso union:** `tipo === 'reparacion'` → `CaseType 'mantenimiento'`; every other `PqrsTipo` → `CaseType 'pqrs'` (both already exist in the union, tenant-case.ts:39, as forward-refs).

---

### 4. `src/lib/hooks/use-tenant-pqrs.ts` (hook, request-response) — NEW

**Analog:** `useMyPaymentRequests` (`src/lib/hooks/useLeases.ts:231-267`) — exact shape to copy: `useState` list + `isLoading` + `error`, `fetch` in `useCallback`, `catch → setError + setList([])`, `useEffect(fetch)`, return `{ items, isLoading, error, refetch }`.

**What differs:** source is `pqrsApi.getMine()`. Optionally add `useVisibilityPolling(refetch, 30_000, !isLoading)` exactly as `use-tenant-cases.ts:240` if realtime-ish refresh is wanted. This hook is then composed into `use-tenant-cases.ts` (modify #11) to emit real pqrs/mant rows.

---

### 5. `src/app/inquilino/solicitudes/page.tsx` (route/page, list) — NEW

**Analogs:**
- **Page shell / gates:** `src/app/inquilino/casos/page.tsx` — loading `Spinner` gate (:196-202), onboarding gate via `useOnboardingStatus` + `CompleteProfileFirst` (:205-213), error gate `EmptyState` (:217-230), `min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]` + `max-w-7xl` container, framer `motion.header`. This is the canonical tenant page shell (also used by `documentos/page.tsx:337-371`).
- **Row + tone badge:** `CaseRow` (`casos/page.tsx:105-144`) — `TONE_BADGE` map (:67-71, icon+text never color-alone), `Link` to detail, `formatRelative` timestamp.
- **Resumen-por-estado cards + estado columns:** agency `src/app/panel/inmobiliaria/pqrs/page.tsx:16-73` — `RESUMEN_ITEMS` dot-colored grid + `EmptyState` in the empty list. **Reuse the SAME `PqrsEstado` labels/colors so tenant ≡ agency (SOLI-02, PITFALLS 1).** Note the agency page's "nueva" CTA is a `toast.info(newSoon)` stub (:44) — the tenant page's CTA must be REAL (open the modal, #7).
- **Empty state:** `EmptyState` (`src/components/ui/empty-state.tsx`) — `icon`/`title`/`description`/optional `action{label,href}`. Tenant uses inline `locale === 'es' ? … : …` copy (agency uses `t()` i18n keys); follow the tenant convention here.

**What differs:** this list is REAL data (`use-tenant-pqrs`), with a working "Abrir solicitud" modal, and each row shows the SLA estimate (SOLI-03). No new authz — `/pqrs/mine` is JWT-scoped.

---

### 6. `src/app/inquilino/solicitudes/[id]/page.tsx` (route/page, detail + timeline) — NEW

**Analog:** `src/app/inquilino/casos/[caseId]/page.tsx` — copy nearly wholesale:
- **Own-only resolution (CASO-02 / no-IDOR):** resolve by `items.find(x => x.id === params.id)` on the tenant's OWN list — NEVER fetch-by-raw-id (:244). Unknown/foreign id → honest "no encontrado" `EmptyState` (:271-287).
- **Timeline:** map events → `TimelineItem[]` and render `PlanActivityTimeline` (`src/components/ui/plan/PlanActivityTimeline.tsx` — props `{items, emptyMessage}`; `TimelineItem = {id,title,timestamp,icon?}`). Events from **source timestamps only** — never synthesize/pad (:137-144).
- **Summary card + neutral badge + source out-link + "Escribir a la inmobiliaria"** (:170-218).

**What differs (the v7-06 additions):**
- **SLA row (SOLI-03):** add a "Respuesta esperada" field showing `slaVenceAt` (real) OR the computed interim `createdAt + 15 días hábiles` labeled **"estimado"** — never blank. Neutral styling only.
- **Cost-responsibility block (SOLI-04):** see #8.
- Timeline for a `reparacion` may include the `en_cotizacion` → approval milestone.

---

### 7. `src/components/tenant/NuevaSolicitudModal.tsx` (component, form + file upload) — NEW

**Analogs (composed):**
- **Modal shell + Lenis + submit lifecycle:** `src/components/tenant/PayRentModal.tsx` — `AnimatePresence` backdrop `fixed inset-0 z-50 bg-black/50`, `useLenis().stop()/start()` on open (:66-71, mandatory per DESIGN.md §8), `data-lenis-prevent` scroll body (:206), header/body/footer, `Step` state machine, `toast` on error/success, Button `isLoading`. **Copy this shell.**
- **Photo picker (SOLI-01):** `src/components/messages/MessagesWidget.tsx:243-278` + `:689-694` — hidden `<input type="file">` reused via ref, `accept='image/*,application/pdf'`, 10 MB `MAX_BYTES` guard + `toast.error` on oversize, reset `e.target.value=''` so re-selecting same file re-fires.
- **Actual upload:** `src/lib/api/documents.service.ts:78-103` `documentsApi.upload({file, type, entityType, entityId})` — multipart `FormData`, `Bearer` from `getAccessToken()`, `POST ${BACKEND_URL}/documents`. This is the real, working upload path; wire photos through it (entityType `'pqrs'`/`'solicitud'`, entityId = the created solicitud id). Alternative presign model exists in `avaluo.service.ts:73-89` (S3 presign+PUT) if photos go to object storage instead.
- **Form fields:** `tipo` select (6 `PqrsTipo` values), `asunto`, `descripcion` textarea. For validation, `zod` + `react-hook-form` are available and used in `src/components/inmobiliaria/RegistrarPagoModal.tsx` and `src/app/registro/page.tsx` — but simple `useState` + inline validation (as PayRentModal does) is the lighter tenant-modal norm. Pick one; do not mix.

**What differs:** MessagesWidget's `sendAttachment` is an inert stub (no endpoint); here the upload is REAL via `documentsApi.upload`. Sequence: create solicitud (`pqrsApi.create`) → get id → upload photos with that `entityId`. On not-live create endpoint, degrade honestly (toast "Próximamente"), never fake a radicado.

---

### 8. Cost-responsibility transparency block (SOLI-04) — NEW (inline in detail, or small component)

**Analog:** the honest info-card idiom — agency `pqrs/page.tsx:51-57` (primary-soft info banner) and the "Próximamente" section cards in `documentos/page.tsx:516-553`. No existing cost-split component.

**Content:** show `costoResponsable` (dueño / inquilino / split, Ley 820). When cost is tenant's, render an **"aprobar cotización"** affordance gated on the `en_cotizacion` state + `cotizacionId` — approval REQUIRED before execution (SOLI-04). Follow the honest-degrade rule: if the quote-approval endpoint isn't live, show "Próximamente" / disabled, never a fake "aprobado".

**⚠️ Type note:** `SolicitudPqrs` (pqrs.types.ts:30-53) currently has `cotizacionId?` and estado `'en_cotizacion'` but **no cost-responsibility field**. Add optional fields ADDITIVELY (e.g. `costoResponsable?: 'dueno' | 'inquilino' | 'split'`) — see #9.

---

### 9. `src/lib/api/pqrs.types.ts` — **MODIFY, additive only (do NOT fork)**

The guardrail is "reusar, no forkear". `pqrs.types.ts` is consumed by the agency page (`panel/inmobiliaria/pqrs/page.tsx:13`) and referenced by `tenant-case.ts`. Adding **optional** fields (e.g. `costoResponsable?`, photo/attachment ids) is safe/additive and keeps the single shared contract. Do NOT create a parallel tenant-only PQRS type. `solicitanteTipo:'inquilino'` already exists in the union (:27) — no change needed there.

---

### 10-12. `tenant-case.ts` / `use-tenant-cases.ts` / `casos/page.tsx` — MODIFY (wire real cases into the hub)

The v7-03 hub left explicit forward-compat seams for exactly this phase:
- **`tenant-case.ts`** — the union already declares `'pqrs'` and `'mantenimiento'` (`:39`) "for v7-06 (they contribute zero rows today)". Add `pqrsToCase(s: SolicitudPqrs): TenantCase` mapper mirroring `paymentRequestToCase` (use-tenant-cases.ts:78-103): `detailLink: /inquilino/solicitudes/${id}` (or `/casos/${id}`), `sourceLink: /inquilino/solicitudes`, `events` from `createdAt`/`updatedAt`/`resueltaAt` timestamps only.
- **`use-tenant-cases.ts`** — compose the new `use-tenant-pqrs` hook and push its rows in the `useMemo` (:191-218) where the comment says "Forward-ref types (pqrs/mantenimiento…) emit no rows". Extend `refetch`'s `Promise.all` (:230-236) and the `error ??` chain (:226-227).
- **`casos/page.tsx`** — the two `ProximamenteSection` calls for PQRS (:333-343) and Mantenimiento (:344-354) are the exact placeholders to replace with real rows / a real link to `/inquilino/solicitudes`. `TYPE_ICON` already maps `pqrs: ChatCircle, mantenimiento: Wrench` (:74-81). Keep "Acuerdos" as Próximamente (that's v7-07).

**Guardrail carried from v7-03:** normalize source `estado`/timestamps only — NEVER recompute a status; badge capped at neutral tone; no countdown/urgency/credit-bureau copy (tenant-case.ts:19-21, PITFALLS 8).

---

### 13. `src/app/inquilino/layout.tsx` — MODIFY (nav)

Add a "Solicitudes" nav entry to the primary nav array (`:31-39`), between "Mis casos" (:37) and "Documentos" (:38). Follow the exact object shape `{ label, href: '/inquilino/solicitudes', icon }` (icon `Lifebuoy` or `Wrench` from `@phosphor-icons/react`, matching agency `pqrs` which uses `Lifebuoy`). i18n label via `t()` or inline `locale === 'es'` like the "Mis casos" entry.

---

## Shared Patterns

### Honest degrade (api-client)
**Source:** `src/lib/api/lease-documents.service.ts:67-72` (canonical `isEndpointUnavailable`), replicated in `messages.service.ts:19-24`, `agent-contact.service.ts:64-69`, `tenant-payment-requests.service.ts:23-26`.
**Apply to:** `pqrs.service.ts` and any new fetch. Rule: 404/403/0 → empty/`null`/`'unavailable'` → UI shows "Próximamente"/empty-state. NEVER fabricate ids, radicados, statuses, or URLs. Rethrow every other error.

### Tenant page shell + gates
**Source:** `src/app/inquilino/casos/page.tsx:196-234` (Spinner loading gate → onboarding gate `useOnboardingStatus`+`CompleteProfileFirst` → error `EmptyState` → `min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]` + `max-w-7xl mx-auto` + framer `motion` sections).
**Apply to:** `solicitudes/page.tsx`, `solicitudes/[id]/page.tsx`.

### Neutral tone / no-alarm (Ley 1480 / PITFALLS 8)
**Source:** `TONE_BADGE` cap at `warning` (`casos/page.tsx:67-71`); `CaseTone` type omits alarm (`tenant-case.ts:44-45`).
**Apply to:** every solicitud/PQRS status badge + the SLA display. No red countdown, no "urgente" alarm color, no credit-bureau/urgency copy.

### Empty-state / "Próximamente"
**Source:** `src/components/ui/empty-state.tsx` (`EmptyState` — icon/title/description/action) + the `Clock`-icon "Próximamente" usage in `documentos/page.tsx:532-538` and `casos/page.tsx:174-179`.
**Apply to:** empty list, not-found detail, any not-live sub-feature (e.g. quote approval before its endpoint exists).

### Anti-IDOR resolution + signed retrieval
**Source:** own-list `.find()` resolution (`casos/[caseId]/page.tsx:244`); `documentsApi.getSignedUrl` + `useSignedDocUrl(docId,{enabled})` (`documents.service.ts:121-123`, `useDocuments.ts:130`).
**Apply to:** solicitud detail resolution (own-list only) and any photo retrieval (short-lived signed URL, never the raw persistent URL).

### Reuse the shared PQRS contract (SOLI-02, PITFALLS 1)
**Source:** `src/lib/api/pqrs.types.ts` — consumed by agency `panel/inmobiliaria/pqrs/page.tsx`.
**Apply to:** all new files. Same `PqrsEstado`/`PqrsTipo` vocabulary tenant-side; extend the type additively only.

---

## No Analog Found (gaps — planner should note)

| File / capability | Role | Data Flow | Reason |
|-------------------|------|-----------|--------|
| `src/lib/utils/business-days.ts` (`addBusinessDays`) | utility | date transform | **No business-days / Colombian-holiday / calendar helper exists in the codebase.** ROADMAP.md:135 resolves the ambiguity: interim = weekday-only (skip Sat/Sun), **no holiday table** ("sin festivos"); real `slaVenceAt` comes from the M1 engine. Build a tiny pure helper. |
| Cost-responsibility split UI (SOLI-04) | component | presentation | No cost-split / quote-approval component exists. Compose from the honest info-card idiom; type needs an additive `costoResponsable?` field. |

---

## Metadata

**Analog search scope:** `src/lib/api/`, `src/lib/hooks/`, `src/lib/types/`, `src/lib/constants/`, `src/lib/utils/`, `src/app/inquilino/`, `src/app/panel/inmobiliaria/pqrs/`, `src/components/tenant/`, `src/components/messages/`, `src/components/ui/`.
**Files scanned (read in full or targeted):** pqrs.types.ts, response-sla.ts, tenant-case.ts, use-tenant-cases.ts, casos/page.tsx, casos/[caseId]/page.tsx, panel/inmobiliaria/pqrs/page.tsx, lease-documents.service.ts, agent-contact.service.ts, messages.service.ts, documents.service.ts, tenant-payment-requests.service.ts, avaluo.service.ts, PlanActivityTimeline.tsx, empty-state.tsx, documentos/page.tsx, PayRentModal.tsx, MessagesWidget.tsx (targeted), useLeases.ts (targeted), useDocuments.ts (grep), inquilino/layout.tsx (grep), ROADMAP.md (targeted).
**Pattern extraction date:** 2026-07-19
