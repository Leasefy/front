# Phase v7-01: Fundación & Limpieza del Portal — Pattern Map

**Mapped:** 2026-07-16
**Worktree:** `/Users/nicolasgarcia/rent/mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
**Files analyzed:** 6 surfaces (dashboard, estado de cuenta, perfil, config, layout nav, dead code) + api-client contract
**Analogs found:** 6 / 6 (all EXACT — every mock surface has a real, wired twin already in this repo)

> **Headline finding for the planner:** v7-01 is almost entirely a **"copy the real twin"** phase, not a "build new" phase. The tenant mock pages (perfil, config) are **stale forks** of the landlord pages that already do the real thing. The dashboard's fake data has a real source one directory over (pagos page). Nothing here needs a new backend endpoint except the profile GET (and even `updateProfile` already exists). Read DESIGN.md §11 (empty/loading states), §4 (cards/banners), §16 (money/date) before building.

---

## File Classification

| New/changed file | Role | Data Flow | Closest analog | Match |
|------------------|------|-----------|----------------|-------|
| `src/app/inquilino/page.tsx` (dashboard — remove hardcoded arrays) | page/container | request-response (read) | `src/app/inquilino/pagos/page.tsx` | exact |
| `src/app/inquilino/pagos/page.tsx` (estado de cuenta — verify single-source) | page/container | request-response (read) | *(is itself the reference impl)* | canonical |
| `src/app/inquilino/perfil/page.tsx` (remove Chilean mock, wire real) | page/form | CRUD (get/update) | `src/app/panel/(landlord)/perfil/page.tsx` | exact |
| `src/app/inquilino/configuracion/page.tsx` (remove setTimeout theater) | page/form | CRUD + auth actions | `src/app/panel/(landlord)/configuracion/page.tsx` | exact |
| `src/app/inquilino/layout.tsx` (nav: add Notif/Perfil/Config) | layout/config | static config | `src/components/tenant/TenantDashboardSidebar.tsx` (labels/icons) + agency layout | role-match |
| `src/components/tenant/TenantDashboardSidebar.tsx` (DELETE) | dead code | — | *(no analog — deletion)* | n/a |
| *(contract reference for all)* `src/lib/api/client.ts` + `*.service.ts` | service/client | request-response | `src/lib/api/leases.service.ts` | canonical |

---

## Pattern Assignments

### 1. Dashboard — `src/app/inquilino/page.tsx` (page, read)

**The problem (verified):** lines **97–105** hardcode the core state:
```tsx
// TODO (Backend): Replace these with actual API calls
const activeLeases: any[] = [];
const activeApplications: any[] = [];
const nextPayment: { amount: number; dueDate: string } | null = null;
const primaryLease: { id: string; propertyName: string } | null = null;
```
The stat cards (`activeLeases.length` at :203, `activeApplications.length` at :217, `nextPayment` at :226) therefore always render `0` / CTA regardless of real state. Match badge `92 - index*5` at **:301** is fake and should not be copied into any real surface.

**Analog:** `src/app/inquilino/pagos/page.tsx` — same route group, same design language, **already fetches exactly this data from real hooks.**

**Hook wiring to copy** (`pagos/page.tsx:46–58`):
```tsx
const { getActive, isLoading: leasesLoading } = useLeases();
const { requests: rawRequests, isLoading: requestsLoading, refetch } = useMyPaymentRequests();
const activeLeases = isOnboardingComplete ? getActive() : [];
const primaryLease = activeLeases[0];
const { info: paymentInfo } = useLeasePaymentInfo(primaryLease?.id ?? null);
```
All three hooks live in `src/lib/hooks/useLeases.ts` (`useLeases` :14, `useMyPaymentRequests` :231, `useLeasePaymentInfo` :274). `getActive()` (:38) filters `status === 'active' || 'ending_soon'`.

**Applications count:** use `useMyApplications()` (already used on `documentos/page.tsx:99` and `pagos` sibling) rather than a hardcoded array — the planner should confirm the hook name in `src/lib/hooks/useApplications.ts`.

**Loading-gate idiom to copy** (`pagos/page.tsx:171–177`): render `<Spinner size="lg" />` while `leasesLoading || requestsLoading`, before reading `.length`. The dashboard currently only gates on `isOnboardingComplete === null` (:111) — extend it.

**Key idioms:** never fabricate a number; `nextPayment` amount comes from `paymentInfo.monthlyRent` gated on `currentPeriodStatus` (see §2), not from a literal.

---

### 2. Estado de cuenta / saldo / próximo pago — `src/app/inquilino/pagos/page.tsx` (page, read)

**This page is the reference implementation, not a file to rewrite** — the success criterion (PAGO-01) is that saldo + próximo pago **trace to a single source of truth without a second engine**. Verify the dashboard reuses the SAME source; do not introduce a parallel computation.

**Single source of truth chain:**
- **Próximo pago / período actual** → `useLeasePaymentInfo(leaseId)` → `leasesApi.getPaymentInfo` (`leases.service.ts:151`) → `GET /leases/:id/payment-info` → shape `BackendPaymentInfo` (`leases.types.ts:64`: `monthlyRent`, `paymentDay`, `currentPeriod{month,year}`, `currentPeriodStatus`, `currentPeriodRejectionReason`).
- **Historial** → `useMyPaymentRequests()` → `tenantPaymentRequestsApi.getMine()` (`tenant-payment-requests.service.ts:14`) → `GET /tenant-payments/requests/mine`. File header comment (`:1–7`) explicitly declares this the **"FUENTE ÚNICA del historial"**.

**"Próximo pago" derivation to copy** (`pagos/page.tsx:90–92`) — this is the no-fabrication idiom:
```tsx
const showNextPaymentCta =
  paymentInfo?.currentPeriodStatus === 'NONE' || paymentInfo?.currentPeriodStatus === 'REJECTED';
const nextAmount = showNextPaymentCta ? paymentInfo!.monthlyRent : 0;
```

**No-dark-patterns idiom (guardrail PITFALLS 8):** the `PeriodStatusCard` subcomponent (`pagos/page.tsx:478–622`) shows arrears with **neutral, factual** copy — `APPROVED` → "Tu pago de este mes ya está al día" (:549), `REJECTED` → shows the backend `rejectionReason` verbatim (:572–576) with a plain "Reintentar" CTA, no guilt, no urgency inflation. Copy this tone. Uses feedback tokens per DESIGN.md §4 banners (success/warning/error `*-bg` + `*-fg`), not raw red.

---

### 3. Tenant profile — `src/app/inquilino/perfil/page.tsx` (page/form, CRUD)

**The problem (verified):** `formData` at **:46–54** is hardcoded **Chilean** sample data:
```tsx
phone: '+56 9 1234 5678',
rut: '12.345.678-9',
address: 'Av. Providencia 1234, Providencia',
emergencyContact: 'Juan González - +56 9 8765 4321',
```
`handleSave` at **:107–120** is `await new Promise(resolve => setTimeout(resolve, 800))` — pure theater. Quick-stats ("1 Arriendo · 12 Pagos", :558–575), setup steps (:57–94), delete (:202–217) all simulated. Date formatting uses `es-CL` (:749).

**Analog:** `src/app/panel/(landlord)/perfil/page.tsx` — a **near-identical layout that is fully wired.** The tenant page is a stale fork of this one. This is the single most important mapping in the phase.

**Real form seed to copy** (`landlord/perfil/page.tsx:47–57`) — seeds from `user`, not literals:
```tsx
const { user, updateProfile } = useAuth();
const [formData, setFormData] = useState({
  firstName: user?.firstName || '',
  lastName: user?.lastName || '',
  phone: user?.phone || '+57 300 123 4567',   // ← Colombia +57
  rut: user?.rut || '1.020.345.678',           // ← Colombia cédula-shaped
  address: user?.address || 'Cra. 7 #71-21, Bogotá',
  ...
});
```

**Real save to copy** (`landlord/perfil/page.tsx:130–158`):
```tsx
const handleSave = async (section) => {
  setIsSaving(true);
  try {
    if (section === 'avatar' && avatarFile) {
      const { url } = await settingsApi.uploadAvatar(avatarFile);   // real multipart upload
      setSavedAvatar(url);
    } else if (section === 'personal') {
      await updateProfile({ firstName, lastName, phone, address, birthDate });
    } else if (section === 'emergency') {
      await updateProfile({ emergencyContactName, emergencyContactPhone });
    }
    toast.success('Cambios guardados');
  } catch { toast.error('Error al guardar los cambios'); }
  finally { setIsSaving(false); }
};
```

**Contracts already exist:**
- `updateProfile` — `auth-context.tsx:449`, typed in `auth/types.ts:209`: `{ firstName?, lastName?, phone?, rut?, address?, birthDate?, emergencyContactName?, emergencyContactPhone? }`.
- `settingsApi.uploadAvatar(file)` — `settings.service.ts:100` (multipart `POST /users/me/avatar`).

**⚠️ Surprise / note for planner:** the ID field is named **`rut`** across `updateProfile` + `user` (legacy naming), even though the product is Colombia. Do **not** rename the field (that touches auth + backend). For BASE-02, change only the **label → "Cédula"**, the **placeholder/sample → Colombia (`+57`, cédula)**, and date locale **`es-CL` → `es-CO`**. The underlying `rut` key stays.

**Profile GET:** the seed comes from `useAuth().user` (already loaded). If a dedicated profile-read endpoint is wanted, that's the one "external dep" — frontend-first: seed from `user` now (as landlord does), honest and real. No `setTimeout`.

---

### 4. Config — `src/app/inquilino/configuracion/page.tsx` (page/form, CRUD + auth)

**The problem (verified):**
- `mockSessions` hardcoded array at **:74–78**; `sessions` state at :109; fake per-device close at `handleCloseSession:145`.
- Notif toggles = **local `useState` only** (`setGear` :92, `handleToggle:112`) — never persisted.
- `handlePasswordChange:128` → `setTimeout(1500)`.
- `handleDownloadData:150` → `setTimeout(2000)`.
- `handleDeleteAccount:158` → `setTimeout(2000)`.

**Analog:** `src/app/panel/(landlord)/configuracion/page.tsx` — every one of those actions is **already real** here. Same modal shells, real handlers.

**Real handlers to copy (all in `landlord/configuracion/page.tsx`):**

| Tenant mock | Real replacement | Line |
|---|---|---|
| `setGear`/`handleToggle` local | `useNotificationSettings().updateSetting(backendKey, value)` | :53, :84–93 |
| `handlePasswordChange` setTimeout | `getSupabase().auth.updateUser({ password })` | :101–124 |
| `mockSessions` + per-device close | `getSupabase().auth.signOut({ scope: 'global' })` — **honest**: real "cerrar todas las sesiones", no fabricated device list | :126–138 |
| `handleDownloadData` setTimeout | `settingsApi.requestDataExport()` → Blob → `a.download` JSON | :140–161 |
| `handleDeleteAccount` setTimeout | `settingsApi.deleteAccount()` + `supabase.auth.signOut()` | :163–179 |

**Service methods already exist** (`settings.service.ts`): `getNotificationSettings`/`updateNotificationSettings` (:74–79), `requestDataExport` (:84), `deleteAccount` (:90). The hook `useNotificationSettings` (`useSettings.ts:25`) does optimistic-update-with-revert (:48–60).

**Honest empty-state rule (BASE-03):** the mock **sessions list** has no real per-device backend — do NOT fake it. Replace with the landlord's single "cerrar todas las sesiones" global action (real) OR an honest empty-state. Use DESIGN.md §11 `EmptyState` (`src/components/ui/empty-state.tsx`) if a surface has no backend at all — labeled honestly, not "Próximamente" fake data.

**Imports to add:** `getSupabase` from `@/lib/supabase/client` (see `landlord/configuracion/page.tsx:19`), `useNotificationSettings` from `@/lib/hooks/useSettings` (:17), `settingsApi` (:18).

---

### 5. Layout nav — `src/app/inquilino/layout.tsx` (layout, static config)

**The problem (verified):** `useTenantNavItems()` (**:25–38**) builds the `PlanSidebar` nav array. It omits **Notificaciones, Perfil, Configuración** (reachable only via `PlanHeader`/deep-links). The Mensajes item carries a **hardcoded `badge: 2`** (:36) — a fake unread count.

**Where the items belong:** append to the array returned at `layout.tsx:28–37`. `PlanSidebar` consumes `navItems` as-is (:109). Each item shape: `{ label, href, icon (Phosphor), exact? }`.

**Analog for the missing items' labels + icons:** the dead-code `src/components/tenant/TenantDashboardSidebar.tsx` already enumerates Notificaciones/Perfil/Config/Guardados/Ayuda with a **real** `useUnreadMessages` badge — mine its `href`/icon/label choices, then delete the file (§6). For canonical multi-section nav structure, cross-check the agency layout `src/app/panel/inmobiliaria/layout.tsx` (referenced in DESIGN.md §19 as the canonical layout).

**Badge fix:** replace hardcoded `badge: 2` with the real unread count (the `useUnreadMessages` hook that `TenantDashboardSidebar` already imports) or drop the badge. Do not ship a literal.

**Design:** `PlanSidebar` + `PlanHeader` are the canonical shell per DESIGN.md §4 "Sidebar / Layout" — use as-is, only extend the nav array.

---

### 6. Dead code — `src/components/tenant/TenantDashboardSidebar.tsx` (DELETE)

**Confirmed dead:** `grep -rn "TenantDashboardSidebar" src/` returns **only its own definition** (`:225 export function TenantDashboardSidebar`). Zero imports anywhere. The layout uses `PlanSidebar` instead (`layout.tsx:7,109`). Its internal profile widget is itself hardcoded ("80% completado", "María González").

**Action:** after mining its nav labels/icons for §5, delete the file. Also remove any stale entry from the barrel `src/components/tenant/index.ts` if present (grep showed the barrel only exports Application* components, so likely no change — verify).

---

## Shared Patterns

### api-client contract (applies to profile, config, all reads)
**Source:** `src/lib/api/client.ts` + `src/lib/api/leases.service.ts` (canonical service).
- Typed methods on `apiClient`: `.get/.post/.put/.patch/.delete<T>(path, body?)` + `.getBlob(path)` (`client.ts:110–117`).
- `ApiError(status, message)` class (`client.ts:21`); network failure → `ApiError(0, friendly-message)` (`client.ts:57–67`).
- Auth: bearer token injected from a module-level store `setAccessToken`/`getAccessToken` (`client.ts:9–19`), written by `AuthProvider`.
- **Service pattern** (`leases.service.ts`): a typed API object, an UPPERCASE-backend → lowercase-frontend **mapper** (`mapBackendLease` :55), and **honest empty on 403/404**:
```tsx
} catch (err) {
  if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return [];
  throw err;
}
```
This 403/404→`[]` idiom (`leases.service.ts:120`, `tenant-payment-requests.service.ts:19`) is the frontend-first "endpoint may not exist yet → empty, not crash" contract. Reuse for any new tenant service.

### Hook pattern (applies to dashboard, profile reads)
**Source:** `src/lib/hooks/useLeases.ts`. Standard shape: `useState` for data/isLoading/error, a `useCallback` fetcher, `useEffect` to run it, return `{ data, isLoading, error, refetch, ...helpers }`. Copy this for any new read hook. `useSettings.ts:48` shows optimistic-update-with-revert for writes.

### Empty / loading / error states (applies to all)
**Source:** DESIGN.md §11 + `src/components/ui/empty-state.tsx` (`EmptyState`), `error-state.tsx`, `spinner.tsx`, `skeleton.tsx`. The pagos page (`:213`, `:399`) and DESIGN.md §11 show the canonical usage. Money via `formatCurrency()` (DESIGN.md §16), dates via `es-CO` `toLocaleDateString` — **fix `es-CL` → `es-CO`** wherever found in tenant pages.

### Wompi server-route contract (NOT built in v7-01 — forward reference only)
**Source:** `src/app/api/avaluo/wompi-session/route.ts` + caller `src/components/avaluo/WompiPayButton.tsx:28`.
Model for the future `POST /api/inquilino/pagos/wompi-session` (**v7-04**, PAGO-02). Key idioms: `runtime='nodejs'`, server-only `WOMPI_INTEGRITY_SECRET` (never `NEXT_PUBLIC_`), integrity `sha256(reference + amountInCents + currency + secret)` (`route.ts:40–42`), amount resolved server-side. The client button POSTs then redirects; **integrity is never computed client-side** (`WompiPayButton.tsx:6–10`). Noted here because PAGO-01 (this phase) is the estado-de-cuenta groundwork that PAGO-02 builds on — **do not build the route in v7-01.**

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| *(none)* | — | Every v7-01 surface has an exact in-repo analog. This is a "wire the real twin + delete fake" phase, not a greenfield phase. |

---

## Metadata

**Analog search scope:** `src/app/inquilino/**`, `src/app/panel/(landlord)/**`, `src/app/panel/inmobiliaria/**`, `src/components/tenant/**`, `src/lib/api/**`, `src/lib/hooks/**`, `src/app/api/**`, `src/lib/auth/**`.
**Files read end-to-end:** dashboard, pagos, perfil, config, layout (tenant) + perfil/config (landlord, targeted) + `useLeases`, `useSettings`, `client.ts`, `leases.service.ts`, `settings.service.ts`, `tenant-payment-requests.service.ts`, wompi route.
**Pattern extraction date:** 2026-07-16
**Read-only:** no source files modified; PATTERNS.md is the only write.
