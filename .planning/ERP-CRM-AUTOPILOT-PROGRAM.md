# PROGRAM — Backoffice Unificado: ERP · CRM · Autopilot para Inmobiliarias

**Created:** 2026-05-29
**Status:** Strategic backbone (program-level, multi-repo, multi-milestone)
**Companion:** `.planning/research/ERP-VISION/GAP-ANALYSIS.md` (evidence + per-repo maps)

---

## 1. The Thesis

No es "otro ERP". El diferencial — en palabras del propio equipo — es la respuesta a:

> *"¿Qué hace esto que una inmobiliaria no pueda hacer en un Excel?"*

La respuesta no son más módulos. Es que **el sistema opera la inmobiliaria**:
sabe quién no pagó el segundo en que vence la obligación, crea un tercero desde una
foto, arma la ficha de un inmueble desde un audio, concilia el archivo del banco y
prepara los egresos a propietarios. **ERP (datos) + CRM (comercial) + Autopilot (IA que
mueve la operación), todo en uno.**

> *"El ERP tradicional obliga a la inmobiliaria a operar el sistema. Leasefy debería
> hacer que el sistema opere para la inmobiliaria."*

## 2. Repo Ownership (decidido)

| Capa | Repo | Rol |
|------|------|-----|
| **UI agencia** | `rent/mvp` (este repo) | Cockpit unificado — `panel/inmobiliaria`. Todo lo que ve la inmobiliaria. |
| **Motor ERP** | `rent/back-main` *(o sucesor — ver Riesgo #4)* | Modelo de datos contable/financiero + lógica (terceros, facturación, conciliación, egreso neto, posteo contable, exports). |
| **Ejecución IA** | `rent/agent` | Autopilot: agentes, extracción documental/Vision, conversación, notificaciones, triage. **Framework: Mastra** — toda capacidad de IA nueva (extracción de terceros, audio→ficha, triage PQRS, advisor) se construye como **agente/tool de Mastra** en este repo, no ad-hoc. |
| **Supervisión interna** | `rent/admin` | Consola ops Leasefy-interna (RLS-bypass, ADMIN_EMAILS). **Nunca** herramienta de la inmobiliaria. |

## 3. Estado actual (16 dominios de la visión)

- ✅ **Mostly-done (4):** D3 Cobranza · D5 Contratos+firma · D7 CRM/Propiedades · D16 Seguros/cotizador
- 🟡 **Partial (6):** D4 Egresos · D6 Documental · D9 PQRS · D11 Informes · D13 Notificaciones · D14 Conversación
- 🟠 **Mostly-missing (3):** D1 Conciliación bancaria · D10 Terceros auto · D15 Portal prop/inquilino
- 🔴 **Net-new (3):** D2 Facturación/DIAN · D8 Captura móvil+audio · D12 Agenda

**Lectura:** El pilar CRM + Cobranza + Seguros ya es real y profundo. El hueco grande es
la **espina dorsal contable del ERP** (D1/D2/D4/D11) y la **capa de automatización IA**
sobre el CRUD existente.

## 4. Programa — 6 milestones (orden por dependencias)

> Cada milestone es multi-repo. La columna marca el reparto **mvp / back-main / agent**.

| M | Nombre | Dominios | Reparto | Depende de |
|---|--------|----------|---------|------------|
| **M1** | ERP Financial Spine | D10 (modelo), D1, D4 | back-main (motor) · mvp (UI) | decidir motor ERP |
| **M2** | Facturación + DIAN | D2 | back-main (motor+proveedor DIAN) · mvp (UI) · agent (cron) | M1 |
| **M3** | Contratos auto + Doc IA + Reportes fiscales | D5(gaps), D6, D11 | back-main (reportes/Helisa) · mvp (UI) · agent (doc Vision) | M1, M2 |
| **M4** | Automatización: terceros auto + PQRS + captura móvil/audio | D10(glue), D9, D8 | agent (extracción/triage) · mvp (UI) · back-main (persistencia) | M1 |
| **M5** | Advisor conversacional + Agenda + Notificaciones ERP | D14, D12, D13 | agent (advisor+triggers) · mvp (chat+agenda) · back-main (modelo agenda) | M1–M3 |
| **M6** | Portal propietario/inquilino + Afianzadora go-live | D15, D16(live), D7(publicación) | mvp (portal) · agent (carriers) · back-main (agregación) | M1–M5 |

**Cadena:** M1 → M2 → M3 → (M4, M5 en paralelo) → M6 (capstone).

## 5. Punto de arranque — v6.0 (Frontend-First)

**Decisión (2026-05-29):** arrancamos con un milestone **frontend-first, aditivo**, que
entrega valor visible **sin** depender de la decisión del motor ERP ni de DIAN. Toma
piezas de M4 (D10) + M3 (D11→insights) + la unificación de IA que el usuario pidió
("todo en uno"). Detalle en `ROADMAP.md` una vez aprobado.

**Por qué frontend-first primero:** el motor ERP (M1) está bloqueado en una decisión de
arquitectura (Riesgo #4) que es del equipo. Mientras eso se resuelve, el frontend puede
shippear los momentos "el sistema opera por ti" más demostrables (insights proactivos +
captura por IA) sobre los datos y agentes que YA existen.

## 6. ⛔ Restricción dura — ADITIVO, no romper el CRM

El usuario fue enfático: **"no me vayas a dañar lo que ya hay... ya hay mucho del CRM."**
Todo el trabajo en `mvp` es **aditivo y no-destructivo**:
- Módulos ERP nuevos = nuevas rutas/tabs vía el sistema de permisos (`canAccess(module,'view')`).
- La "unificación" es una capa de IA/navegación **encima**, no un rewrite de los módulos.
- Antes de tocar un componente existente, confirmar que es seguro; preferir archivos nuevos.
- Leer `docs/DESIGN.md` antes de cualquier cambio de UI.

## 7. Riesgos / bloqueos externos más duros

1. **DIAN facturación electrónica (D2)** — riesgo regulatorio máximo. CUFE, validación
   en tiempo real, IVA, NC/ND. Requiere **proveedor tecnológico autorizado**, no integración
   propia. Es responsabilidad fiscal, no UX.
2. **Conciliación bancaria (D1)** — sin API estándar en bancos colombianos → ingesta de
   archivos planos + motor de matching difuso. Alto costo de falso positivo (plata mal
   posteada). Exige cola de revisión humana; no auto-postear sin gates de confianza.
3. **Posteo contable + export Helisa + certificado tributario** — dominio contable fino;
   requiere experiencia contable real, no solo ingeniería.
4. **El motor ERP no existe aún** — `back-main` es un scaffold (Phase 2/10, modelo User
   único). Y el backend que `mvp` consume hoy (`NEXT_PUBLIC_BACKEND_URL`) **no es** `back-main`.
   **Decisión pendiente del equipo:** ¿qué monolito es el motor ERP? Bloquea M1.
5. **Gates de credenciales** — Vapi, 360dialog/Kapso, Wompi/Bold, DataCrédito/TransUnion,
   carriers Bolívar/Sekure (Phase 27 pausada). Varios milestones se *construyen* pero no
   *salen en vivo* hasta que lleguen credenciales/contratos. Trackear como bloqueos externos.
6. **Correctitud multi-tenant** — `agent` (RLS), `back-main` (RLS) y `mvp` (JWT) deben
   coincidir en límites de tenant a medida que se expande la data financiera del ERP.
7. **Propiedad del schema** — pagos/payouts ya viven en `agent.*`. El motor ERP debe
   consumir/extender ese schema sin crear dos fuentes de verdad (overlap D3/D4).

---
*Backbone para discusión de modelo de negocio + costos (reunión de equipo). Ejecución por milestone vía `/gsd-new-milestone` + `/gsd:plan-phase`.*
