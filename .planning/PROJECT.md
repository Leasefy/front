# Leasefy — Plataforma AI-Agent de Administración de Arriendos

## What This Is

Una plataforma de administración de arriendos para el mercado colombiano donde propietarios e inmobiliarias hablan con un orquestador AI que despacha agentes especializados para cobrar arriendos, evaluar candidatos, coordinar mantenimiento, generar documentos y gestionar propiedades — todo a través de conversación natural. El dashboard web existe como vista de lo que los agentes hicieron, no como herramienta principal.

## Core Value

**El usuario habla, los agentes ejecutan. La plataforma opera como un equipo autónomo de administración de arriendos.**

Si todo lo demás falla, el flujo conversacional Usuario → Orquestador → Agentes → Resultado debe funcionar con autonomía inteligente y escalamiento a humano cuando se requiera una decisión.

## Current Milestone: v7.0 — Portal del Inquilino (Frontend-First)

**Problema (P1):** después de firmar, el inquilino **solo tiene a quién escribir si hay un problema**. El producto está construido para **cerrar** (funnel de adquisición), no para **operar la relación** → mora, quejas, menor renovación, mala reputación. Canal actual: WhatsApp + llamadas.

**Goal:** Darle al inquilino un portal donde **opere su arriendo** (pagar, pedir, ver, seguir, acordar, comunicar), no solo un canal de queja. El portal `/inquilino` **ya existe** (~55-60% cableado a datos reales, con firma electrónica OTP), pero es un funnel de adquisición **sin capa de operación post-firma**. v7.0 **suma** esa capa + **sube parcial→real** 3 pilares + **limpia** superficies fake.

**Principio clave:** El diferencial no es "un portal más", es que el inquilino **opere la relación**. Frontend-first: UI + contrato de api-client + empty-states honestos ahora; la data real (Wompi productivo, rutas/RLS tenant en `agent`, endpoints lease-scoped NestJS) se cablea detrás — igual que v6.0.

**⛔ Restricción dura:** ADITIVO — no romper el portal `/inquilino` existente ni el CRM. Reusar contratos (`pqrs.types.ts`, `tenant-payment-requests.types.ts`, `SignatureForm`, patrón Wompi de avalúos), NO forkear. Leer `docs/DESIGN.md` antes de cualquier UI.

**Target features (6 pilares + limpieza — namespace de fases `v7-NN`):**
- [ ] **Pagos** — subir de PSE-mock a Wompi/Bold real, comprobantes PDF, autopago
- [ ] **Solicitudes / PQRS** — abrir/seguir tickets con fotos (reusa `pqrs.types.ts`, SLA 15 días)
- [ ] **Documentos** — docs del arriendo (contrato, paz y salvo, recibos, póliza, cert. retención), Habeas Data
- [ ] **Estado de casos** — "mis casos" (PQRS + mantenimiento + acuerdos + responsable) — hub que fija P1
- [ ] **Acuerdos de pago** — ver/aceptar/pagar acuerdo aprobado por agencia (nunca auto-aprueba, T-323)
- [ ] **Comunicación** — chat atado al arriendo/caso (hoy scoped a la aplicación); WhatsApp como canal
- [ ] **Limpieza** — dashboard con estado real, perfil real (quitar datos chilenos mock), config, dead code

**Guardrails legales (NO negociables):** Ley 2300/2023 (frecuencia de contacto, no preguntar "por qué" la mora), T-323/2024 + SIC 001/2025 (acuerdos no auto-aprueban), Habeas Data 1581/2012 (docs), SLA PQRS 15 días (Ley 1480/2011), saldo desde única fuente de verdad.

**Gap analysis + research:** `.planning/research/portal-inquilino/GAP-ANALYSIS.md` (+ `AUDIT-A/B`, `FEATURES`, `PITFALLS`, `ARCHITECTURE`, `STACK`) · **Detalle:** `REQUIREMENTS.md` + `ROADMAP.md`
**Arquitectura de referencia:** `docs/AI-AGENT-ARCHITECTURE.md` · **Post-firma:** `POST_APPROVAL_STRATEGY.md`

> **v6.0** (Backoffice Unificado ERP·CRM·Autopilot) quedó **COMPLETO** (8/8, frontend-first; motores DIAN/conciliación/ledger → programa M1–M3). **v5.0** (Agency Plan-Gated) quedó **pausado** 2026-05-12.

## Requirements

### Validated

<!-- v1.0 MVP Frontend — shipped and functional -->
- ✓ Catálogo de inmuebles con cards y filtros — v1.0
- ✓ Detalle inmueble con galería y CTA — v1.0
- ✓ Wizard de postulación 6 pasos con autosave — v1.0
- ✓ Risk Score AI display con explicación conversacional — v1.0
- ✓ Dashboard propietario con gestión de candidatos — v1.0
- ✓ Tracking de solicitudes para arrendatario — v1.0
- ✓ Generación y firma de contratos — v1.0
- ✓ Pricing, suscripciones y cupones — v1.0
- ✓ Dashboards post-contrato con pagos — v1.0
- ✓ Auth UI con rutas protegidas — v1.0
- ✓ Mapa interactivo estilo Airbnb — v1.0
- ✓ Wizard de publicación 9 pasos — v1.0

### Active

#### v7.0 — Portal del Inquilino (current, frontend-first)

Lista completa de REQ-IDs en `.planning/REQUIREMENTS.md`. Categorías (por pilar):
- **PAGO** — pagos: PSE-mock → Wompi/Bold real, comprobantes, autopago
- **SOLI** — solicitudes/PQRS del inquilino (reusa `pqrs.types.ts`, SLA 15 días)
- **DOCU** — documentos del arriendo (contrato, paz y salvo, recibos, póliza, cert. retención)
- **CASO** — estado de casos ("mis casos" unificado) — hub que fija P1
- **ACUE** — acuerdos de pago (ver/aceptar/pagar; nunca auto-aprueba, T-323)
- **COMU** — comunicación atada al arriendo/caso (hoy scoped a la aplicación)
- **BASE** — limpieza: dashboard real, perfil real, config, dead code

Aditivo, sin romper el portal `/inquilino` ni el CRM. Data real (Wompi productivo, RLS tenant en `agent`, endpoints lease-scoped) → detrás, frontend-first.

#### v6.0 — Backoffice Unificado ERP·CRM·Autopilot (shipped, frontend-first)

Lista completa de REQ-IDs en `milestones/v6.0-REQUIREMENTS.md`. Categorías:
- **UNIF** — IA unificada & command center (nav agrupada + landing Operación)
- **FACT** ⭐ — facturación venta/compra, FE-DIAN, notas débito/crédito, recurrente
- **CONC** — conciliación bancaria (cargar fuente, matches, cola de revisión)
- **EGR** — egresos a propietarios / tesorería (neto + comprobante)
- **INFO** — informes & insights (catálogo + "de informes a insights")
- **PQRS / AGEN** — PQRS/solicitudes + agenda interna
- **TERC** — creación de terceros por IA (foto/audio)
- **CAPT** — captura de propiedad foto+audio (stretch)

Aditivo, sin romper CRM existente. Motores backend (DIAN, conciliación real, posteo contable) → milestones M1–M3 del programa.

#### v4.0 — AI Agent Platform Beta (shipped)

**Chat UI & Orquestador:**
- [ ] Sección "Beta" en sidebar de propietarios e inmobiliarias
- [ ] Chat UI con streaming de respuestas del orquestador
- [ ] Orquestador AI con Claude API + tool use (loop de agentes)
- [ ] Context loading: inyectar datos del usuario en system prompt
- [ ] Historial de conversaciones persistente
- [ ] Sistema de decisiones pendientes (opciones A/B/C con recomendación)
- [ ] Indicadores visuales de agentes ejecutándose

**Agentes Especializados:**
- [ ] Agente de consulta de datos (propiedades, inquilinos, pagos, contratos)
- [ ] Agente de documentos (generar cartas, certificados, contratos, paz y salvos)
- [ ] Agente de cobranza (recordatorios, verificar comprobantes OCR, estado de cobros)
- [ ] Agente de pipeline (scoring de candidatos, mover por etapas, agendar visitas)
- [ ] Agente de mantenimiento (crear tickets, asignar proveedores, tracking)
- [ ] Agente de comunicación (enviar mensajes por canal apropiado)

**Memoria & Aprendizaje:**
- [ ] Memoria de corto plazo (conversaciones activas)
- [ ] Memoria de mediano plazo (resúmenes de decisiones, preferencias)
- [ ] Preferencias aprendidas del usuario (umbrales, políticas, tonos)
- [ ] Patrones de inquilinos (timing de pagos, canal preferido)

**Proactividad:**
- [ ] Briefing diario/semanal automático
- [ ] Detección de anomalías (mora creciente, propiedad vacía mucho tiempo)
- [ ] Sugerencias proactivas (renovaciones, ajuste de precios, mantenimiento preventivo)

**Integración WhatsApp:**
- [ ] Gateway de mensajes (normalizar WhatsApp → orquestador)
- [ ] Inquilinos envían comprobantes de pago por WhatsApp
- [ ] Recordatorios automáticos por WhatsApp
- [ ] Respuestas 24/7 a consultas de inquilinos

### Previously Active (v1.0-v3.0)

- ✓ Catálogo de inmuebles con búsqueda AI — v1.0
- ✓ Risk Score AI con explicación conversacional — v1.0
- ✓ Dashboard propietario + inquilino — v1.0
- ✓ Contratos, pricing, mapas, auth — v1.0
- ✓ Design system, QA, dark mode, i18n — v2.0
- ✓ Módulo inmobiliaria completo (10 fases) — v3.0
- ✓ SEO, OG images, JSON-LD — v3.1
- ✓ Pricing page rediseñada — v3.1

### Out of Scope (v4.0)

- **Reemplazar dashboards existentes** — Beta vive en sección separada, dashboards siguen funcionando
- **ML real para scoring** — Reglas cuantitativas por ahora, datos se guardan para futuro ML
- **Llamadas AI (Bland.ai)** — Fase 4 del roadmap, no beta
- **Negociación automática de renovaciones** — Requiere confianza validada del sistema
- **Multi-país** — Solo Colombia (COP, ciudades colombianas)
- **White-label para inmobiliarias** — Post-validación
- **Pagos reales (PSE/Nequi)** — Backend independiente, frontend muestra mock

## Context

### Mercado
- **País**: Colombia
- **Moneda**: COP (pesos colombianos)
- **Usuarios**: Propietarios (1-5 propiedades), inmobiliarias (20-300+ propiedades), arrendatarios

### Dolor Real
- **Propietarios**: Administrar arriendos es un trabajo de tiempo completo — cobrar, mantener, renovar, buscar inquilinos
- **Inmobiliarias**: Operación manual que escala linealmente con humanos — más propiedades = más gente
- **Arrendatarios**: Proceso opaco, comunicación lenta, reportes ignorados

### Diferenciador Competitivo
- **Competencia (Metrocuadrado, Fincaraiz, inmobiliarias)**: "Excel con UI bonita"
- **Leasefy**: "Tu equipo de administración de arriendos. Hablas, ellos ejecutan."
- **Moat real**: Grafo de agentes coordinados + memoria compartida + personalización aprendida + loop de feedback

### Filosofía AI
- **Conversación > Dashboard**: El chat es la interfaz principal, el dashboard es la vista de lo que hicieron los agentes
- **Autonomía con escalamiento**: Los agentes ejecutan dentro de reglas, escalan a humano para decisiones
- **Aprendizaje continuo**: Cada interacción mejora las preferencias y patrones

## Constraints

- **Frontend Stack**: Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **AI Stack**: Claude API (Anthropic) con tool use para orquestador
- **Backend**: FastAPI o NestJS (desarrollador backend independiente)
- **DB**: PostgreSQL + pgvector (embeddings para memoria)
- **Cache/Queue**: Redis (conversaciones, jobs)
- **Comunicación**: Twilio (WhatsApp/SMS), SendGrid (email)
- **OCR**: Claude Vision (comprobantes de pago, documentos)
- **Deploy**: Vercel (frontend), separado para backend
- **Arquitectura ref**: `docs/AI-AGENT-ARCHITECTURE.md`

## Data Model (Entidades Core)

### User
```
id, name, email, phone, createdAt
```

### Property
```
id, ownerId, title, description, city, neighborhood, priceMonthly, areaM2,
bedrooms, bathrooms, furnished, petFriendly, parking, availableFrom, createdAt
```

### PropertyImage
```
id, propertyId, url, order
```

### SavedProperty (wishlist)
```
userId, propertyId, createdAt
```

### Application
```
id, propertyId, applicantId, status, createdAt, submittedAt,
snapshotRentPrice, applicantProfileId
```

### ApplicantProfile
```
Identidad, ingresos, estabilidad, historial, consentimientos
```

### ApplicationDocument
```
id, applicationId, type, filename, url, uploadedAt
```

### DerivedFeatures / ApplicationFeatures
```
applicationId, featuresJson, extractedAt
```

### RiskScoreResult
```
applicationId, totalScore, level, recommendation,
subscoresJson, driversJson, flagsJson, conditionsJson
```

### ApplicationEvent (timeline)
```
applicationId, actorId, type, message, createdAt
```

### ApplicationMessage (request info)
```
applicationId, senderId, type, body, attachmentsJson, createdAt
```

### HostNote (nota interna)
```
applicationId, hostId, note, createdAt
```

## Risk Score Algorithm v1

### Pesos (Total: 100)
| Categoría | Peso |
|-----------|------|
| Integridad/Antifraude | 25 |
| Capacidad de pago | 35 |
| Estabilidad | 25 |
| Historial arriendo | 15 |

### Niveles
| Nivel | Rango | Recomendación |
|-------|-------|---------------|
| A | 90-100 | Recomendado |
| B | 75-89 | Recomendado |
| C | 60-74 | Condicional (con condiciones) |
| D | <60 | No recomendado |

### Flags de Riesgo
- HIGH_RENT_TO_INCOME
- LOW_TENURE
- LATE_PAYMENTS
- MISSING_DOCS
- INCOME_MISMATCH
- FRAUD_SUSPECTED

### Condiciones Sugeridas
- Codeudor
- Depósito adicional
- Póliza
- Soportes adicionales

## Seed Data (Demo)

- 12 inmuebles con fotos placeholder premium
- 2 hosts
- 4 applicants
- 10 aplicaciones con variaciones A/B/C/D
- RiskScoreResult precalculado
- OTP bypass en dev

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Solo Colombia para MVP | Foco en un mercado, validar antes de expandir | ✓ Good |
| Scoring híbrido sin ML | No hay datos históricos, reglas cuantitativas son verificables | ✓ Good |
| shadcn/ui + Tailwind | Componentes accesibles, fácil customización, consistencia | ✓ Good |
| Vercel deploy (frontend) | Zero-config, preview deploys, edge functions | ✓ Good |
| Claude API como orquestador | Tool use nativo, contexto largo, razonamiento superior | — Pending |
| Beta en sección separada del sidebar | No rompe dashboards existentes, permite iteración rápida | — Pending |
| Agentes como funciones (no LLMs separados) | Los agentes son tools del orquestador, no instancias de Claude independientes | — Pending |
| pgvector para memoria largo plazo | Embeddings en PostgreSQL, evita servicio externo adicional | — Pending |
| WhatsApp via Twilio | Canal dominante en Colombia, API madura | — Pending |
| Conversación > Dashboard | El chat es la interfaz principal, dashboard es vista pasiva | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-16 after milestone v7.0 initialization (Portal del Inquilino, frontend-first). v6.0 marcado COMPLETO.*
