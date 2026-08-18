# v8-01 · Fundación — SUMMARY

**Estado:** ✅ Completo · build verde · aislamiento verificado.

## Qué se entregó

Fundación del Portal del Propietario (front), aditiva sobre `(landlord)`.

### Foundation (capa de datos)
- `src/lib/api/owner-portal.types.ts` — tipos frontend-first del contrato owner-facing. `OwnerPerfil`
  (`{ ownerRef, displayName, propertiesCount }`) implementado; pilares F2-F5 documentados con sus
  endpoints para las olas siguientes. Se migrará a `components['schemas']` cuando el schema generado
  incluya `PortalPropietario*` (hoy el back vive en rama sin mergear).
- `src/lib/api/owner-portal.service.ts` — `ownerPortalApi.getPerfil(agencyId)`. Transporte
  **browser → agent directo** (`NEXT_PUBLIC_AGENT_URL`, no el BFF del monolito) porque el back
  provisiona CORS para `/api/portal/*` y los endpoints viven en el agent. Degrade honesto: cualquier
  fallo (agent URL/agencyId ausente, !res.ok incl. 401/403/404 por flag-OFF, red/CORS/parse) → `null`.
- `src/lib/hooks/useOwnerPortal.ts` — `useOwnerAgencyId()` (resuelve `agencyId`; hoy `null` para
  landlord → dependencia de encendido de Victor) + `useOwnerPerfil()` (expone
  `{ perfil, isLoading, unavailable, agencyId }`; `unavailable` gobierna "Próximamente").

### Navegación + shells
- `src/app/panel/(landlord)/layout.tsx` — sección "Mi arriendo" + 4 items con `tag: 'Pronto'`:
  Mi plata → `/panel/portafolio`, Elegir inquilino → `/panel/seleccion`,
  Solicitudes → `/panel/solicitudes`, Novedades → `/panel/novedades`.
- `src/components/landlord/portal/PortalPlaceholder.tsx` — shell honesto compartido
  (`PageHeader` + `EmptyState` "Próximamente").
- 4 páginas shell (portafolio/seleccion/solicitudes/novedades) — cada una describe honestamente qué
  mostrará y que "se activa cuando tu inmobiliaria habilite el Portal del Propietario".

## Decisiones
- **Transporte agent-directo** (no BFF) — el back lo pide explícitamente (CORS `/api/portal/*`).
- **Español hardcodeado en la chrome** — consistente con el nav existente del layout (labels ya
  hardcodeados). Las olas que llenen los shells i18nizan sus vistas.
- **Shells como empty-states completos**, no stubs con TODO (regla de completitud).

## Dependencias de encendido (Victor)
1. `PORTAL_PROPIETARIO_ENABLED` ON en el agent.
2. Owner-JWT HS256 del monolito (trae `agencyId`) → actualizar `useOwnerAgencyId`.
3. Dominio del front en `CORS_ALLOWED_ORIGINS` del agent.

## Archivos
- NUEVOS: owner-portal.types.ts, owner-portal.service.ts, useOwnerPortal.ts, PortalPlaceholder.tsx,
  4× page.tsx (portafolio/seleccion/solicitudes/novedades).
- EDITADO: `(landlord)/layout.tsx` (import de íconos + 5 entradas de nav).
