# Sesión 2026-08-08 — Panel del inquilino: QA, PR #63, y el mapa de inmobiliaria

**Punto de retome. Leé esto primero.** Sucede al de 2026-08-07 (que sigue valiendo para el
detalle del vocabulario y del recorrido público). Todo en `~/rent/mvp-inmobiliaria`, `:3002`.

---

## 🟢 Estado: PR #63 abierto y verde

**https://github.com/Leasefy/front/pull/63** — `feat/experiencia-inmobiliaria` → `develop`

**38 commits · 105 archivos · +9577/−1693 · MERGEABLE · árbol limpio · todo pusheado.**
Espera aprobación de Víctor.

| Compuerta | |
|---|---|
| Typecheck & Unit Tests (CI) | ✅ pass |
| **Vercel** | ✅ pass — deployment completado |
| Playwright E2E | ⏭️ skipping (manual, nunca bloquea) |
| Local: 220 archivos / **1756 tests** · `tsc` · `lint` · **`pnpm build`** | ✅ |

⚠️ El CI **no corre `next build`**. Se verificó a mano antes de pushear — es el hueco que ya dejó
un branch inmergeable sin que nadie lo notara ([[project-mvp-ci-build-gap]]).
⚠️ Correr `pnpm build` **mata los chunks del `next dev`**: parar el dev antes, levantarlo después.

---

## Lo que hizo esta sesión

### El QA: lo que estaba en `develop` y llegaba al usuario

**Cuatro operaciones que afirmaban éxito sin hacer nada** en `/inquilino/configuracion`. Esperaban
un `setTimeout` y respondían "listo": cambiar contraseña, cerrar otras sesiones, descargar mis
datos (Ley 1581) y guardar preferencias. **Las cuatro implementaciones reales ya estaban escritas
en el repo** — nunca se cablearon. Ver [[reference-operaciones-que-fingen-exito]].

**Urgencia fabricada** en el panel pegado al botón de postularse: "7 personas viendo ahora" con un
contador que se movía solo cada 10 s. Salía de sumar los códigos de las letras del `propertyId`.

**Un mock que producción podía servir**: faltando `NEXT_PUBLIC_AGENT_URL`, `fetchAprobacion`
devolvía una aprobación de $2.400.000 **sin marca de demo**. Ahora `NODE_ENV === 'production'` lo
corta, con tests.

**Badges escritos a mano** en los 3 sidebars · **un botón muerto** ("Evaluar mi perfil" solo
escribía en consola) · **dos imágenes** que el código pedía y no existían.

### Lo que se construyó encima

- **La aprobación abre el home**, en sus 4 estados (antes el home no la mencionaba)
- **CTA de opinión (Tally)** en los 3 portales — se carga al clic, con salida si el script no carga
- **El home ya no promete propiedades que su catálogo no tiene**: aplica el mismo filtro por tope
- Pasada de consistencia por las 14 pantallas: `h1` faltante, 3 estilos de vacío, títulos en Title
  Case, andamiaje sobre vacíos, concordancia ("1 consultadas · 1 te aprobaron")

### La lección que se repitió toda la sesión

**Casi todos los defectos salieron usándolo, no leyéndolo, con los tests en verde.**
Ver [[reference-demo-inquilino-3002]] para entrar sin esperar correos.

---

## 🔴 Lo que falta y NO es del front

Dos documentos en la raíz del repo:
- **`HANDOFF-VICTOR-PANEL-INQUILINO.md`** — el panel, con sesión. Auditoría de red de las 14
  pantallas: 15 lecturas en 200, 8 escrituras probadas una por una.
- **`HANDOFF-VICTOR-RECORRIDO-INQUILINO.md`** — el recorrido público, antes de tener cuenta.

**Los cuatro bloqueos:**

| # | Qué | Impacto |
|---|---|---|
| 1 | `GET /notifications` → **500** (Prisma) | En las 14 pantallas |
| 2 | `GET /api/tenant/aprobacion` → **404** | El tope no sobrevive al cambio de navegador |
| 3 | El **funnel sin pushear** (11 ramas locales) | Nadie puede sacar una aprobación |
| 4 | `GET /evaluations/mine` → **404** | La tarjeta "Tu score" no puede mostrar nada |

Más: PSE da 503, y dos decisiones de Supabase (Redirect URLs sin `localhost:3002`, confirmación
de correo).

---

## ▶️ SIGUIENTE: experiencia de inmobiliaria (pasos 7→11)

**Mapa levantado el 2026-08-08 mirando el código, no el plan.** Esto es lo que existe de verdad:

| # | Paso | Estado | Dónde |
|---|---|---|---|
| 1 | Entra al catálogo | ✅ | `/propiedades`, `/inquilino/explorar` |
| 2 | Estudio de asegurabilidad | ✅ | `/aprobacion` |
| 3 | **Paga el estudio** | 🔴 **no hay pantalla** | Solo `src/app/api/estudio/wompi-session/route.ts`, que exige un `solicitudId` que el back no da |
| 4 | Evaluación multi-aseguradora | ✅ | `funnel.service.ts` |
| 5 | Catálogo filtrado por monto | ✅ | `/inquilino/para-ti` |
| 6 | Se postula a varias | ✅ | `PostularButton` |
| 7 | **Alerta a la inmobiliaria** | 🔴 **no existe UI** | `funnel-applications.service.ts` está escrito, con tipos y tests, y **ninguna pantalla lo consume** |
| 8 | Estudio del inquilino (A/B/C/D) | 🟡 existe, desconectado | `/ai/estudio/*` + `CandidateDrawer` (lee `/evaluations/:id/result`, real) |
| 9 | Comparar candidatos | 🟡 tabla + ficha de a uno | `/propiedades/[id]/candidatos` — **no hay comparación lado a lado** |
| 10 | Aceptar candidato | 🟡 se acepta | **los demás quedan sin estado** — rompe la promesa "si no te eligieron te lo decimos" |
| 11 | Preparar contrato | 🔴 | `/contratos/nuevo` **no menciona aseguradora ni su ID** en ningún lado |

**Ojo:** `/postulaciones` usa `landlordApplicationsApi.getAllCandidates` (postulaciones a
propiedades), **no** el funnel. Y `/ai/asegurabilidad/cola` es la cola del agente cotizador
—flujo iniciado por la agencia— que es otra cosa distinta del funnel iniciado por el inquilino.

**"Pre-aprobar" sigue vivo** en las acciones de candidatos: está muerto según
`docs/VOCABULARIO.md`.

### Dos decisiones antes de arrancar

1. **Las ~12 operaciones simuladas del panel de inmobiliaria** (reportes, propietarios,
   facturación, cobros, dispersiones) — mismo defecto que las del inquilino. Recomendación:
   **PR aparte**, mezclarlo hace la revisión imposible.
2. **Nada llega a producción sin Víctor**: el paso 7 no tiene de dónde leer sin el funnel
   pusheado, y el 3 necesita el `solicitudId`.

El plan de 11 pasos con su detalle de UX está en `.planning/PLAN-EXPERIENCIA-ESTUDIOS.md` §4.
