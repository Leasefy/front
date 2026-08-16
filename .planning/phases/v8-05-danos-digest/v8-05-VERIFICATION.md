# v8-05 · Daños + digest (F5) — VERIFICATION

**Veredicto: GOAL ACHIEVED** ✅ — **cierra el milestone v8.0.**

Goal: hub de novedades (resumen mensual + daños fail-soft), degrade honesto, aditivo, DS-correct.

## Evidencia

| Gate | Resultado |
|------|-----------|
| **tsc --noEmit** | ✅ limpio |
| **next build** | ✅ verde — `/panel/novedades` (○) + `/panel/novedades/[periodo]` (ƒ); 208/208 páginas |
| **Aislamiento** | ✅ cero imports de inmobiliaria; inmobiliaria sin cambios |
| **Fail-soft daños** | ✅ `!danos || !danos.available` → "Próximamente" solo para daños, sin romper el hub |
| **DS conformance** | ✅ 0 tokens legacy; `font-mono tabular-nums` en montos/porcentajes/contadores; `Badge` para estado de daños |
| **No data falsa** | ✅ flag-OFF → "Próximamente"; listas vacías con agencyId → estado legítimo |

## Endpoints (3/3 cableados)
`GET /danos` ✅ · `GET /digests` ✅ · `GET /digest/{periodo}` ✅.

## Milestone v8.0 — completo
5/5 fases: v8-01 Fundación · v8-02 Ver mi plata · v8-03 Elegir inquilino · v8-04 Solicitudes ·
v8-05 Daños+digest. + pasada de alineación al DS. Frontend-first, aditivo, main intacto, nada pusheado.
