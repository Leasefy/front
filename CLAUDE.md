# Leasify — Frontend (front/)

Frontend único de Leasify, plataforma de arriendos inmobiliarios en Colombia.
Next.js 14 App Router. Corre en :3001 (el :3000 es del back).

> Conocimiento profundo del micro. Para contratos con otros servicios ver `../SYSTEM-MAP.md`.
> Para historial y decisiones: `mem_search(project: "front")`.

## ⚠️ Trabajo de UI — Leé esto PRIMERO

**Antes de construir, modificar o revisar CUALQUIER UI, DEBÉS leer [`docs/DESIGN.md`](./docs/DESIGN.md).**

Es la fuente de verdad para:
- Principios de diseño + anti-patrones (sin glass morphism, sin gradientes en bubbles,
  botones primarios en mayúsculas, etc.)
- Patrones canónicos de componentes (drawers, buttons, inputs, cards, banners) con refs file:line
- Tokens (colores, radius, sombras, motion, tipografía)
- Integración Lenis smooth scroll (`data-lenis-prevent` + `useLenis().stop()` obligatorio en modales)
- Reglas de accesibilidad

No inventes patrones cuando ya existe uno canónico. Si falta algo en DESIGN.md, PREGUNTÁ o extendelo.
Color específico: [`docs/COLOR_SYSTEM.md`](./docs/COLOR_SYSTEM.md).

## Qué es

Frontend completo: landing pública, catálogo de propiedades, paneles de tenant, landlord e
inmobiliaria (agencia). El código de los agentes IA NO vive acá — se migró a `Leasefy/agent`
el 2026-04-07. Este repo consume el agent vía HTTP y mantiene solo la UI de agentes (cards,
activity feed, execution panel).

## Stack

- Next.js 14.2 App Router + React 18 + TypeScript 5. Package manager: **pnpm**.
- Tailwind 3.4 + tokens via CSS vars `hsl(var(--...))` + Radix UI/shadcn + Framer Motion.
- Formularios: react-hook-form + zod. Toasts: sonner. Iconos: Phosphor + Lucide.
- Estado: React Context + hooks custom (`src/lib/context/`, `src/lib/hooks/`). SIN Zustand/Redux.
- Mapas: mapbox-gl/maplibre + supercluster. Gráficas: recharts. Scroll: lenis.
- Auth: Supabase (`@supabase/ssr`) + MFA TOTP. Push: Firebase FCM.

## Estructura

- Rutas: `/panel/inmobiliaria/*` (panel agencia; la IA vive dentro de cada módulo, p.ej. `/cobros/cobranza` y `/postulaciones/asegurabilidad` — ver `src/lib/nav/arquitectura-del-panel.ts`),
  `/panel/(landlord)`, `/inquilino`, `/propiedades`, `/onboarding`, `/aplicar`, `/auth`, `/avaluo`.
- **Backoffice admin** (`/admin/*`, `src/app/admin/`): panel interno de Leasefy/Portofino
  (operación cross-tenant). Auth propia (`/admin/login`, allowlist `ADMIN_EMAILS`), sidebar
  en `src/components/admin/Nav.tsx`. ⚠️ NO usa el design system de shadcn/`DESIGN.md`: tiene
  el suyo propio (clases `card`/`btn`/`pill`, tokens `fg/bg/brand`, mono) en `admin.css`.
  Cliente HTTP: `adminApi` (`src/lib/admin/api.ts`, base `NEXT_PUBLIC_ADMIN_API_URL`).
  Referencia canónica de patrón de pantalla: `/admin/approvals`.
- Componentes por feature folders en `src/components/` (no atomic design).
- Patrón páginas de panel: `page.tsx` (Server Component) + `XxxView.tsx` (presentación) +
  `XxxClient.tsx` (interacción).
- Lógica en `src/lib/`: `api/` (servicios `dominio.service.ts`), `auth/`, `hooks/`, `types/`,
  `cobranza/`, `cotizador/`, `search/`.

## Contratos consumidos

- **Back** (`NEXT_PUBLIC_BACKEND_URL`): cliente `src/lib/api/client.ts`, Bearer JWT de Supabase
  en memoria. Servicios por dominio en `src/lib/api/*.service.ts`.
- **Agent** (`NEXT_PUBLIC_AGENT_URL`): tipos generados en `src/lib/api/generated/agent.ts`.
  NUNCA editar a mano — regenerar con `pnpm api:gen`. Validá frescura con `pnpm api:check`
  **a mano antes de PR**: el CI NO lo corre (ver §Gates manuales).
- Mock mode: **apagado por defecto y NUNCA en producción**. Sólo lo tienen 3 servicios
  (`funnel`, `funnel-applications`, `aprobacion`), los tres con la misma guarda:
  `NODE_ENV === 'production'` → false; si no, `NEXT_PUBLIC_USE_MOCK_API === 'true'` (opt-in
  explícito) o falta `NEXT_PUBLIC_AGENT_URL`. **Cobranza y cotizador no tienen mock: siempre
  pegan al agente.** (Acá decía «activo salvo `!== 'false'`»; ese patrón no existe en el código
  y hacía pensar que el panel servía datos inventados.)
- ⚠️ `ANTHROPIC_API_KEY`, `INNGEST_*`, las keys de proveedores → viven en el `.env` del agent, NO acá.

## Auth y permisos

- `AuthProvider` escucha `supabase.auth.onAuthStateChange` y llama `GET /users/me` al back.
- Guards client-side (no middleware): `ProtectedRoute`, `AgencyRoleGuard`, `PermissionGate`.
- `PermissionsContext.canAccess(module, action)` — gate granular; carga permisos de back Y agent.
- Roles front: `tenant | landlord | agency`. Roles de agencia en `src/lib/auth/agency-roles.ts`
  (`ADMIN | AGENTE | CONTADOR | VIEWER`).

## Comandos

```bash
pnpm dev          # next dev -p 3001
pnpm test         # vitest run (happy-dom)
pnpm lint         # next lint
pnpm api:gen      # regenera tipos del agent desde OpenAPI (fallback: scripts/openapi-snapshot.json)
pnpm api:check    # falla si los tipos del agent están desactualizados
pnpm build        # next build (validar build de prod antes de PR)
npx playwright test   # E2E (tests/e2e/, requiere dev server en :3001)
```

Runtime: Node 20 (CI lo pina; no hay `.nvmrc`/`engines`). `postinstall` corre `prisma generate`.

## Gates manuales (NO los corre el CI)

El CI (`.github/workflows/ci.yml`) solo corre: `install --frozen-lockfile` → `tsc --noEmit` →
`pnpm test`. El job `e2e` es `workflow_dispatch` + `continue-on-error` (nunca bloquea merge).
**Antes de abrir PR corré a mano:** `pnpm lint`, `pnpm api:check` (si tocaste el contrato del
agent), `pnpm build`. Detalle en la skill `engineering-standards`.

## Agente de proyecto y skills

`.claude/agents/leasify-front-agent.md` delega trabajo pesado; `.claude/skills/` tiene el
conocimiento de dominio/ingeniería (cobranza, cotizador, scoring, permisos, contrato del agent,
TDD, testing, estándares, living-docs). Cargá la skill que aplique antes de tocar su dominio.

## Convenciones

- Componentes `PascalCase.tsx`; hooks nuevos en `use-kebab-case.ts`.
- UI copy en español (Colombia). Código en inglés; dominio colombiano en español.
- A11y: proyecto `panel-a11y` de Playwright con axe-core — los paneles nuevos deben pasarlo.
- E2E de cobranza mockean red con `route.fulfill` (no requieren agente corriendo).
- localStorage legacy con prefijo `arriendo-facil-` (nombre pre-rebrand): NO renombrar.

## Decisiones tomadas

| Decisión | Elección | Por qué |
|----------|----------|---------|
| Ubicación de agentes IA | repo separado `Leasefy/agent` | Microservicio dueño de los agentes; el front llama por HTTP. 2026-04-07 (commit `60e773c`) |
| Plan gating de IA | solo planes Flex | Los agentes IA son el diferenciador del plan Flex |
| Colores UI agentes | neutro/sobrio | Sin colores estridentes |
