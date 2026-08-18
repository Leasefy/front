# v8-03 · Elegir inquilino (F2) — SUMMARY

**Estado:** ✅ Completo · tsc limpio · next build verde · aislamiento + WYSIWYS + anti-PII verificados.

## Qué se entregó

Flujo real de elección de inquilino, cableado a los 3 endpoints de F2, degrade honesto (flag-OFF).

### Capa de datos
- `owner-seleccion.types.ts` — 4 tipos exactos (`EleccionProceso/Candidato/Comparacion/Ok`).
  Candidato mínimo (sin PII).
- `owner-portal.http.ts` — `ownerPost` + `OwnerActionResult` (semántica de acción: distingue éxito
  de `terms_changed`/conflict, no degrade silencioso).
- `owner-seleccion.service.ts` — `getProcesos`, `getComparacion`, `elegir(…, snapshotHash)`.
- Hooks: `useOwnerProcesos` (lista; vacío = estado legítimo, no "Próximamente") y
  `useOwnerComparacion` (con `reload` para el caso WYSIWYS).

### Vistas
- `/panel/seleccion/page.tsx` — lista de procesos (propiedad, estado, resuelto/comparar).
- `/panel/seleccion/[processId]/page.tsx` + `ComparacionView.tsx` — cards de postulados asegurables
  (nombre, verdict, score, elegible) + elección one-click con **confirmación inline de 2 pasos**
  ("habilita el contrato"). Reenvía el `snapshotHash` mostrado (WYSIWYS).

## Invariantes respetadas
- **WYSIWYS**: `elegir` envía el `snapshotHash` de la comparación en pantalla. `terms_changed` (409) →
  recarga + aviso, no fuerza.
- **CAS single-winner**: conflict → aviso; el estado lo fija el back (sin optimismo).
- **Anti-PII (LEGAL Q2/Q5)**: el front sólo muestra el shape mínimo — cero cédula/email/buró/evaluationId.
- **Sólo elegibles** muestran botón "Elegir".
- **Confirmación inline** (no modal) → evita la integración Lenis obligatoria de modales y mantiene
  la doctrina de UI.

## Archivos
- NUEVOS: owner-seleccion.types.ts, owner-seleccion.service.ts, ComparacionView.tsx,
  seleccion/[processId]/page.tsx.
- EDITADOS: owner-portal.http.ts (+ownerPost), useOwnerPortal.ts (+2 hooks), seleccion/page.tsx (shell→real).
