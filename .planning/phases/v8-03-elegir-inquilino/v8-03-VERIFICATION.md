# v8-03 · Elegir inquilino (F2) — VERIFICATION

**Veredicto: GOAL ACHIEVED** ✅

Goal: flujo real de elección (listar procesos, comparar asegurables, elegir one-click WYSIWYS),
degrade honesto, aditivo sin tocar inmobiliaria.

## Evidencia

| Gate | Resultado |
|------|-----------|
| **tsc --noEmit** | ✅ limpio |
| **next build** | ✅ verde — `/panel/seleccion` (○ static, 4.21 kB) + `/panel/seleccion/[processId]` (ƒ dynamic, 5.94 kB); 207/207 páginas |
| **Aislamiento** | ✅ cero imports de inmobiliaria; `panel/inmobiliaria` + `components/inmobiliaria` sin cambios |
| **WYSIWYS** | ✅ `elegir()` reenvía `comparacion.snapshotHash`; `terms_changed`/409 → `reload()` + aviso |
| **CAS single-winner** | ✅ conflict → aviso; estado fijado por el back (sin optimismo) |
| **Anti-PII** | ✅ el front sólo consume/renderiza el shape mínimo (nombre, verdict, score, elegible); sin cédula/email/buró |
| **Acción vs degrade** | ✅ POST usa `OwnerActionResult` (distingue éxito/terms_changed/conflict/unavailable) |
| **No data falsa** | ✅ back flag-OFF → "Próximamente"; lista vacía con agencyId → estado legítimo |

## Endpoints (3/3 cableados)
`GET /procesos` ✅ · `GET /procesos/{id}/comparacion` ✅ · `POST /procesos/{id}/eleccion` ✅.

## Notas
- Confirmación de elección **inline de 2 pasos** (no modal) — evita el requisito de integración Lenis
  para modales y mantiene la UI simple; la acción es consecuente ("habilita el contrato") y clara.
- Back flag-OFF → hoy renderiza "Próximamente"; el flujo está listo y type-safe para el encendido.

## Pendiente próximas olas
- v8-04 (Solicitudes / F4): crear/listar solicitud + timeline de debido proceso.
