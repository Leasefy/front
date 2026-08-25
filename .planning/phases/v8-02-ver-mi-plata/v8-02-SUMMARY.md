# v8-02 · Ver mi plata (F3) — SUMMARY

**Estado:** ✅ Completo · tsc limpio · next build verde · aislamiento + no-data-falsa verificados.

## Qué se entregó

La vista real "Mi plata" del propietario, cableada a los 8 endpoints de finanzas del back,
degradando honesto a "Próximamente" mientras el back esté flag-OFF.

### Capa de datos (v8-02-01)
- `src/lib/api/owner-finanzas.types.ts` — tipos EXACTOS de los 8 shapes `PortalFinanzas*`.
- `src/lib/api/owner-portal.http.ts` — capa HTTP compartida (`ownerGet` + `ownerGetBlob`), extraída
  de v8-01 para que los servicios del pilar la reusen. Transporte agent-directo + degrade→null.
- `src/lib/api/owner-finanzas.service.ts` — `ownerFinanzasApi` con los 8 métodos
  (portafolio/inmuebles/inmueble/pagos/recaudo/recaudo-anual/proyeccion/informe.pdf).
- `owner-portal.service.ts` refactor: usa el helper compartido.
- `useOwnerPortal.ts`: `useOwnerFinanzas()` (portafolio+inmuebles+proyección+recaudo-anual en
  paralelo) y `useOwnerInmueble(ref)` (detalle + pagos).

### Vistas (v8-02-02 / v8-02-03)
- `/panel/portafolio/page.tsx` — hub. loading→Spinner, unavailable→"Próximamente", data→`MiPlataView`.
- `MiPlataView.tsx` — KPIs (inmuebles/ocupación/recaudo mes/solicitudes) + lista de inmuebles con
  link a detalle + contratos por vencer (informativo) + recaudo anual por concepto + proyección +
  botón de descarga PDF.
- `/panel/portafolio/[propertyRef]/page.tsx` + `InmuebleDetalleView.tsx` — contrato + preaviso
  (informativo) + novedades (payload no-PII) + historial de pagos.
- `DescargarInformeButton.tsx` — `getInformePdf` → blob download; si null → toast "Próximamente"
  (no archivo vacío ni error crudo).

## Decisiones / invariantes
- **Montos VERBATIM** — cero aritmética de dinero en cliente (la hace el agent); el front solo
  `formatCurrency` para mostrar.
- **Vencimientos/preavisos informativos** — sin countdown alarmista ni estilos destructivos (doctrina v7).
- **PII** — el payload de novedades ya viene restringido por el back; el front lo muestra tal cual.
- Tres estados explícitos en cada página (loading / unavailable / data) — nunca números inventados.

## Archivos
- NUEVOS: owner-finanzas.types.ts, owner-finanzas.service.ts, owner-portal.http.ts,
  MiPlataView.tsx, InmuebleDetalleView.tsx, DescargarInformeButton.tsx, portafolio/[propertyRef]/page.tsx.
- EDITADOS: portafolio/page.tsx (shell→real), owner-portal.service.ts (usa http compartido),
  useOwnerPortal.ts (2 hooks nuevos).
