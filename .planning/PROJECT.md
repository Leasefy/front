# Arriendo Fácil - Marketplace de Arriendos con Risk Score AI

## What This Is

Una plataforma de arriendos sin intermediarios para el mercado colombiano que permite a propietarios publicar inmuebles y a arrendatarios postularse en minutos, mientras un Risk Score AI entrega al propietario una calificación explicable, confiable y accionable del candidato (A/B/C/D + recomendaciones + condiciones sugeridas).

## Core Value

**Propietarios toman decisiones informadas sobre inquilinos en minutos, no días, con explicabilidad total del scoring AI.**

Si todo lo demás falla, el flujo completo Catálogo → Postulación → Risk Score → Decisión debe funcionar con transparencia absoluta en la evaluación.

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

## Current Milestone: v2.0 Design System & QA Audit

**Goal:** Establecer un sistema de diseño formal con tokens y componentes base rediseñados, y ejecutar una auditoría QA exhaustiva del frontend para encontrar y corregir todos los problemas de UX.

**Target features:**

#### Design System
- [ ] Design tokens formales: colores, tipografía, spacing, radios, sombras como variables CSS documentadas
- [ ] Guía de estilos documentada con ejemplos de uso
- [ ] Componentes base rediseñados: Button, Input, Card, Badge, Select, Dialog, Sheet, Skeleton
- [ ] Consistencia visual aplicada en todas las páginas existentes

#### QA Audit Frontend
- [ ] Auditoría página por página: CTAs desconectados, secciones sin acciones, links rotos
- [ ] Flujos incompletos: botones que no llevan a ningún lado, estados sin salida
- [ ] Inconsistencias visuales: spacing, colores, tipografía fuera del sistema
- [ ] Empty states y error states verificados en cada vista
- [ ] Responsividad verificada en cada página (mobile/tablet/desktop)
- [ ] Accesibilidad verificada (contraste, touch targets, keyboard nav)

### Previously Active (v1.0)

#### Flujo End-to-End
- [ ] Catálogo de inmuebles con cards premium (Airbnb-level)
- [ ] Filtros: ciudad, barrio, precio, habitaciones, pet friendly, amoblado, parqueadero
- [ ] Wishlist (Guardados) sin necesidad de cuenta
- [ ] Detalle inmueble con galería carousel, mapa placeholder, reglas, CTA sticky "Postularme"
- [ ] Registro/Login con OTP email (magic link)
- [ ] Wizard de postulación 8-12 min con autosave y progreso visual
- [ ] Upload de documentos con preview
- [ ] Risk Score AI ejecutado al submit

#### Risk Score AI (Core)
- [ ] FeatureBuilder: extracción de features de postulación
- [ ] IntegrityEngine: detección de fraude/inconsistencias
- [ ] FinancialModel: ratio canon/ingreso + deudas + buffer
- [ ] StabilityModel: tenure laboral, tipo contrato, domicilio
- [ ] HistoryModel: moras, referencias
- [ ] Aggregator: pesos configurables → score 0-100
- [ ] Niveles A/B/C/D con recomendación textual
- [ ] Drivers explicativos (3-6 por candidato)
- [ ] Flags de riesgo (chips visuales)
- [ ] Condiciones sugeridas (codeudor, depósito, póliza)
- [ ] Persistencia para ML futuro (features + outcomes)

#### Experiencia Arrendatario
- [ ] Mis Solicitudes: lista con estados y timeline
- [ ] Detalle solicitud: eventos, mensajes, checklist verificación
- [ ] Responder solicitud de información
- [ ] Retirar postulación

#### Experiencia Propietario (Arrendador)
- [ ] Mis Inmuebles: lista + crear/editar básico
- [ ] Subir fotos de inmueble
- [ ] Mis Candidatos: ranking por inmueble ordenado por fit
- [ ] Cards candidato: nivel, score, ratio canon/ingreso, checks, flags
- [ ] Acciones: pedir info, preaprobar, aprobar, rechazar
- [ ] Detalle candidato: resumen AI, subscores, drivers, documentos, referencias, notas, timeline

#### State Machine Solicitudes
- [ ] Estados: DRAFT, SUBMITTED, UNDER_REVIEW, NEEDS_INFO, PREAPPROVED, APPROVED, REJECTED, WITHDRAWN
- [ ] Timeline de eventos obligatorio
- [ ] Actualización automática visible para arrendatario

#### UX Premium
- [ ] Skeleton loaders en todas las listas
- [ ] Empty states con CTA
- [ ] Cards grandes con fotos optimizadas
- [ ] Micro-interacciones (hover, transitions)
- [ ] Badges de verificación

### Out of Scope

- **Pagos/contratos/pólizas reales** — MVP valida el flujo, no la transacción
- **Chat real-time** — Mensajes asíncronos por ahora
- **Integraciones buró reales** — Solo hooks preparados, scoring con reglas internas
- **Multi-país** — Solo Colombia (COP, ciudades colombianas)
- **SMS/WhatsApp OTP** — Solo email magic link para MVP
- **Verificación de identidad real** — Simulación con upload de docs
- **ML real para scoring** — Reglas cuantitativas, guardar datos para futuro ML

## Context

### Mercado
- **País**: Colombia
- **Moneda**: COP (pesos colombianos)
- **Usuarios**: Propietarios de inmuebles (1-5 propiedades típico) y arrendatarios buscando vivienda

### Dolor Real
- **Propietarios**: Evaluar inquilinos toma días/semanas, alta incertidumbre, miedo a mora/fraude
- **Arrendatarios**: Proceso opaco, documentos repetitivos, sin feedback del estado

### Competencia Implícita
- Metrocuadrado, Fincaraiz (catálogos sin scoring)
- Agentes inmobiliarios (intermediarios costosos)
- Airbnb (referencia UX premium)

### Filosofía de Scoring
- **MVP sin ML**: No hay datos históricos de mora
- **Híbrido**: Reglas cuantitativas + penalizaciones duras + LLM solo para extracción/redacción
- **Evolución**: Guardar features + outcomes para entrenar ML real con mora 30/60/90

## Constraints

- **Stack**: Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **DB**: Prisma + PostgreSQL (SQLite local dev)
- **Auth**: NextAuth con email OTP/magic link
- **Storage**: Local dev + adaptador para S3 futuro
- **Validación**: Zod
- **Deploy**: Vercel
- **Timeline**: MVP funcional para validación de mercado

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
| Solo Colombia para MVP | Foco en un mercado, validar antes de expandir | — Pending |
| Scoring híbrido sin ML | No hay datos históricos, reglas cuantitativas son verificables | — Pending |
| Email OTP únicamente | Reducir complejidad, SMS añade costos/integraciones | — Pending |
| Simulación de verificación | MVP valida flujo UX, integraciones reales son fase 2 | — Pending |
| Vercel deploy | Zero-config, preview deploys, edge functions | — Pending |
| shadcn/ui + Tailwind | Componentes accesibles, fácil customización, consistencia | — Pending |

---
*Last updated: 2026-02-02 after milestone v2.0 initialization*
