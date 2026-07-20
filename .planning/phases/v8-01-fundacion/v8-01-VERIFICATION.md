# v8-01 · Fundación — VERIFICATION

**Veredicto: GOAL ACHIEVED** ✅

Goal de la fase: establecer la fundación del Portal del Propietario (capa de servicio/tipos cableada
a `/api/portal/{agencyId}/propietario/*`, navegación de los 4 pilares, shells honestos) — aditivo,
sin tocar inmobiliaria ni captación.

## Evidencia

| Gate | Resultado |
|------|-----------|
| **tsc --noEmit** | ✅ limpio (0 errores) |
| **next build** | ✅ verde — las 4 rutas nuevas prerenderizadas estáticas: `/panel/portafolio` (2.15 kB), `/panel/seleccion` (2.92 kB), `/panel/solicitudes` (2.45 kB), `/panel/novedades` (1.46 kB) |
| **Aislamiento — imports** | ✅ cero imports desde `@/components/inmobiliaria` o `@/lib/inmobiliaria` en lo nuevo |
| **Aislamiento — inmobiliaria/layout** | ✅ `git diff` vacío (intacto) |
| **No data falsa** | ✅ sin arrays mock/hardcodeados de pagos/candidatos en las rutas de propietario |
| **Degrade honesto** | ✅ el servicio devuelve `null` en 401/403/404 (flag-OFF) → UI "Próximamente" |
| **Regla de completitud** | ✅ shells = empty-states completos, sin TODO/stub |

## Cómo se probó
- `./node_modules/.bin/tsc --noEmit` → sin salida (limpio).
- `pnpm build` → tabla de rutas completa + legend (éxito); las rutas de inmobiliaria compilan sin cambios.
- Greps de aislamiento y de data falsa (ver v8-01-SUMMARY + comandos en el commit).

## Notas
- El `next build` requiere red para `next/font` (Google Fonts) en el root layout — no relacionado con
  esta fase. Se corrió con red habilitada; en el sandbox offline fallaría igual en cualquier rama.
- Verificación por mano (los gates arriba), consistente con cómo se cerró v7 (gsd-verifier no confiable).

## Pendiente para próximas olas
- v8-02 (Mi plata): consumir `useOwnerPerfil` + servicios de finanzas; reemplazar el shell de
  `/panel/portafolio`.
