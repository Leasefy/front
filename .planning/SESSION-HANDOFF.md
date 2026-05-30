# SESSION HANDOFF — v6.0 Backoffice Unificado ERP·CRM·Autopilot

**Fecha:** 2026-05-30 · **Para:** retomar tras `/clear` (sesión nueva sin historial).
**Estado:** v6.0 **COMPLETO (8/8 fases)** ✅. **mvp PUSHEADO → PR #14** (`feat/v6.0-01-...` → `Stg`, mega-PR mixto v6.0 + 37-xx): https://github.com/Leasefy/front/pull/14. **agent BLOQUEADO** (sin write access a `Leasefy/agent` para `nicolasgardila`): los 3 commits cross-repo (`0cd2dff`+`0d53f61` terceros, `e5f01f1` property-capture) están seguros LOCALES en `restructure/per-agent-organization` pero SIN pushear — requiere write access o push desde cuenta autorizada (Víctor). Próximo paso del programa = M1+ (motor backend).

> ⚠️ **Concurrencia (2026-05-30):** una sesión paralela del stream `agent` corrió **Phase 37-07** (cobranza analítica) en ESTE mismo working tree y, al hacer `git add`, **arrastró las ediciones de v6-06 en `layout.tsx` + `es.json`/`en.json` (nav-flip + namespaces i18n pqrs/agenda) dentro de sus commits `c774703`/`d546798`** — contenido correcto, pero el mensaje dice `37-07`. Las páginas/contratos de v6-06 + el flip de `/hoy` se commitearon aparte como `feat(v6-06)`. Evitar editar el mismo working tree desde dos sesiones a la vez.

> Este doc es el "léeme primero" para continuar. El estado estructurado está en `STATE.md`.

---

## 1. Qué es esto

Evolucionar el panel de la inmobiliaria (`rent/mvp` → `/panel/inmobiliaria`) en un **ERP + CRM + Autopilot todo-en-uno**. Es el milestone **v6.0 (frontend-first)**, arranque de un **programa de 6 milestones** multi-repo (`ERP-CRM-AUTOPILOT-PROGRAM.md`). La sesión empezó con `/gsd-new-project` (mal comando: el proyecto ya existía) → se redirigió a un milestone nuevo.

**Reparto de repos:** UI = `rent/mvp` · motor ERP = `rent/back-main` (scaffold hoy) · IA = `rent/agent` (**Mastra**) · ops internas = `rent/admin`.

## 2. Orden de lectura para retomar

1. `.planning/STATE.md` — estado estructurado (fase actual, decisiones, blockers).
2. `.planning/SESSION-HANDOFF.md` — este doc.
3. `.planning/ERP-CRM-AUTOPILOT-PROGRAM.md` — backbone del programa (6 milestones, riesgos).
4. `.planning/research/ERP-VISION/GAP-ANALYSIS.md` — gap analysis (16 dominios, 4 repos).
5. `.planning/milestones/v6.0-{REQUIREMENTS,ROADMAP}.md` — detalle del milestone.
6. **OBLIGATORIO antes de cualquier UI:** `docs/DESIGN.md`.

## 3. Fases v6.0 (numeración `v6-NN`)

| Fase | Sección / Entrega | Estado |
|---|---|---|
| **v6-01** | `/hoy` command center + sidebar agrupada (5 bloques) + secciones ERP "Pronto" | ✅ done |
| **v6-02** ⭐ | `/facturacion` — ventas/compras/electrónica-DIAN/notas + `facturacion.types.ts` | ✅ done |
| **v6-03** | `/conciliacion` — carga fuente + resumen 6-casos + movimientos + `conciliacion.types.ts` | ✅ done |
| **v6-04** | `/tesoreria` — fórmula neto completa (canon−comisión−IVA−descuentos) + `tesoreria.types.ts`, aditiva sobre `dispersiones` | ✅ done |
| **v6-05** | Insights & Alertas — `src/lib/insights/{types,engine}.ts` + `InsightsPanel` en `/hoy` | ✅ done |
| **v6-06** | PQRS / Solicitudes (`/pqrs`) + Agenda interna (`/agenda`) + contratos `pqrs/agenda.types.ts` + i18n (PQRS-01..03, AGEN-01..02) | ✅ done |
| **v6-07** | Creación de terceros por IA — foto cédula/RUT → IA → prellena (TERC-01..04) — CROSS-REPO (agent `POST /terceros/extract` + mvp captura aditiva en propietarios) | ✅ done |
| **v6-08** | Captura de propiedad foto+audio (`/propiedades/captura`) — Whisper+Claude en `agent` (CAPT-01..04, stretch) | ✅ done |

## 4. ⚠️ Numeración `v6-NN` (NO enteros) — CRÍTICO

El repo `agent` corre un milestone paralelo **`v2.1-frontend`** (Phases 29→37+) que **commitea código de frontend EN `mvp`** (`ai/cobranza`, `ai/cotizador`; mvp tiene commits `32-xx`…`36-xx`, agent Phase 37 es la siguiente). Por eso v6.0 usa namespace **`v6-01`…`v6-08`** — para no colisionar. **Commits de v6.0: `feat(v6-06): …`**.

## 5. Patrón para cada sección ERP nueva (aplicado en v6-02..04)

1. Crear `src/app/panel/inmobiliaria/<sección>/page.tsx` ('use client').
2. Crear contrato `src/lib/api/<sección>.types.ts` (el shape que el motor M1/M2 implementará).
3. Activar el nav en `src/app/panel/inmobiliaria/layout.tsx` (quitar `disabled`+`tag`, dejar `module: null`).
4. Flip el item en el mapa "Tu sistema" de `/hoy` (`src/app/panel/inmobiliaria/hoy/page.tsx`: quitar `soon: true`).
5. i18n: agregar keys a `src/lib/i18n/locales/{es,en}.json` (script python `setdefault`, NO reformatear).
6. Estados honestos: banner "motor → M1/M2", `EmptyState`, sin data falsa persistente.
7. Verificar: `npx tsc --noEmit` + screenshot vía dev server `:3001`.
8. Commit `feat(v6-NN): …` + `docs(v6-NN): …`; actualizar STATE.md + ROADMAP.md + memoria.

**Para v6-06 (PQRS+Agenda):** PQRS ya tiene algo en `operaciones`/mantenimiento (reusar/generalizar el patrón ARCO del `agent`); Agenda es net-new. Ambas están registradas como "Pronto" en el nav (activar). Componentes UI: ver `docs/DESIGN.md` (cards `rounded-2xl border bg-card`, `SectionLabel`, `EmptyState`, `Badge`, Phosphor icons, Button uppercase).

## 6. Restricciones duras

- **ADITIVO — no romper el CRM existente** (usuario enfático). Todo entra como rutas/módulos nuevos vía `canAccess(module,'view')`. No reescribir módulos existentes. (Ver memoria `feedback-additive-no-break-crm`.)
- **Agentes = Mastra** en `rent/agent` (toda capacidad IA nueva: terceros, audio→ficha, PQRS triage).
- **Git:** PR workflow — feature branch → PR → Víctor aprueba. **Commit solo cuando el usuario lo pida; nunca pushear sin confirmación.**

## 7. Estado git / entorno

- Rama: `feat/v6.0-01-ia-unificada-command-center` — **12 commits, sin pushear**. Forkeada de `Stg`.
- Working tree limpio (salvo este handoff al momento de escribir).
- Se arregló un **build break pre-existente** del cotizador (directivas eslint huérfanas) — commit `fix(lint)`.
- **Dev gotcha:** `.env`/`.env.local` apunta `NEXT_PUBLIC_BACKEND_URL` a prod (`api.leasefy.co`) → CORS bloquea localhost; las páginas permission-gated no cargan data en dev local. Las secciones v6.0 son permission-independent (module:null) → renderizan igual.
- **Dev server:** puede haber un `next dev` corriendo en `:3001` de esta sesión; si no, `pnpm dev`.
- `gsd-sdk` NO está instalado — los comandos GSD que dependan de él se corren a mano.

## 8. Blockers externos (programa, no v6.0 frontend)

- Decisión de equipo: ¿qué monolito es el motor ERP? (`back-main` es scaffold; mvp consume otro backend). Bloquea M1.
- DIAN: requiere proveedor tecnológico autorizado (M2).
- Credenciales: Vapi, 360dialog/Kapso, Wompi/Bold, DataCrédito, carriers Bolívar/Sekure.

## 9. Próximas acciones posibles

- Seguir con **v6-06** (PQRS + Agenda) — aplicar el patrón §5.
- Completar v6-07 (Terceros IA) + v6-08 (Captura audio) — requieren trabajo Mastra en `rent/agent`.
- **Push + abrir PR para Víctor** (13 commits) — acción hacia afuera, requiere confirmación del usuario.

---

## 10. TODO restante (checklist) — qué hacer después del `/clear`

**Frontend v6.0 (mismo patrón §5, en `rent/mvp`):**
- [x] **v6-06 PQRS + Agenda** — ✅ nav activado, secciones `/pqrs` + `/agenda` + contratos `pqrs/agenda.types.ts` + i18n es/en. PQRS = resumen por estado + tabla + reparación→cotización (link a operaciones); Agenda = resumen por tipo + tabla eventos/tareas. Estado vacío honesto, banner M1. tsc limpio, rutas 200, review 3/3 PASS.
- [x] **v6-07 Terceros por IA** — ✅ CROSS-REPO. agent (`0cd2dff` + `0d53f61` hardening): `POST /terceros/extract` (`extract-tercero.ts` Claude Vision base64/URL + ruta Hono JWT+role + 5 tests; review encontró+arregló 2 MEDIUM de seguridad: bodyLimit 12MB + rate-limit 20/min/usuario). mvp (`ddcc218`): botón "Crear con IA" en propietarios → foto cédula/RUT → fetch al agente con JWT del usuario → prellena `PropietarioForm` → guarda con el handler manual (intacto). Contratos `terceros-extract.{types,service}.ts` + i18n. E2E real requiere agente corriendo + JWT válido (no testeable en dev por gotcha auth/prod).
- [x] **v6-08 Captura propiedad foto+audio** (stretch) — ✅ CROSS-REPO. agent (`e5f01f1`): `POST /property-capture/extract` (`extract-property.ts` = Whisper transcribe + Claude ficha/descripción, fotos opcionales vía Vision; JWT+role+bodyLimit 24MB+rate-limit 10/min; 6 tests). mvp (`ee30376`): botón "Capturar con IA" → `/propiedades/captura` (`PropertyIACapture`: grabar audio MediaRecorder + fotos → extrae → form de revisión → `propertiesApi.create`). `/propiedades/nueva` intacto. **v6.0 COMPLETO 8/8.**

**Cableado backend diferido (cuando exista el motor — M1/M2, no es v6.0):**
- [ ] Conectar data real en `/facturacion` (DIAN/M2), `/conciliacion` (M1), `/tesoreria` (neto autoritativo/M1) — reemplazar empty states/contratos por hooks reales.
- [ ] Cablear el motor de insights a datos reales en `/hoy` — en `hoy/page.tsx` cambiar `deriveInsights({preview…})` por `deriveInsights(datosReales)` desde los hooks.
- [ ] Categorías de informes nuevas (FE, compras, Helisa, cert. tributario) cuando exista su data.

**Programa / equipo (no bloquea el frontend, sí los milestones M1–M6):**
- [ ] Decidir qué monolito es el motor ERP (`back-main` vs el backend actual de `NEXT_PUBLIC_BACKEND_URL`).
- [ ] Contratar proveedor DIAN autorizado (M2).
- [ ] Conseguir credenciales (Vapi, 360dialog/Kapso, Wompi/Bold, DataCrédito, carriers).

**Git / entrega:**
- [ ] Push de la rama + abrir PR para Víctor (cuando el usuario lo confirme; **nunca pushear sin OK**).
- [ ] (opcional) Verificar `next build` verde end-to-end antes del PR.
