# v8-02 · Ver mi plata (F3) — VERIFICATION

**Veredicto: GOAL ACHIEVED** ✅

Goal: reemplazar el shell de `/panel/portafolio` con la vista real "Mi plata" cableada a los 8
endpoints de finanzas del back, degradando honesto — aditivo, sin tocar inmobiliaria.

## Evidencia

| Gate | Resultado |
|------|-----------|
| **tsc --noEmit** | ✅ limpio |
| **next build** | ✅ verde — `/panel/portafolio` (○ static, 6.46 kB) + `/panel/portafolio/[propertyRef]` (ƒ dynamic, 3.92 kB); 207/207 páginas generadas |
| **Aislamiento — imports** | ✅ cero imports de `@/components/inmobiliaria` / `@/lib/inmobiliaria` en lo nuevo |
| **Aislamiento — inmobiliaria** | ✅ `git diff` vacío en `panel/inmobiliaria` + `components/inmobiliaria`; sus rutas `portafolio/*` siguen compilando |
| **No data falsa** | ✅ sin arrays mock; con back flag-OFF la página muestra "Próximamente" |
| **No aritmética de dinero** | ✅ montos leídos verbatim (`formatCurrency` solo para display); sin `* 12`, `reduce(+cop)`, etc. |
| **Doctrina anti-alarmista** | ✅ vencimientos/preavisos informativos, sin estilos `destructive`/countdown |

## Cobertura de endpoints (8/8 cableados)
`/portafolio` ✅ · `/inmuebles` ✅ · `/inmuebles/{ref}` ✅ · `/inmuebles/{ref}/pagos` ✅ ·
`/recaudo` ✅ (service listo, UI lo consume en olas de detalle) · `/recaudo/anual` ✅ ·
`/proyeccion` ✅ · `/informe.pdf` ✅ (descarga blob).

## Notas
- El back sigue flag-OFF → las 3 páginas renderizan el estado "Próximamente" hoy; la vista de datos
  está lista y type-safe para cuando Victor encienda el portal.
- Verificación por mano (gates arriba). `next build` requiere red para `next/font` (root layout, ajeno).

## Pendiente próximas olas
- v8-03 (Elegir inquilino / F2): comparación de postulados asegurables + elección WYSIWYS.
