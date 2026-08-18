# v8-04 · Solicitudes (F4) — VERIFICATION

**Veredicto: GOAL ACHIEVED** ✅

Goal: flujo real de solicitudes (crear/listar/detalle con timeline de debido proceso), degrade
honesto, aditivo sin tocar inmobiliaria.

## Evidencia

| Gate | Resultado |
|------|-----------|
| **tsc --noEmit** | ✅ limpio |
| **next build** | ✅ verde — `/panel/solicitudes` (○), `/panel/solicitudes/nueva` (○), `/panel/solicitudes/[requestId]` (ƒ); 208/208 páginas |
| **Aislamiento** | ✅ cero imports de inmobiliaria; inmobiliaria sin cambios |
| **Anti-PII** | ✅ el `llamado` se renderiza sólo con `situationKey`+fecha; sin emisor/notas en el front |
| **Sin auto-terminación** | ✅ el front no computa/sugiere "terminación elegible"; sólo muestra timeline |
| **Acción vs degrade** | ✅ `crear` usa `OwnerActionResult` (éxito/unavailable/error diferenciados) |
| **Ruta estática vs dinámica** | ✅ `nueva` resuelve sobre `[requestId]` (Next: estática gana) |
| **No data falsa** | ✅ flag-OFF → "Próximamente"; lista vacía con agencyId → estado legítimo |

## Endpoints (3/3 cableados)
`GET /solicitudes` ✅ · `POST /solicitudes` ✅ · `GET /solicitudes/{id}` ✅.

## Pendiente próximas olas
- v8-05 (Daños + digest / F5): vista de daños fail-soft + digest mensual + consentimiento → cierra el milestone.
