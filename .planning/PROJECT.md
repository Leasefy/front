# Leasefy — Plataforma AI-Agent de Administración de Arriendos

## What This Is

Una plataforma de administración de arriendos para el mercado colombiano donde propietarios e inmobiliarias hablan con un orquestador AI que despacha agentes especializados para cobrar arriendos, evaluar candidatos, coordinar mantenimiento, generar documentos y gestionar propiedades — todo a través de conversación natural. El dashboard web existe como vista de lo que los agentes hicieron, no como herramienta principal.

## Core Value

**El usuario habla, los agentes ejecutan. La plataforma opera como un equipo autónomo de administración de arriendos.**

Si todo lo demás falla, el flujo conversacional Usuario → Orquestador → Agentes → Resultado debe funcionar con autonomía inteligente y escalamiento a humano cuando se requiera una decisión.

## Current Milestone: v4.0 — AI Agent Platform Beta

**Goal:** Agregar una interfaz conversacional AI ("Beta") a los dashboards existentes donde el usuario habla con un orquestador que despacha agentes especializados para gestionar propiedades, cobrar arriendos, evaluar candidatos y coordinar mantenimiento.

**Principio clave:** No romper nada existente. Los dashboards de propietarios e inmobiliarias siguen funcionando igual. La experiencia AI vive en una nueva sección "Beta" del sidebar, y eventualmente puede reemplazar el resto de la plataforma.

**Target features:**
- [ ] Chat UI en sección "Beta" del sidebar (propietarios + inmobiliarias)
- [ ] Orquestador AI usando Claude API con tool use
- [ ] Agente de consulta de datos (propiedades, inquilinos, pagos, contratos)
- [ ] Agente de documentos (generar cartas, certificados, contratos)
- [ ] Agente de cobranza (recordatorios, verificar comprobantes, estado cobros)
- [ ] Agente de pipeline (scoring candidatos, mover por etapas)
- [ ] Sistema de memoria (conversaciones + preferencias aprendidas)
- [ ] Sistema de decisiones pendientes (AI presenta opciones, usuario decide)
- [ ] Briefing proactivo (resumen diario/semanal automático)
- [ ] Integración WhatsApp via Twilio (inquilinos envían comprobantes, reciben recordatorios)

**Arquitectura de referencia:** `docs/AI-AGENT-ARCHITECTURE.md`

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

#### v4.0 — AI Agent Platform Beta

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

---
*Last updated: 2026-02-10 after milestone v4.0 initialization*
