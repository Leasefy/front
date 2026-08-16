# v8-01 · Fundación — PLAN

**Goal:** establecer la fundación del Portal del Propietario (front) sobre `(landlord)`:
capa de servicio/tipos cableada a `/api/portal/{agencyId}/propietario/*`, navegación con los
4 pilares, y shells honestos "Próximamente" — todo aditivo, sin tocar inmobiliaria ni captación.

## Contexto verificado (recon 2026-07-20)

- Back v1 completo, **flag-OFF** → todos los endpoints devuelven 404/403/401. Front-first + degrade honesto.
- `(landlord)` aislado de `inmobiliaria` (route-group + auth + cero imports cruzados).
- Perfil back: `GET /api/portal/{agencyId}/propietario/perfil` → `{ ownerRef, displayName: string|null, propertiesCount: number }`.
- **Dependencia de encendido (Victor):** el `landlord` no carga `agencyId` en el auth del front
  (solo AGENT/INMOBILIARIA tienen `agency`). El owner-JWT HS256 del monolito trae `agencyId`.
  Hasta que exista → el portal degrada a "Próximamente" (honesto). Análogo a A1-A4 de v7.
- Idiom de degrade: `*.service.ts` traga `ApiError.status ∈ {401,403,404}` → vacío/null.
- Infra: `apiClient.{get,getBlob}` (`@/lib/api/client.ts`), `EmptyState` (`@/components/ui/empty-state`,
  `{icon,title,description,action?}`), `NavItem` soporta `kind:'section'` + `tag` (pill "Pronto"),
  `PageHeader` (Cadence).

## Sub-plan v8-01-01 — Owner-portal foundation (tipos + service + hook)

Archivos NUEVOS:
- `src/lib/api/owner-portal.types.ts` — tipos frontend-first documentando el shape del back
  (perfil ahora; contenedores de los pilares documentados para olas 2-5). Fuente de verdad: los
  route files del back (`portal-propietario-*.ts`). Cuando el schema generado incluya
  `PortalPropietario*`, migrar a `components['schemas'][...]` (como v7 acuerdos).
- `src/lib/api/owner-portal.service.ts` — `ownerPortalApi.getPerfil(agencyId)` vía `apiClient.get`,
  con degrade honesto (401/403/404 → `null` = no-disponible). Documenta la dependencia agencyId/JWT.
- `src/lib/hooks/useOwnerPortal.ts` — `useOwnerPerfil()` que resuelve `agencyId` (hoy null para
  landlord → `unavailable: true`), expone `{ perfil, isLoading, unavailable }`.

## Sub-plan v8-01-02 — Nav + shells honestos

Editar:
- `src/app/panel/(landlord)/layout.tsx` — agregar al `LANDLORD_NAV_ITEMS` una sección
  `{ kind:'section', label:'Mi arriendo' }` + 4 items con `tag:'Pronto'`:
  - Mi plata → `/panel/portafolio` (icon `Wallet`)
  - Elegir inquilino → `/panel/seleccion` (icon `UsersThree`)
  - Solicitudes → `/panel/solicitudes` (icon `ChatCircleText`)
  - Novedades → `/panel/novedades` (icon `Bell`)

Crear shells (cada uno = `PageHeader` + `EmptyState` honesto, COMPLETO, sin TODO):
- `src/app/panel/(landlord)/portafolio/page.tsx`
- `src/app/panel/(landlord)/seleccion/page.tsx`
- `src/app/panel/(landlord)/solicitudes/page.tsx`
- `src/app/panel/(landlord)/novedades/page.tsx`

Copy del empty-state: honesto — "Próximamente. Esta sección se activa cuando tu inmobiliaria
habilite el Portal del Propietario." NUNCA data falsa.

## Gates de verificación

- `tsc`/`next build` verde (EXIT 0).
- Cero imports desde `@/components/inmobiliaria` o `@/lib/inmobiliaria` en lo nuevo.
- Cero data mock/falsa en rutas de propietario (grep de arrays hardcodeados de pagos/candidatos).
- `inmobiliaria/layout.tsx` sin cambios (diff vacío).
- Las 4 rutas nuevas renderizan Próximamente (no crashean por back 404).
