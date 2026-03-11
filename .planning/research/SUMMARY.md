# Research Summary: Arriendo Fácil

**Date:** 2026-01-16
**Domain:** PropTech Rental Marketplace with Fair AI Tenant Scoring
**Market:** Colombia
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

La investigación valida tu hipótesis central: **los credit scores tradicionales son malos predictores de pago de arriendo**. TransUnion confirma que el 59% de consumidores priorizan el arriendo sobre cualquier otra obligación. Un sistema de scoring alternativo que NO dependa de Datacrédito es un diferenciador real y una necesidad del mercado colombiano.

### Hallazgos Clave

| Área | Hallazgo | Implicación |
|------|----------|-------------|
| **Scoring** | Credit scores miden comportamiento crediticio, NO pago de arriendo. Incluir historial de renta mejora predicción 10%+ | Construir scoring alternativo basado en capacidad de pago real, estabilidad, y referencias |
| **Stack** | Clerk + Prisma + Neon + UploadThing + Inngest es el stack óptimo para Next.js 14 | Stack definido y validado |
| **Features** | Metrocuadrado/Fincaraiz NO tienen screening integrado - gap masivo | UX premium + scoring explicable = diferenciador claro |
| **Pitfalls** | SafeRent pagó $2.3M por scoring "black box". Explicabilidad NO es opcional | Construir explicabilidad desde día 1 |
| **Colombia** | 56% trabajadores informales, Habeas Data estricto, desconfianza tecnológica | Diseñar para economía informal, compliance desde arquitectura |

### El Insight Central

> "Una persona paga primero donde vive, después los créditos"

La investigación lo confirma con datos duros:
- TransUnion: 59% citan renta como bill más importante
- Urban Institute: Inquilinos con 24 meses pago puntual tienen solo 0.25% probabilidad de mora
- NCLC: "No hay evidencia que credit scores predigan pago de renta"

---

## Research Files

| File | Purpose | Key Takeaway |
|------|---------|--------------|
| `SCORING.md` | Modelos de scoring alternativos, variables, pesos | Rent-to-income + estabilidad + historial > credit score |
| `STACK.md` | Stack tecnológico 2025 validado | Clerk + Prisma + Neon + UploadThing + Inngest |
| `FEATURES.md` | Features table stakes vs diferenciadores | Scoring explicable es el moat competitivo |
| `PITFALLS.md` | Errores críticos a evitar | Proxy discrimination, black box, Habeas Data |

---

## Recommended Scoring Model

Basado en la investigación, el modelo propuesto:

### Pesos Validados

| Categoría | Peso | Variables Clave | Evidencia |
|-----------|------|-----------------|-----------|
| **Capacidad de Pago** | 35% | Rent-to-income ratio, flujo de caja, deudas | TransUnion: Ratio <28% = bajo riesgo |
| **Estabilidad** | 25% | Tenure laboral, tipo contrato, dirección | Indicador de cambio de situación |
| **Historial de Arriendo** | 25% | Referencias, evictions, pagos anteriores | Urban Institute: Mejor predictor |
| **Integridad/Antifraude** | 15% | ID verificación, consistencia docs | 93% property managers reportan fraude |

### Variables a EVITAR (Proxy Discrimination)

- ❌ Zip code / Barrio (proxy racial)
- ❌ Nombre / Apellido (proxy étnico)
- ❌ Banco utilizado (proxy socioeconómico)
- ❌ Institución educativa (proxy de clase)
- ❌ Credit score como factor único

### Niveles Recomendados

| Nivel | Score | Recomendación |
|-------|-------|---------------|
| **A** | 85-100 | Aprobar - Términos estándar |
| **B** | 70-84 | Aprobar - Considerar depósito adicional |
| **C** | 55-69 | Condicional - Requiere fiador O seguro |
| **D** | <55 | No recomendado - Ofrecer proceso de apelación |

---

## Validated Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14 App Router | Server Components, Server Actions, caching built-in |
| **Auth** | Clerk | 10K MAU free, mejor DX para magic link/OTP, UI prebuilts |
| **Database** | Prisma + Neon | 72% type-check más rápido, branching, scale-to-zero |
| **File Upload** | UploadThing | TypeScript-native, docs + images, Next.js purpose-built |
| **Background Jobs** | Inngest | Serverless, no Redis, perfect para scoring pipeline |
| **UI** | shadcn/ui + React Hook Form + TanStack Table | Accesible, customizable, wizard pattern |
| **Deploy** | Vercel | Zero-config, preview deploys, edge functions |

---

## Critical Pitfalls Summary

### 🔴 CRITICAL (Must Address Phase 1-2)

1. **Proxy Discrimination** - Variables "neutrales" pueden discriminar (SafeRent $2.3M)
2. **Black Box Scoring** - Sin explicabilidad = riesgo legal + desconfianza landlords
3. **Habeas Data** - Ley 1581/2012 requiere consentimiento explícito, RNBD, portal de datos
4. **Adverse Action Notices** - Cada rechazo debe generar notificación con razones específicas

### 🟡 HIGH (Address Phase 2-3)

5. **Informal Economy** - 56% trabajadores informales, scoring tradicional los excluye
6. **Document Fraud** - 93% property managers reportan fraude, necesitas detección multi-capa
7. **Chicken-and-Egg** - Sin estrategia de liquidez inicial, marketplace muere

### 🟢 MEDIUM (Address Phase 3+)

8. **Scoring Latency** - >3 segundos = mala UX, arquitectura async requerida
9. **Landlord Trust** - Transparencia + customización + track record
10. **Technical Debt** - Pruebas automatizadas críticas para pipeline de scoring

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Core Platform
**Rationale:** Establish marketplace basics with Habeas Data compliance from architecture

- **Implements:** Property listings, user auth, wishlist, basic search
- **Addresses:** Table stakes (FEATURES.md), Habeas Data (PITFALLS.md)
- **Uses:** Next.js 14, Clerk, Prisma/Neon, UploadThing (STACK.md)
- **Avoids:** Chicken-and-egg (launch supply-side first, one barrio)

### Phase 2: Application Flow & Scoring MVP
**Rationale:** Build the core differentiator - fair, explainable scoring

- **Implements:** Application wizard, document upload, scoring engine, explainability
- **Addresses:** Scoring differentiation (FEATURES.md), proxy discrimination (PITFALLS.md)
- **Uses:** Inngest for scoring pipeline, React Hook Form wizard (STACK.md)
- **Avoids:** Black box scoring, informal economy exclusion

### Phase 3: Landlord Tools & Integration
**Rationale:** Give landlords tools to make decisions with confidence

- **Implements:** Candidate ranking, comparison, accept/reject flow, messaging
- **Addresses:** Landlord trust (PITFALLS.md), comparison tools (FEATURES.md)
- **Uses:** TanStack Table for ranking, Server Actions for mutations (STACK.md)
- **Avoids:** Fraud blindness (add detection), latency issues (async architecture)

### Phase 4: Polish & Growth
**Rationale:** Refinement and expansion preparation

- **Implements:** Map integration, notifications, analytics, regional prep
- **Addresses:** UX polish (FEATURES.md), regional differences (PITFALLS.md)
- **Avoids:** Technical debt accumulation, premature multi-city expansion

### Phase Ordering Rationale

1. **Phase 1 before 2:** Cannot build scoring without users/properties to score
2. **Phase 2 before 3:** Landlords need scores to make decisions
3. **Phase 3 before 4:** Need core flow working before polish
4. **Geographic focus:** Single barrio launch prevents chicken-and-egg death

### Research Flags for Phases

- **Phase 2:** Likely needs legal review for AI scoring disclosure (Habeas Data intersection)
- **Phase 3:** Document fraud detection may need vendor evaluation
- **Phase 4:** Regional expansion needs market-specific research

---

## Key Decisions Validated

| Decision | Research Validation | Confidence |
|----------|---------------------|------------|
| No depender de Datacrédito | TransUnion/Urban Institute confirman credit ≠ rent prediction | HIGH |
| Scoring híbrido rule-based | Sin datos históricos de mora, reglas explícitas son verificables | HIGH |
| Clerk para auth | Mejor DX, 10K MAU free, magic link built-in | HIGH |
| Inngest para scoring | Serverless, no Redis, Vercel-native | HIGH |
| shadcn/ui para UX | Accesible, customizable, wizard patterns | HIGH |
| Explicabilidad obligatoria | SafeRent lawsuit + HUD guidance + SIC requirements | HIGH |

---

## Open Questions for Future Research

1. **Colombia eviction records** - ¿Cómo acceder a Rama Judicial para historial de evictions?
2. **Open banking timeline** - ¿Cuándo disponibles APIs bancarias en Colombia?
3. **Rental insurance data** - ¿Pueden aseguradoras compartir datos de claims?
4. **Regional default rates** - ¿Tasas de mora por ciudad colombiana?
5. **Cultural payment priorities** - ¿Cómo difieren patrones de pago en Colombia vs US?

---

## Confidence Assessment

| Area | Level | Basis |
|------|-------|-------|
| Credit scores poor for rent | HIGH | TransUnion, Urban Institute, NCLC studies |
| Alternative data effectiveness | HIGH | Esusu (200K+ scores), SmartMove (15% better prediction) |
| Stack recommendations | HIGH | Official docs + 2025 benchmarks verified |
| Colombia Habeas Data | HIGH | Official law text + legal guides |
| Scoring weights | MEDIUM-HIGH | Research-based, needs local calibration |
| Marketplace dynamics | HIGH | NFX + Sharetribe case studies |
| Colombia informal economy | MEDIUM | Government stats, limited rental-specific data |

---

## Sources Summary

- **25+ sources** across scoring, stack, features, pitfalls
- **Primary:** TransUnion, Urban Institute, CFPB, HUD, Ley 1581/2012
- **Secondary:** Naborly, SmartMove, Clerk docs, Prisma benchmarks
- **Tertiary:** Medium articles, vendor claims (validated where possible)

---

*Research feeds into `/gsd:define-requirements` for Phase-specific planning.*

