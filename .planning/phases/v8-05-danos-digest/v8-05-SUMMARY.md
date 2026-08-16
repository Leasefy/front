# v8-05 · Daños + digest (F5) — SUMMARY

**Estado:** ✅ Completo · tsc limpio · next build verde · aislamiento + DS + fail-soft verificados.
**Cierra el milestone v8.0.**

## Qué se entregó

Hub de novedades: resumen mensual (digest) + daños fail-soft. **DS-correct desde el arranque.**

### Capa de datos
- `owner-novedades.types.ts` — `DamageTicket`, `DanosResponse`, `DigestListItem`, `DigestPayload`, `Digest`.
- `owner-novedades.service.ts` — `getDanos(propertyRef?)`, `getDigests()`, `getDigest(periodo)`.
- Hooks: `useOwnerNovedades` (digests + danos en paralelo) y `useOwnerDigest(periodo)`.

### Vistas
- `/panel/novedades/page.tsx` — hub: sección "Resumen mensual" (lista de digests → detalle) +
  `DamagesSection`.
- `DamagesSection.tsx` — fail-soft: `null`/`available:false` → "Próximamente" SOLO para daños;
  tickets con estado (`Badge`), categoría/severidad, costo final (mono) y fechas.
- `/panel/novedades/[periodo]/page.tsx` + `DigestView.tsx` — render del `DigestPayload`: recaudo del
  mes + por inmueble, ocupación, solicitudes (creadas/resueltas/abiertas + nota), daños resueltos,
  contratos por vencer, acciones pendientes (decisiones + preavisos, con deep-links al portal).

## Invariantes / DS
- **Fail-soft** de daños (`available:false` no rompe el hub).
- **PII-minimización**: el payload ya viene minimizado por el back; se muestra tal cual.
- **DS-correct**: tokens Cadence (`text-fg`/`text-fg-muted`/`border-border`), **numerales
  `font-mono tabular-nums`**, `Badge` para estado de daños, `Card`/`PageHeader`. 0 tokens legacy.
- Sin data falsa: flag-OFF → "Próximamente"; listas vacías con agencyId → estado legítimo.

## Archivos
- NUEVOS: owner-novedades.types.ts, owner-novedades.service.ts, DamagesSection.tsx, DigestView.tsx,
  novedades/[periodo]/page.tsx.
- EDITADOS: novedades/page.tsx (shell→real), useOwnerPortal.ts (+2 hooks).
