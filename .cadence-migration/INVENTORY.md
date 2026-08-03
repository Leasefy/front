# Cadence Migration Inventory — `mvp` Next.js App

> Read-only inventory to plan a 100% migration to the Cadence design system (`@leasefy/cadence`).
> The `→ Cadence equivalent` columns are intentionally **blank** — fill from the Cadence catalog.

**Status of Cadence adoption today**
- `@leasefy/cadence` is a local dependency (`file:../cadence`) and is **already imported in 101 files**.
- Cadence exposes **~120 exported components** (139 component files under `cadence/src/components/ui`).
- **27 of the 47 local `src/components/ui/*` files are already thin adapters/shims that re-export or wrap Cadence** (Button, Input, Card, Badge, Sheet, Dialog, Select, Switch, Table, Tabs, Toast, etc.). The remaining migration surface is mostly: (a) the ~20 still-local UI primitives, (b) the large bespoke component subdirectories (esp. `inmobiliaria/`, 243 files), and (c) heavy inline-Tailwind in the page files.
- Pages also import Cadence directly for newer primitives: `SegmentedControl` (most-used, ~33 files), `Chip`, `BrandContour`, `Eyebrow`, `KpiCard`, `StatusBadge`, `BackButton`.

---

## 1. Screens Index — 232 routes (`page.tsx`)

| Area | Count | What it is |
|------|-------|------------|
| **Marketing / public** | ~43 | Landing + content + product pages: `/` (landing), `landing-nueva`, `arco`(+`/verify/[token]`), `ayuda`(+`/propietarios`), `blog`(+`/[slug]`), `brand`, `pricing`(+`/empresas`), `productos/*` (api, aplicaciones, contratos, evaluacion, pagos, seguro), `para/*` (agentes, inmobiliarias, inquilinos, propietarios), `propiedades`(+`/[id]`), `publicar`, `preaprobacion`, `privacidad`, `terminos`, `registro`, `verificar/[code]`, `mi-arriendo`, `mis-aplicaciones`. Plus DS/demo previews: `preview-ds`, `sidebar-preview`, `agentes-preview`, `demo/score`, `pse-mock`. |
| **auth** | 3 | `auth`, `auth/mfa-verify`, `auth/update-password` — login / MFA / password reset. |
| **onboarding** | 4 | `seleccionar-rol`, `inquilino`, `propietario`, `inmobiliaria` — role-based onboarding wizards. |
| **inquilino** (tenant portal) | 17 | Tenant dashboard + sub-areas: `aplicaciones`(+`[applicationId]`+`/completar`), `arriendo`(+`[leaseId]`), `contratos`(+`[contractId]/firmar`), `pagos`, `documentos`, `explorar`, `guardados`, `mensajes`, `notificaciones`, `para-ti`, `perfil`, `configuracion`. |
| **avaluo** (public AVM flow) | 5 | `avaluo/nuevo`, `avaluo/estado/[submissionId]`, `avaluo/verificar/[slug]`, `avaluo-ia/reporte`, plus `invitacion/[token]`, `aplicar/[propertyId]`. |
| **panel/(landlord)** | 14 | Individual-landlord dashboard: `propiedades`, `[propertyId]`, `contract/[candidateId]`, `candidatos`, `leases`, `contratos`, `visitas`, `mensajes`, `notificaciones`, `perfil`, `configuracion`, `checkout`, `upgrade`. |
| **panel/inmobiliaria** (agency core) | 61 | Agency back-office (non-AI): `dashboard`, `hoy`, `operaciones`, `pipeline`, `portafolio`(+`[id]`,`importar`,`nuevo`), `propiedades`(+`captura`,`nueva`,`[id]/candidatos`), `propietarios`(+`[id]`), `contratos`(+CRUD+`firmar`), `cobros`, `dispersiones`(+`generar`), `tesoreria`(+`ap/[id]`), `facturacion`, `creditos`, `reportes`, `analytics`, `agenda`, `agentes`(+`[id]`), `mensajes`, `pqrs`, `postulaciones`, `documentos`, `configuracion`, `perfil`, `checkout`, `upgrade`, `beta`, plus **legacy AI flows** `avaluos`/`avaluos-ia` (7), `conciliacion`/`conciliacion-ia` (9). |
| **panel/inmobiliaria/ai** (AI agent suite) | 89 | Largest area. Sub-suites: **cobranza** (35 — collections: deudores, llamadas, escalaciones, promesas, compliance/ley-2300, cartas, siniestros, etc.), **asegurabilidad** (14 — insurability/quotes/carriers), **pagos** (12), **estudio** (10 — tenant study/risk), **conciliacion** (8 — reconciliation), **matching** (5), **avaluos** (4 — AVM). Each typically has list, `[id]` detail, `cola` (queue), `configuracion`, `analitica`. |
| **panel** (misc) | 1 | `panel/beta`. |

> Pattern: most `panel/**` areas follow a **list → `[id]` detail → `cola`/`configuracion`/`analitica`** shape, so a handful of page templates cover the bulk of 150+ panel screens.

---

## 2. Local UI Component Inventory — `src/components/ui/*` (47 files)

Usage count = number of files (in `src/app` + `src/components`) that import it. **"Wraps DS"** = already a thin adapter over `@leasefy/cadence` (migration is mostly done for these — verify parity, not rewrite).

| Component | File | What it is | Current style signature | Usage | Wraps DS? | → Cadence equiv |
|-----------|------|-----------|-------------------------|-------|-----------|-----------------|
| Button | `ui/button.tsx` | Button, variants default/white/destructive/outline/secondary/glass/ghost/link; sizes default(h-10)/sm/lg/icon; auto ArrowUpRight | adapter → DS `Button` (pill); local keeps h-10 fidelity | **158** | ✅ | |
| EmptyState | `ui/empty-state.tsx` | Empty state, Phosphor icon chip + title + desc + CTA pill | **local**, monochrome (no DS brand moment), neutral chip, outlined CTA | 27 | ❌ | |
| Badge | `ui/badge.tsx` | Badge/pill; variants incl. `risk-a..d` (tenant scoring) | adapter → DS `Badge`; risk-* keep `hsl(var(--risk-x))` | 27 | ✅ | |
| Skeleton | `ui/skeleton.tsx` | Loading skeleton block | (check) animate-pulse muted | 25 | — | |
| Input | `ui/input.tsx` | Text input | adapter → DS `Input`; local adds h-11 px-4 text-base | 24 | ✅ | |
| SectionLabel | `ui/section-label.tsx` | Eyebrow label: 12px mono uppercase + colored dot | **local**; `text-xs font-mono uppercase tracking-wider`, dot `bg-primary` | 21 | ❌ (≈ DS `Eyebrow`) | |
| Sheet | `ui/sheet.tsx` | Side/drawer panel (Radix) | adapter → DS `Sheet`; legacy overlay `z-[300] bg-black/60`, 500ms anim | 19 | ✅ | |
| Dialog | `ui/dialog.tsx` | Modal dialog | adapter → DS `Dialog` | 19 | ✅ | |
| Label | `ui/label.tsx` | Form label | adapter → DS `Label` | 14 | ✅ | |
| Select | `ui/select.tsx` | Select dropdown (Radix) | adapter → DS `Select` | 12 | ✅ | |
| Card | `ui/card.tsx` | Card + Header/Title/Desc/Content/Footer | shim → DS `Card`; surface bg, hairline border, radius-md, no shadow | 12 | ✅ | |
| BackButton | `ui/back-button.tsx` | Back nav button | (pages also import DS `BackButton` directly) | 11 | — | |
| Switch | `ui/switch.tsx` | Toggle switch | adapter → DS `Switch` | 10 | ✅ | |
| Tooltip | `ui/tooltip.tsx` | Tooltip (Radix) | (check) | 9 | — | |
| Toast | `ui/toast.tsx` | Toast + Toaster + `toast()` | adapter → DS `Toaster`/`toast` | 9 | ✅ | |
| Textarea | `ui/textarea.tsx` | Multi-line input | adapter → DS `Textarea` | 8 | ✅ | |
| ErrorState | `ui/error-state.tsx` | Error placeholder | adapter → DS `ErrorState` | 8 | ✅ | |
| Alert | `ui/alert.tsx` | Inline alert/callout | adapter → DS `Alert` | 8 | ✅ | |
| Tabs | `ui/tabs.tsx` | Tabs (Radix) | adapter → DS `Tabs`/`TabsList` | 7 | ✅ | |
| DropdownMenu | `ui/dropdown-menu.tsx` | Dropdown menu (Radix) | adapter → DS `DropdownMenu` | 6 | ✅ | |
| Checkbox | `ui/checkbox.tsx` | Checkbox (Radix) | adapter → DS `Checkbox` | 6 | ✅ | |
| AlertDialog | `ui/alert-dialog.tsx` | Confirm dialog (Radix) | adapter → DS `AlertDialog` | 6 | ✅ | |
| Table | `ui/table.tsx` | Data table primitives | adapter → DS `Table` | 4 | ✅ | |
| Spinner | `ui/spinner.tsx` | Loading spinner | adapter → DS `Spinner` | 3 | ✅ | |
| Popover | `ui/popover.tsx` | Popover (Radix) | adapter → DS `Popover` | 3 | ✅ | |
| ScrollArea | `ui/scroll-area.tsx` | Scroll container | (check) | 2 | — | |
| AnimatedCounter | `ui/animated-counter.tsx` | Count-up number animation | **local** (framer) | 2 | ❌ | |
| Accordion | `ui/accordion.tsx` | Accordion (Radix) | adapter → DS `Accordion` | 2 | ✅ | |
| ResponsiveDialog | `ui/responsive-dialog.tsx` | Dialog↔Sheet by breakpoint | **local** composite | 1 | ❌ | |
| Progress | `ui/progress.tsx` | Progress bar | adapter → DS `Progress` | 1 | ✅ | |
| Pagination | `ui/pagination.tsx` | Pager | adapter → DS `Pagination` | 1 | ✅ | |
| LockedFeatureOverlay | `ui/LockedFeatureOverlay.tsx` | Paywall/locked overlay | **local** (≈ DS `locked-feature`) | 1 | ❌ | |
| IconTooltip | `ui/icon-tooltip.tsx` | Info-icon tooltip | **local** | 1 | ❌ | |
| Drawer | `ui/drawer.tsx` | Bottom drawer | adapter → DS `Drawer` | 1 | ✅ | |
| Breadcrumb | `ui/breadcrumb.tsx` | Breadcrumb | adapter → DS `Breadcrumb` | 1 | ✅ | |
| Avatar | `ui/avatar.tsx` | Avatar | adapter → DS `Avatar` | 0* | ✅ | |
| Kbd | `ui/kbd.tsx` | Keyboard key tag | adapter → DS `Kbd` | 0* | ✅ | |
| Slider | `ui/slider.tsx` | Range slider | adapter → DS `Slider` | 0* | ✅ | |
| **Unused / zero direct imports** | `visually-hidden, toggle-group, separator, not-found, hover-card, divider, collapsible, aspect-ratio` | mix of DS shims + local utils | — | 0 | mix | |

\*0 = no direct `components/ui/<name>` import found (may be re-exported via `ui/index.ts` barrel, or dead). `index.ts` barrel re-exports ~40 of these.

**Migration read on the `ui/` layer:** ~27 already wrap Cadence → low effort (parity check). ~10 still **local and need a Cadence target**: `EmptyState`, `SectionLabel` (→ `Eyebrow`), `AnimatedCounter`, `ResponsiveDialog`, `LockedFeatureOverlay` (→ `locked-feature`), `IconTooltip`, `BackButton`, plus the dead/util files.

---

## 3. Other reusable component subdirectories (`src/components/**`)

| Dir | Files | Role / notable shared components |
|-----|------:|----------------------------------|
| `inmobiliaria/` | **243** | Agency feature components — biggest surface. Cards/tables/modals/drawers/forms (`AgenteCard`, `AgenteTable`, `CobroCard`, `CobroTable`, `CandidateDrawer`, `AnalyticsKPICards`, `CommandPalette`, `ConfigBranding`, etc.) + `ai/` & `cobranza/` sub-bundles, plus app-specific shells `ai/WorkspaceNav`, `ai/AIAgentDetailSidebar`. Heavy bespoke Tailwind + hardcoded brand hex. |
| `beta/` | 30 | Beta agency shell: `BetaSidebar`, `MobileSidebarDrawer`, dashboards. |
| `skeleton/` | 28 | Per-screen loading skeletons. |
| `landing/` | 28 | Marketing sections + `LandingNav`. |
| `landlord/` | 25 | Individual-landlord shell: `DashboardSidebar`, `TabNavigation`, cards. |
| `home/` | 19 | Public homepage sections (hero, features). |
| `tenant/` | 16 | Tenant portal: `TenantDashboardSidebar`, cards. |
| `publish/` | 14 | Property publish wizard + `PublishShell`. |
| `contract/` | 14 | Contract viewer/signing. |
| `property/` | 13 | Property cards, `FilterSidebar`, gallery. |
| `wizard/` | 12 | Generic wizard: `WizardShell`, `WizardNavigation`. |
| `onboarding/` | 12 | `OnboardingShell`, `TenantOnboardingShell`, steps. |
| `auth/` | 12 | Login/register forms. |
| `score/` | 11 | Tenant credit-score visualizations. |
| `pricing/` | 10 | Pricing tables/cards. |
| `avaluo/` | 8 | AVM wizard + `AvaluoWizardShell`. |
| `settings/` | 7 | Settings panels. |
| `panel/`,`lease/` | 6 ea | Shared panel chrome / lease cards. |
| `providers/`,`map/`,`layout/` | 5 ea | Context providers; Mapbox map; `Navbar`/`Footer`/`MobileNavBar`/`MobileNavSheet`. |
| `data-display/`,`cotizador/` | 4 ea | Stat/data widgets; quote calculator. |
| `tour/`,`demo/` | 3 ea | Product tour; demo widgets. |
| `seo/`,`notifications/`,`messages/`,`brand/` | 1 ea | Misc. |

**App-wide chrome to standardize on Cadence** (Cadence has `app-shell`, `sidebar`, `top-bar`, `navigation-menu`): currently **6+ different sidebar/shell implementations** — `beta/BetaSidebar`, `landlord/DashboardSidebar`, `tenant/TenantDashboardSidebar`, `inmobiliaria/ai/WorkspaceNav`, `ui/plan/PlanSidebar`, plus shells `WizardShell`/`PublishShell`/`OnboardingShell`/`AvaluoWizardShell`/`layout/Navbar`. These are the highest-leverage migration targets.

---

## 4. Bespoke / inline patterns used directly in pages

Measured across `src/app/**/page.tsx`:

| Pattern | Scale | Notes / Cadence target |
|---------|-------|------------------------|
| Raw `<button>` | **329 occurrences in 85 files** | Replace with Cadence `Button` / `IconButton` / `Chip` / `SegmentedControl`. |
| Raw `<input>` | **28 files** | Replace with Cadence `Input` / `SearchInput` / `CurrencyInput` / number/phone inputs. |
| Hardcoded card `bg-white … rounded-* p-*` | **32 files** (and far more across components) | Replace with Cadence `Card` (surface + hairline + radius-md). |
| Hardcoded hex colors | **85 page files** | Move to Cadence tokens — see §5. |
| Phosphor icons imported in pages | **179 files** | Icon usage is pervasive (consistent with Cadence). |
| Inline KPI tiles | ~20 files use a KPI concept | Cadence `KpiCard`/`Stat`/`StatTrend` (already imported in a few). |

**Radius histogram (page files):** `rounded-xl` **1288**, `rounded-full` 647, `rounded-md` 305, `rounded-lg` 153, `rounded-2xl` 78, `rounded-sm` 71, `rounded-none` 2.
→ Note from `button.tsx`/`card.tsx` comments: a **"radius sweep"** is in progress (`rounded-md→sm, rounded-lg→md, rounded-2xl/3xl→xl`). The dominant `rounded-xl` is the intended large radius; stray `rounded-lg`/`rounded-2xl` are legacy and should normalize to the Cadence scale.

---

## 5. Notable old-design signatures still present

- **Hardcoded brand/semantic hex instead of tokens** (top offenders across pages):
  - `#1A40FF` electric-blue (**627×**) and `#5570FF`/`#EEF1FF` — the legacy **electric-blue brand**. Note the *new* token system in `globals.css` defines `--primary`/`--brand` as **indigo `#5B5FEF`** (`--indigo-500`), so `#1A40FF` heroes/CTAs are **old-design and off-token**.
  - Semantic palette hardcoded: green `#2C7A53`/`#3EAE70`/`#E8F3EC` (400+), red/terracotta `#C4503B`/`#E0664D`/`#F8EAE7`, amber/gold `#B7791F`/`#D2992F`/`#F8F0E0` — should become Cadence success/danger/warning tokens.
  - Dark surfaces `#14130f`/`#1a1a1c`/`#0e0e10` — bespoke dark "product" backgrounds (globals defines `--product-bg` etc.).
- **`SectionLabel` (mono uppercase + dot)** is a local pre-Cadence eyebrow; Cadence ships `Eyebrow` (already used in 11 files) → consolidate.
- **Local `Button` keeps `h-10` "fidelity" override** vs Cadence pill default `md` — confirm whether to drop the override for true pill parity.
- **Local `EmptyState` deliberately bypasses the DS "brand moment"** (monochrome redesign) — divergent from Cadence `empty-state`/`empty-hero`; decide which wins.
- **`Sheet` keeps legacy 500ms animation + `z-[300]` overlay** vs Cadence slide-in default.
- **Multiple bespoke sidebars/shells** (§3) predate Cadence `app-shell`/`sidebar`/`top-bar`.
- **`risk-a..d` Badge variants** use raw `hsl(var(--risk-x))` not present in Cadence — need a tenant-scoring tone mapping or `risk-badge` (Cadence ships `risk-badge`).

---

## 6. Migration surface estimate

- **Routes:** 232 screens, but ~150 panel screens collapse into a handful of list/detail/queue/config **templates** → migrating ~10–15 page templates covers most panel surface.
- **`ui/` primitives:** 47 files — **~27 already on Cadence** (parity check only); **~10 still local** need a Cadence target; ~10 unused/dead.
- **Cadence catalog available:** ~120 components — more than enough coverage (includes `app-shell`, `sidebar`, `top-bar`, `kpi-card`, `pipeline-board`, `data-table`, `chart`/`bar-chart`/`donut-chart`, `currency-input`, `file-dropzone`, `command-menu`, `chat-thread`, `risk-badge`, etc.).
- **Distinct components needing a Cadence equivalent (net new mapping work):** roughly **35–45**:
  - ~10 still-local `ui/*` primitives.
  - ~6 app-wide shells/sidebars/topbars → 3 Cadence shell components.
  - The recurring bespoke page elements: raw button, raw input, hardcoded card, KPI tile, eyebrow/section-label, status chip, stat/trend, filter bar, data table, drawer/modal.
  - Domain widgets in `inmobiliaria/`,`score/`,`property/`,`pricing/`,`contract/` (cards/tables/drawers) — high *count* (243 files in `inmobiliaria/` alone) but they compose from a **small set** of the above primitives, so the *distinct-component* mapping stays ~40.
- **Highest-leverage first steps:** (1) finish/verify the `ui/*` adapter parity; (2) replace the 329 raw `<button>` + 28 raw `<input>` + 32 hardcoded cards with Cadence primitives; (3) unify the 6 sidebars/shells onto Cadence `app-shell`/`sidebar`/`top-bar`; (4) token-sweep the hardcoded hex (esp. `#1A40FF` → Cadence indigo `--brand`).

---

*Inventory generated read-only. No application code was modified.*
