# Phase 34: Avalúos UI - Research

**Researched:** 2026-06-03
**Domain:** Multi-step wizard (public + panel), presigned S3 upload, status polling, Wompi payment, Next.js App Router
**Confidence:** HIGH — all findings verified directly against codebase source files.

---

## Summary

The codebase has a fully-formed wizard infrastructure already built for the `/aplicar/[propertyId]` flow (`src/components/wizard/`). That system — `WizardShell`, `WizardNavigation`, `WizardProgress`, `DocumentUpload`, and a `Context`-based state container — is the canonical pattern for multi-step public forms and should be reused as the architectural model for the Avalúos wizard.

There is no `(public)` Next.js route group. Public pages live as bare directories under `src/app/` (e.g., `/arco`, `/aplicar`, `/verificar`). Each uses a per-directory `layout.tsx` that wraps children in `<ForceLightMode>` — a client component that strips the `dark` class from `<html>` and restores it on unmount. The same pattern applies here: `src/app/(public)/avaluo/layout.tsx` will be a new layout wrapping with `<ForceLightMode>`.

Wompi payment does NOT exist in this codebase yet. The current payment infrastructure is a PSE mock (`/pse-mock/page.tsx`) that simulates ACH Colombia. Wompi will need to be built from scratch using the Wompi Widget/Checkout script approach (redirect-based). File upload via presigned S3 is also new — there is an existing drag-and-drop `DocumentUpload` component (used in `/aplicar`) but it does local-only mock uploads; the avalúo flow will need to extend it to do real PUT requests to presigned URLs.

**Primary recommendation:** Reuse `WizardShell` + `WizardNavigation` + `DocumentUpload` as building blocks. Build a new `AvaluoContext` following the `ApplicationContext` pattern. Keep all wizard state in context; keep all API calls in a thin `avaluoApi` service module. The Wompi integration is redirect-based and belongs in `estado/[submissionId]` only, not the wizard.

---

## Standard Stack

### Core (already in the project — no installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI | Already in use |
| Next.js App Router | 14.2.21 | Routing, RSC | Already in use |
| TypeScript | 5.x | Types | Project standard |
| Tailwind CSS | 3.4.0 | Styling | Project standard |
| `@phosphor-icons/react` | 2.1.10 | Icons | ONLY icon library allowed |
| `framer-motion` | 12.27.1 | Step transitions (AnimatePresence) | Used in onboarding wizard |
| `sonner` | 2.0.7 | Toast notifications | Project standard |
| `class-variance-authority` | 0.7.1 | Variant classes | Used in all primitives |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-checkbox` | 1.3.3 | Consent checkboxes | Use `<Checkbox>` from `src/components/ui/checkbox.tsx` |
| `@radix-ui/react-progress` | 1.1.8 | Step progress bar | Available via `<Progress>` primitive |
| `@radix-ui/react-dialog` | 1.1.15 | Confirmation modals | Already wired — `<Dialog>` from ui/dialog.tsx |

### New (will be needed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Wompi Widget | CDN / redirect | Payment checkout | No npm package — redirect-to-Wompi or load script tag |

**Installation:** No new npm installs required for wizard, upload, or polling. Wompi is CDN-loaded or redirect-based.

---

## Architecture Patterns

### Route Structure (LOCKED — from phase context)
```
src/app/
├── aplicar/              ← existing public wizard (reference pattern)
│   └── layout.tsx        ← ForceLightMode only
├── arco/                 ← existing public form (simpler reference)
└── (public)/avaluo/      ← NEW — must create this entire tree
    ├── layout.tsx         ← ForceLightMode + minimal header (no agency sidebar)
    ├── page.tsx           ← public landing / marketing
    ├── nuevo/
    │   └── page.tsx       ← anonymous wizard (AvaluoProvider wraps WizardShell)
    ├── estado/
    │   └── [submissionId]/
    │       └── page.tsx   ← status polling + Wompi payment trigger
    └── verificar/
        └── [slug]/
            └── page.tsx   ← public certificate viewer (static-ish, no auth needed)

src/app/panel/inmobiliaria/avaluos/  ← NEW panel integration
    ├── page.tsx           ← agency list (uses PlanHeader + PlanSidebar already provided by parent layout)
    ├── nuevo/
    │   └── page.tsx       ← authenticated wizard (same WizardShell, email pre-filled)
    └── [id]/
        └── page.tsx       ← detail view + download button
```

### Recommended Component Structure
```
src/components/avaluo/
├── AvaluoWizardShell.tsx    ← layout: sidebar stepper + main content + nav buttons
├── AvaluoContext.tsx        ← React context: state + step logic + submit
├── steps/
│   ├── StepInmueble.tsx     ← Step 1: property data
│   ├── StepContacto.tsx     ← Step 2: email + 3 consent checkboxes (Ley 1581)
│   ├── StepFotos.tsx        ← Step 3: photo upload to presigned S3
│   └── StepConfirmacion.tsx ← Step 4: review + POST intake → redirect
├── AvaluoEstadoCard.tsx     ← status display with state machine badge
└── WompiPayButton.tsx       ← payment button (only shown when status === 'firmado')
```

### Pattern 1: Context-Based Wizard State (use ApplicationContext as template)
**What:** All wizard state lives in a React context; individual step components read/write via context hooks. No prop drilling.

**When to use:** Multi-step forms with shared state across steps, validation per step.

**Key shape:**
```typescript
// Source: src/lib/context/ApplicationContext.tsx (direct reference)
interface AvaluoContextValue {
  formData: AvaluoFormData;
  currentStep: number;        // 1–4
  totalSteps: 4;
  completedSteps: number[];
  isSubmitting: boolean;
  updateFormData: (data: Partial<AvaluoFormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isStepValid: (step: number) => boolean;
  canProceed: boolean;        // isStepValid(currentStep)
  submitAvaluo: () => Promise<void>;
}
```

### Pattern 2: Presigned S3 Upload (NEW — must build)
**What:** Two-step upload: (1) GET presigned URL from backend, (2) PUT file directly to S3.

**When to use:** Step 3 (Fotos) of the wizard.

**How to implement:**
```typescript
// Source: Phase context + existing DocumentUpload component pattern
async function uploadPhoto(file: File, avaluoUrl: string): Promise<string> {
  // Step 1: get presigned URL
  const { key, uploadUrl } = await fetch(`${avaluoUrl}/api/avaluo/photo-presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  }).then(r => r.json());

  // Step 2: PUT directly to S3 (no auth headers — presigned URL handles auth)
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  return key; // store this in formData.photoKeys[]
}
```

The existing `DocumentUpload` component (`src/components/wizard/DocumentUpload.tsx`) handles drag-and-drop UI and file validation. Extend it with an `onUpload` async prop that does the real S3 PUT instead of the current mock delay. The drag-and-drop UI can also be borrowed directly from `StepPhotos.tsx` in the publish wizard (supports multi-file, reordering).

### Pattern 3: Status Polling (NEW — must build)
**What:** `useInterval`-style polling hook that re-fetches certificate state every N seconds.

**Reference:** `use-agent-activity.ts` uses `setInterval` inside `useEffect` — direct pattern to copy.

```typescript
// Source: src/lib/hooks/use-agent-activity.ts (pattern)
function useAvaluoStatus(submissionId: string) {
  const [status, setStatus] = useState<AvaluoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = () => {
      // GET NEXT_PUBLIC_AVALUO_URL/api/avaluo/estado/:submissionId
      // → update status
    };
    fetch();
    const interval = setInterval(fetch, 15_000); // poll every 15s
    return () => clearInterval(interval);
  }, [submissionId]);

  return { status, isLoading };
}
```

Stop polling when `status === 'entregado'` or `status === 'rechazado'` — terminal states.

### Pattern 4: Wompi Payment Integration (NEW)
**What:** Wompi uses a redirect-to-checkout model in Colombia. No PSE-style form — user clicks a button, gets redirected to `checkout.wompi.co`, Wompi redirects back with a `?id=` query param.

**Implementation approach:**
```typescript
// WompiPayButton.tsx
function WompiPayButton({ amount, reference, integrity }: WompiPayProps) {
  // Wompi Widget script: load dynamically or use redirect URL
  // Option A (simplest): redirect to Wompi hosted checkout URL
  // Option B: Wompi button widget (requires script tag injection)
  
  const wompiUrl = `https://checkout.wompi.co/p/?public-key=${PUBLIC_KEY}&currency=COP&amount-in-cents=${amount * 100}&reference=${reference}&integrity=${integrity}`;
  
  return (
    <Button size="lg" onClick={() => window.location.href = wompiUrl}>
      PAGAR CERTIFICADO
    </Button>
  );
}
```

The `integrity` hash must be computed server-side (SHA-256 of `reference + amountInCents + currency + integritySecret`). This means the frontend needs an API route or the backend must provide it. Plan for a Next.js API route `/api/avaluo/wompi-session` that returns `{ reference, amountInCents, integrity }` for a given submissionId.

**Amount:** $50,000 COP = 5,000,000 cents in Wompi's format.

**Return URL handling:** After Wompi redirects back to `estado/[submissionId]?id=wompiTxId`, the page should update status and show download button if payment succeeded.

### Pattern 5: Public Layout (minimal header)
**What:** The avalúo public pages need a layout without the agency sidebar. Use `ForceLightMode` + a custom minimal header.

**Reference:** `src/app/aplicar/layout.tsx` is the closest — just `ForceLightMode` wrapping. The Arco page has no header at all (centered card on `bg-background`).

For `/avaluo/layout.tsx`, use:
```typescript
// Minimal public header — logo + optional "Iniciar sesión" link
// ForceLightMode to prevent dark mode
export default function AvaluoLayout({ children }) {
  return (
    <ForceLightMode>
      {/* minimal nav: Logo + CTA */}
      <main>{children}</main>
    </ForceLightMode>
  );
}
```

### Pattern 6: Auth-aware Wizard (same component, two contexts)
**What:** The wizard component is identical for anonymous and authenticated users. The difference is: authenticated users get email pre-filled from `useAuth().user.email` and the field is `disabled`.

**Implementation:**
```typescript
// In StepContacto.tsx
const { user } = useAuth();
const isAuthenticated = !!user;

<Input
  value={isAuthenticated ? user.email : formData.email}
  onChange={isAuthenticated ? undefined : (e) => updateFormData({ email: e.target.value })}
  disabled={isAuthenticated}
  readOnly={isAuthenticated}
/>
```

**Important:** `useAuth()` throws if called outside `AuthProvider`. The public wizard at `/avaluo/nuevo` does NOT have `AuthProvider` in its layout (anonymous users). The hook must be called inside a component that checks for context availability, or use a safe variant:
```typescript
// Safe pattern for mixed auth/anonymous pages
const authContext = useContext(AuthContext); // null if no provider
const user = authContext?.user ?? null;
```
Check `src/lib/auth/auth-context.tsx` to verify `AuthContext` default value before using this pattern.

### Anti-Patterns to Avoid
- **Bundling consent checkboxes:** Do NOT use a single "acepto todos" checkbox. Three separate `<Checkbox>` components with separate state, per Ley 1581 requirement. This is locked.
- **Payment in wizard:** Do NOT add Wompi/payment to any wizard step. Payment lives only in `estado/[submissionId]` when `status === 'firmado'`.
- **Inline upload without presign:** Do NOT skip the presign step and POST files to the backend directly. The backend contract requires S3 presign → direct PUT.
- **Dark mode in public pages:** All public avalúo pages (landing, wizard, estado, verificar) must use `ForceLightMode`. The design is light-only for these flows.
- **Putting API calls in components:** Keep `fetch` calls in `src/lib/api/avaluo.service.ts`. Components call the service layer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step progress indicator | Custom progress bar | `WizardProgress.tsx` or the `<Progress>` primitive | Already exists, matches design |
| Drag-and-drop photo upload | Custom dropzone | Extend existing `StepPhotos.tsx` pattern (native drag events) | Already built; `react-dropzone` is in deps too |
| Back/Next navigation buttons | Custom nav | `<WizardNavigation>` from `src/components/wizard/` | Handles all edge cases (first step, last step, isSubmitting) |
| File drop zone | Custom | `DocumentUpload` component or `StepPhotos` pattern | Two working implementations exist |
| Toast notifications | `alert()` or custom | `toast()` from `sonner` (already configured) | Sonner instance is already configured in panel layout |
| Status badge | Custom colored div | `<Badge variant="warning">` / `variant="success"` etc. | All variants exist; map avalúo states to badge variants |
| Checkbox form field | Raw `<input type=checkbox>` | `<Checkbox>` from `src/components/ui/checkbox.tsx` | Radix-based, accessible, styled |

**Key insight:** The wizard infrastructure is the most complete reusable system in this codebase. ApplicationContext + WizardShell + WizardNavigation + DocumentUpload can together deliver ~70% of the avalúo wizard with minimal modification.

---

## Common Pitfalls

### Pitfall 1: useAuth() in anonymous wizard throws
**What goes wrong:** `useAuth()` (in `src/lib/auth/use-auth.ts:17`) throws `Error('useAuth must be used within an AuthProvider')` if called outside the auth context tree.

**Why it happens:** Public routes at `/avaluo/nuevo` don't wrap in `AuthProvider` (panel layout does, but public layout doesn't).

**How to avoid:** Use `useContext(AuthContext)` directly with a null check. Never call `useAuth()` in a component that may render inside a public layout. Or wrap the anonymous wizard's layout with `AuthProvider` if optional auth is desired (cheaper approach).

**Warning signs:** Uncaught error on `/avaluo/nuevo` page load.

### Pitfall 2: S3 PUT with wrong Content-Type header
**What goes wrong:** S3 presigned PUT URLs are signed for a specific `Content-Type`. If the frontend sends a PUT request without the matching header (or with a different one), S3 returns 403.

**Why it happens:** `fetch()` doesn't auto-set Content-Type on PUT by default; developers forget to pass `headers: { 'Content-Type': file.type }`.

**How to avoid:** Always pass `Content-Type: file.type` in the PUT to S3. The presign request must also pass the same `contentType` to the backend.

**Warning signs:** S3 returns 403 on PUT despite valid presigned URL.

### Pitfall 3: Polling memory leak
**What goes wrong:** `setInterval` inside `useEffect` fires after component unmounts → state updates on unmounted component → React warning.

**Why it happens:** Missing cleanup in `useEffect` return.

**How to avoid:** Always `return () => clearInterval(interval)` in the useEffect. Also stop polling on terminal states:
```typescript
useEffect(() => {
  if (status === 'entregado' || status === 'rechazado') return;
  const interval = setInterval(fetchStatus, 15_000);
  return () => clearInterval(interval);
}, [status, submissionId]);
```

### Pitfall 4: Wompi integrity hash computed client-side
**What goes wrong:** The Wompi integrity hash requires the `integritySecret` (a server-side secret). Computing it in the browser exposes the secret.

**Why it happens:** Developers copy Wompi examples that show client-side hash for testing.

**How to avoid:** Always compute the integrity hash in a Next.js API route (`src/app/api/avaluo/wompi-session/route.ts`) or ask the backend to provide it. Never embed the integrity secret in client-side code or environment variables prefixed `NEXT_PUBLIC_`.

**Warning signs:** `NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET` in env = security hole.

### Pitfall 5: ForceLightMode not applied to all public avalúo routes
**What goes wrong:** Status page or certificate viewer renders in dark mode when user has dark preference.

**Why it happens:** Only the root layout has `ForceLightMode`; nested pages inherit it, but only if the layout wraps them correctly.

**How to avoid:** Put `ForceLightMode` in the shared `(public)/avaluo/layout.tsx` — this wraps all child routes automatically (landing, nuevo, estado, verificar).

### Pitfall 6: Consent state not tracked independently
**What goes wrong:** Wizard submits without `purposeAvaluo: true` because the checkbox state is derived from a grouped state variable.

**Why it happens:** Developer uses a single `consents` boolean instead of three independent booleans.

**How to avoid:** Three separate boolean fields in `AvaluoFormData`: `purposeAvaluo`, `purposeDataset`, `purposeContacto`. Step 2 validation blocks `nextStep` if `purposeAvaluo === false`.

---

## Code Examples

### Wizard step validation pattern
```typescript
// Source: src/lib/context/PublishContext.tsx (isStepValid pattern)
const isStepValid = (step: number): boolean => {
  switch (step) {
    case 1: // Inmueble
      return !!formData.address && !!formData.city && !!formData.propertyType && formData.areaM2 > 0;
    case 2: // Contacto + Consentimientos
      return !!formData.identity && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.identity)
        && formData.purposeAvaluo === true; // REQUIRED — blocks if false
    case 3: // Fotos (optional in backend contract photoKeys is optional)
      return true;
    case 4: // Confirmación
      return true; // read-only review; submit button triggers POST
    default:
      return false;
  }
};
```

### Status-to-badge mapping
```typescript
// Source: based on DESIGN.md badge variants
const STATUS_BADGE: Record<AvaluoStatus, { variant: BadgeVariant; label: string }> = {
  borrador:     { variant: 'secondary', label: 'Borrador' },
  en_revisión:  { variant: 'warning',   label: 'En revisión' },
  firmado:      { variant: 'success',   label: 'Listo para pago' },
  rechazado:    { variant: 'destructive', label: 'Rechazado' },
  pagado:       { variant: 'default',   label: 'Pago recibido' },
  entregado:    { variant: 'success',   label: 'Entregado' },
};
```

### Polling hook (minimal)
```typescript
// Source: pattern from src/lib/hooks/use-agent-activity.ts
function useAvaluoStatus(submissionId: string | null) {
  const [data, setData] = useState<AvaluoStatusResponse | null>(null);
  const TERMINAL = ['entregado', 'rechazado'];

  useEffect(() => {
    if (!submissionId) return;
    const isTerminal = data && TERMINAL.includes(data.status);
    if (isTerminal) return;

    const fetchStatus = async () => {
      // TODO: replace with real endpoint when backend exposes it
      const res = await fetch(`${process.env.NEXT_PUBLIC_AVALUO_URL}/api/avaluo/estado/${submissionId}`);
      if (res.ok) setData(await res.json());
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [submissionId, data?.status]);

  return { statusData: data, isLoading: !data };
}
```

### Presigned photo upload sequence
```typescript
// Source: phase context backend contract + S3 presign pattern
async function uploadPhotoToS3(file: File): Promise<string> {
  const avaluoUrl = process.env.NEXT_PUBLIC_AVALUO_URL;

  // 1. Get presigned URL
  const { key, uploadUrl } = await fetch(`${avaluoUrl}/api/avaluo/photo-presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  }).then(r => r.json());

  // 2. PUT to S3 directly — no auth headers, Content-Type MUST match presign
  const s3Res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
  return key;
}
```

### Intake submission
```typescript
// Source: phase context POST /api/avaluo/intake contract
async function submitIntake(formData: AvaluoFormData): Promise<{ id: string }> {
  const avaluoUrl = process.env.NEXT_PUBLIC_AVALUO_URL;
  const res = await fetch(`${avaluoUrl}/api/avaluo/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: formData.address,
      city: formData.city,
      propertyType: formData.propertyType,
      areaM2: formData.areaM2,
      estrato: formData.estrato,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      features: formData.features,
      geo: formData.geo,
      photoKeys: formData.photoKeys,
      identity: formData.identity,           // email
      policyVersion: '1.0',
      purposeAvaluo: true,                    // ALWAYS true (blocked by step 2 validation)
      purposeDataset: formData.purposeDataset,
      purposeContacto: formData.purposeContacto,
    }),
  });

  if (res.status === 429) throw new Error('rate_limit');
  if (res.status === 422) throw new Error('validation_error');
  if (!res.ok) throw new Error('submit_error');

  return res.json(); // { id: string }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No wizard infrastructure | Full `WizardShell` + `WizardNavigation` + `DocumentUpload` at `src/components/wizard/` | Reuse 70% of wizard UI |
| PSE-only payment | PSE mock exists; Wompi is new | Must build Wompi from scratch |
| No S3 presign pattern | `StepPhotos.tsx` (publish wizard) uses local blob URLs | Must add presign step; UI drag-and-drop can be reused |
| Single-page forms | Context-based multi-step (ApplicationContext pattern) | Use as template |

**Deprecated/outdated:**
- `react-hook-form` and `zod` are in `package.json` but NOT USED anywhere in the codebase (no `useForm` or `zodResolver` calls found). The project uses plain React state (`useState`) + manual validation for all forms. Do not introduce react-hook-form for this phase — it would be the only place using it and would break consistency.

---

## Open Questions

1. **`useAuth()` safety in public routes**
   - What we know: `useAuth()` throws outside `AuthProvider`; public layouts don't include `AuthProvider`.
   - What's unclear: Does `src/app/layout.tsx` (root layout) include `AuthProvider`? If yes, it's available everywhere and the problem doesn't exist.
   - Recommendation: Check `src/app/layout.tsx` for `AuthProvider` before implementing Step 2.

2. **Wompi integrity hash — backend availability**
   - What we know: Integrity hash requires server-side secret; must NOT be computed in the browser.
   - What's unclear: Will the avalúo backend microservice provide `{ reference, amountInCents, integrity }` or does the frontend need its own `/api` route?
   - Recommendation: Plan for a Next.js API route as fallback. Ask backend team before implementing.

3. **Certificate state endpoint URL**
   - What we know: Endpoint is TBD per phase context. Plan is to mock it.
   - What's unclear: Exact response shape when available (`{ status, slug, downloadUrl, ... }`?).
   - Recommendation: Define a TypeScript interface with the expected shape and mock the hook; swap implementation when backend is ready.

4. **`(public)` route group feasibility**
   - What we know: No `(public)` group exists; public pages use bare directories.
   - What's unclear: Should avalúo use `(public)/avaluo/` (creating the group) or just `avaluo/` (consistent with existing pattern)?
   - Recommendation: Use bare `src/app/avaluo/` for consistency with `/arco`, `/aplicar`, `/verificar`. The `(public)` group in the phase spec is just a conceptual label, not a strict Next.js requirement.

---

## Sources

### Primary (HIGH confidence — source code read directly)
- `src/components/wizard/WizardShell.tsx` — canonical wizard layout with sidebar stepper
- `src/components/wizard/WizardNavigation.tsx` — back/next navigation component
- `src/components/wizard/DocumentUpload.tsx` — drag-and-drop file upload (local mock)
- `src/lib/context/ApplicationContext.tsx` — wizard state context pattern
- `src/lib/context/PublishContext.tsx` — step validation pattern (isStepValid)
- `src/components/publish/steps/StepPhotos.tsx` — multi-file drag-and-drop with preview grid
- `src/components/onboarding/OnboardingShell.tsx` — alternative wizard shell (sidebar + animated steps)
- `src/app/arco/ArcoFormClient.tsx` — single-page public form (simpler reference)
- `src/app/aplicar/layout.tsx` — public layout with ForceLightMode pattern
- `src/components/providers/ForceLightMode.tsx` — implementation of light mode enforcement
- `src/app/pse-mock/page.tsx` — existing payment mock (PSE); shows what payment UX looks like
- `src/app/panel/inmobiliaria/checkout/page.tsx` — checkout flow; redirects to pse-mock
- `src/lib/auth/use-auth.ts` + `types.ts` — auth hook API; `user.email` is the field to pre-fill
- `src/lib/api/client.ts` — apiClient singleton; not used for avalúo (separate microservice)
- `src/lib/hooks/use-agent-activity.ts` — setInterval polling pattern
- `src/components/ui/checkbox.tsx` — Radix checkbox (for consent fields)
- `src/components/ui/badge.tsx` — badge variants for status display
- `docs/DESIGN.md` — complete design system (tokens, components, anti-patterns)
- `package.json` — confirmed: react-hook-form@7.71.1 and zod@3.25.76 present but UNUSED

### Secondary (MEDIUM confidence)
- Phase context backend contract (provided by task description) — endpoint signatures and data shapes

### Tertiary (LOW confidence — not yet verified)
- Wompi integration approach: redirect-to-hosted-checkout assumed based on Wompi Colombia documentation patterns. Verify exact URL format and integrity hash algorithm with official Wompi docs before implementation.

---

## Metadata

**Confidence breakdown:**
- Wizard reuse (WizardShell, Nav, Upload): HIGH — source code read and verified
- Context pattern (AvaluoContext shape): HIGH — direct copy of ApplicationContext pattern
- Presigned S3 upload: HIGH (pattern) / MEDIUM (exact S3 behavior) — pure fetch, no library
- Status polling: HIGH — direct copy of use-agent-activity pattern
- Wompi payment: LOW — redirect approach is standard but exact integration not verified against Wompi docs
- Public layout (ForceLightMode): HIGH — identical to `/aplicar/layout.tsx`
- Auth detection in mixed routes: MEDIUM — useAuth behavior outside AuthProvider needs root layout check

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (stable stack, no fast-moving dependencies)
