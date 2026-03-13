# Leasefy AI Agents Architecture

> Documento maestro de diseño del ecosistema de agentes AI de Leasefy.
> Última actualización: 11 de marzo de 2026

---

## Visión

Leasefy es una compañía **AI-first**. Cada flujo de la plataforma — desde que un inquilino busca su primera propiedad hasta que una inmobiliaria dispersa pagos a 200 propietarios — está orquestado por agentes de inteligencia artificial que operan de forma autónoma, escalan a humanos cuando es necesario, y aprenden de cada interacción.

**Principio rector**: El usuario no debería tener que hacer trabajo repetitivo. Si un proceso puede ser automatizado con AI, debe serlo.

---

## Infraestructura AI Existente

| Componente | Estado | Ubicación |
|------------|--------|-----------|
| AI Document Analysis (OCR + scoring) | Producción | `src/lib/api/ai-analysis.service.ts` |
| Risk Scoring (A/B/C/D) | Producción | `GET /scoring/:applicationId` |
| Property Matching (4 factores) | Producción | `src/lib/scoring/propertyMatching.ts` + `GET /recommendations` |
| Beta AI Chat (SSE streaming) | Mock mode | `LeasefyAIClient` en `src/lib/api/client.ts` |
| 6 Agent Types en Beta | Mock mode | cobranza, pipeline, mantenimiento, documentos, comunicacion, reportes |
| Decision System | Mock mode | `PendingDecision` cards en Beta Chat |
| Daily Briefings | Mock mode | `BriefingSection[]` en Beta Chat |
| Tenant Self-Evaluation | Stubs (501) | `src/app/api/evaluation/` |

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                FRONTEND (Next.js)                    │
│   Chat UI ─── Notifications ─── Decision Cards      │
└──────────────────────┬──────────────────────────────┘
                       │ SSE / WebSocket
┌──────────────────────▼──────────────────────────────┐
│           ORCHESTRATOR (Agent Gateway)               │
│   Intent Router → Agent Dispatcher → Response        │
│   Aggregator → Decision Manager → Briefing Gen       │
└──────────────────────┬──────────────────────────────┘
                       │ Internal API / Event Bus
┌──────────────────────▼──────────────────────────────┐
│              AGENT LAYER (19 Agents)                 │
│                                                      │
│  ┌───────────┐ ┌────────────┐ ┌───────────────┐    │
│  │  Scoring  │ │  Matching  │ │  Collections  │    │
│  └─────┬─────┘ └─────┬──────┘ └──────┬────────┘    │
│  ┌─────┴─────┐ ┌─────┴──────┐ ┌──────┴────────┐    │
│  │ Contracts │ │  Pipeline  │ │ Maintenance   │    │
│  └─────┬─────┘ └─────┬──────┘ └──────┬────────┘    │
│  ┌─────┴─────┐ ┌─────┴──────┐ ┌──────┴────────┐    │
│  │ Renewals  │ │ Documents  │ │Communication  │    │
│  └─────┬─────┘ └─────┬──────┘ └──────┬────────┘    │
│  ┌─────┴─────┐ ┌─────┴──────┐ ┌──────┴────────┐    │
│  │ Analytics │ │  Pricing   │ │ Prop Verify   │    │
│  └─────┬─────┘ └─────┬──────┘ └──────┬────────┘    │
│  ┌─────┴─────┐ ┌─────┴──────┐ ┌──────┴────────┐    │
│  │   Legal   │ │   Visits   │ │  Fraud/KYC    │    │
│  └───────────┘ └────────────┘ └───────────────┘    │
│  ┌───────────┐ ┌────────────┐ ┌───────────────┐    │
│  │Onboarding │ │ Retention  │ │Disbursements  │    │
│  └───────────┘ └────────────┘ └───────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            SHARED INFRASTRUCTURE                     │
│   LLM (Claude) ─ Vector DB ─ Event Bus ─ Queue      │
│   Supabase ─ NestJS ─ Stripe ─ WhatsApp API         │
└─────────────────────────────────────────────────────┘
```

---

## Roles de Usuario

| Rol | Frontend Path | Agentes que le sirven |
|-----|---------------|----------------------|
| **Inquilino** (Tenant) | `/inquilino/*` | Scoring, Matching, Contracts, Communication, Legal, Visits, Onboarding, Retention |
| **Propietario** (Landlord) | `/panel/*` | Scoring, Matching, Contracts, Collections, Communication, Pricing, Visits, Analytics, Retention |
| **Inmobiliaria** (Agency) | `/panel/inmobiliaria/*` | TODOS los 19 agentes |

---

## CAPA 1 — Agentes Core

Generan valor directo al negocio. Son la razón por la que un usuario elige Leasefy sobre la competencia.

---

### Agent 01: Evaluación de Inquilinos (`tenant-scoring`)

**Evolución del**: Risk Scoring actual + AI Document Analysis

**Descripción**: Agente autónomo que evalúa el perfil de un potencial inquilino analizando documentos, cruzando con centrales de riesgo, y generando un score verificable con explicación en lenguaje natural.

**Triggers**:
- Inquilino solicita su evaluación (paga por el servicio)
- Propietario recibe una aplicación y necesita evaluación
- Inmobiliaria procesa candidatos en pipeline

**Acciones**:
1. Recibe documentos del candidato (cédula, certificación laboral, extractos bancarios)
2. Ejecuta OCR + extracción de datos estructurados
3. Cruza con centrales de riesgo (DataCrédito/TransUnion — Ley 1266/2008)
4. Analiza consistencia: ¿ingresos declarados coinciden con extractos? ¿empresa existe?
5. Genera score 0-100 con nivel A/B/C/D
6. Produce explicación en lenguaje natural (aiExplanation)
7. Identifica drivers positivos y flags de riesgo
8. Genera código de verificación de 8 caracteres
9. Produce PDF descargable con QR de verificación

**Output**:
```typescript
interface ScoringResult {
  score: number;              // 0-100
  level: 'A' | 'B' | 'C' | 'D';
  categories: {
    financialStability: { score: number; weight: 0.35 };
    rentalHistory: { score: number; weight: 0.25 };
    personalProfile: { score: number; weight: 0.15 };
    documentVerification: { score: number; weight: 0.25 };
  };
  drivers: string[];          // Factores positivos
  flags: Flag[];              // Alertas (severity: low/medium/high)
  aiExplanation: string;      // Explicación en lenguaje natural
  verificationCode: string;   // 8-char alphanumeric
  validUntil: Date;           // 90 días
  confidence: number;         // 0-1 confianza del modelo
}
```

**Autonomía**: Totalmente autónomo. Solo escala a humano cuando:
- Detecta inconsistencias graves (posible fraude)
- Confidence < 0.6
- Documentos ilegibles

**Datos que consume**:
- Documentos subidos por el candidato (Supabase Storage)
- API de centrales de riesgo (DataCrédito, TransUnion)
- Historial de arrendamiento en la plataforma
- Datos de la aplicación (empleo, ingresos, referencias)

**Servicios que invoca**:
- `POST /ai/analyze/:applicationId` (Document Analysis existente)
- `GET /scoring/:applicationId` (Risk Scoring existente)
- Centrales de riesgo API (nuevo)

**Compliance**:
- Colombia: Ley 1266/2008 (Habeas Data), Ley 1581/2012 (Datos Personales)
- USA: NO es consumer report bajo FCRA (disclaimer explícito)
- Anti-discriminación: Modelos auditados para evitar sesgos por raza, género, etc.

**Métricas**:
- Tiempo promedio de evaluación (target: <5 min)
- Accuracy vs. defaults reales (backtesting)
- Tasa de escalación a humano (<10%)
- NPS del inquilino post-evaluación

**Impacto**: Evaluación que hoy toma 2-5 días → resultado en minutos.

---

### Agent 02: Matching Inteligente (`smart-matching`)

**Evolución del**: Property Matching actual (`propertyMatching.ts` + `/recommendations`)

**Descripción**: Agente que cruza perfiles de inquilinos con propiedades disponibles de forma bidireccional, generando recomendaciones personalizadas para ambas partes.

**Triggers**:
- Inquilino completa onboarding (housing preferences)
- Nueva propiedad publicada
- Inquilino cambia preferencias (zona, presupuesto)
- Propietario actualiza requisitos de inquilino ideal
- Periódico: re-scoring cada 24h para propiedades que llevan >7 días sin aplicantes

**Acciones**:
1. **Para inquilinos**:
   - Cruza preferencias (zona, presupuesto, tipo, amenities) con propiedades disponibles
   - Calcula match score (affordability 40%, riskFit 30%, profileStrength 15%, preferences 15%)
   - Calcula probabilidad de aceptación (score del inquilino vs. tier de la propiedad)
   - Genera explicación: "Esta propiedad tiene 87% de match porque está en tu zona preferida, dentro de tu presupuesto, y tu score A te da alta probabilidad de aceptación"
   - Envía notificación push cuando match >85%

2. **Para propietarios**:
   - Cuando recibe aplicación, cruza perfil del candidato con el "inquilino ideal" del propietario
   - Rankea candidatos por compatibilidad
   - Notifica: "Nuevo candidato con score A y 92% de match aplicó a tu propiedad en Chapinero"

3. **Para agencias**:
   - Auto-asigna leads del pipeline al agente cuya zona/especialización mejor coincide
   - Sugiere propiedades alternativas cuando un candidato es rechazado en una

**Output**:
```typescript
interface MatchResult {
  property: Property;
  matchScore: number;         // 0-100
  acceptanceProbability: 'alta' | 'media' | 'baja';
  matchFactors: {
    affordability: number;
    riskFit: number;
    profileStrength: number;
    preferences: number;
  };
  explanation: string;        // NL explanation
  recommendation: string;     // Acción sugerida
}
```

**Autonomía**: Totalmente autónomo en recomendaciones. Notificaciones configurables por usuario.

**Datos que consume**:
- Perfil del inquilino (TenantProfileContext: riskLevel, preferences, budget)
- Propiedades disponibles (status: AVAILABLE)
- Historial de interacciones (views, saves, applications)
- Mercado local (precios promedio por zona/estrato)

**Servicios que invoca**:
- `GET /properties` (listado filtrado)
- `GET /recommendations` (backend recommendations)
- `propertyMatching.ts` (client-side scoring)
- Notification service

**Métricas**:
- Tasa de conversión match → aplicación
- Precisión de predicción de aceptación
- Tiempo promedio búsqueda → contrato firmado
- Engagement con feed "Para Ti"

**Impacto**: Reduce tiempo de búsqueda. Aumenta tasa de cierre al conectar candidatos ideales con propiedades compatibles.

---

### Agent 03: Cobranza (`collections`)

**Evolución del**: Agent type `cobranza` en Beta Chat + `cobrosApi`

**Descripción**: Agente autónomo que gestiona todo el ciclo de cobro de cánones de arrendamiento, desde recordatorios preventivos hasta escalación por mora, con comunicación multi-canal personalizada.

**Triggers**:
- Cron: D-5 antes de fecha de cobro
- Evento: Pago recibido / no recibido en fecha
- Evento: Pago parcial registrado
- Manual: Agente de inmobiliaria solicita acción

**Flujo autónomo (timeline)**:

```
D-5  │ Recordatorio amigable (email + push)
     │ "Hola [nombre], tu canon de $[monto] vence el [fecha]."
     │
D-0  │ Día de cobro — verifica si pago fue procesado
     │ Si pagó → "¡Gracias! Tu pago de [mes] fue recibido."
     │ Si no pagó → marca como pendiente, inicia seguimiento
     │
D+3  │ Primer aviso de mora (WhatsApp)
     │ Tono empático: "Notamos que tu pago está pendiente.
     │ ¿Necesitas ayuda? Puedes pagar por [métodos]."
     │ Ofrece: link de pago directo
     │
D+7  │ Segundo aviso (email formal)
     │ Notifica al propietario: "El inquilino de [propiedad]
     │ tiene 7 días de mora."
     │ Genera late fee si aplica según contrato
     │
D+15 │ Escalación a agente humano (inmobiliaria)
     │ Genera resumen del caso: intentos de contacto,
     │ historial de pagos, monto acumulado
     │
D+30 │ Genera reporte formal de mora
     │ Sugiere acciones legales según jurisdicción
     │ Alimenta scoring negativo del inquilino
```

**Personalización**:
- Si es primer retraso de un inquilino con historial impecable → tono más suave, asume olvido
- Si es reincidente → tono más directo, menciona consecuencias
- Adapta canal según preferencia del inquilino y horarios legales (Ley 2300/2023)

**Output**:
```typescript
interface CollectionAction {
  type: 'reminder' | 'first_notice' | 'second_notice' | 'escalation' | 'legal_report';
  channel: 'email' | 'whatsapp' | 'push' | 'sms';
  recipientRole: 'tenant' | 'landlord' | 'agent';
  message: string;
  scheduledAt: Date;
  executed: boolean;
  response?: string;
}

interface CollectionSummary {
  cobroId: string;
  daysLate: number;
  totalOwed: number;        // canon + late fees
  attemptsMade: number;
  lastContactDate: Date;
  tenantResponseRate: number;
  recommendation: 'wait' | 'escalate' | 'legal';
}
```

**Autonomía**:
- D-5 a D+7: Totalmente autónomo
- D+15: Notifica al humano con recomendación, pero puede actuar si configurado en `auto`
- D+30: Siempre requiere aprobación humana para acciones legales

**Configuración** (por agencia/propietario):
```typescript
interface CollectionConfig {
  reminderDaysBefore: number;     // default: 5
  firstNoticeDaysAfter: number;   // default: 3
  escalationDaysAfter: number;    // default: 15
  autoLateFee: boolean;           // default: true
  lateFeePercent: number;         // default: según contrato
  channels: ('email' | 'whatsapp' | 'push' | 'sms')[];
  moraTolerance: number;          // días de gracia, default: 0
  autonomyLevel: 'auto' | 'ask_first' | 'manual';
}
```

**Datos que consume**:
- `cobrosApi.getAll()` — cobros del período
- Historial de pagos del inquilino
- Datos de contacto (email, teléfono, WhatsApp)
- Configuración de recordatorios de la inmobiliaria
- Contrato vigente (cláusulas de mora, late fees)

**Servicios que invoca**:
- `cobrosApi.sendReminder(id)`
- `cobrosApi.registerPayment(id, data)`
- Communication Agent (para envío multi-canal)
- Notification service
- Analytics Agent (reportes de mora)

**Compliance**:
- Ley 2300/2023 (Colombia): No contactar fuera de horario, máximo X intentos
- TCPA (USA): Consent para SMS/llamadas
- Ley 820/2003: Procedimiento legal de mora

**Métricas**:
- Tasa de cobro dentro de plazo (target: >95%)
- Tasa de mora >30 días (target: <3%)
- Tiempo promedio de recuperación de mora
- Costo de cobranza por unidad
- Tasa de respuesta por canal

**Impacto**: Reduce mora del 15-20% promedio del sector a <5%. Elimina trabajo manual de seguimiento.

---

### Agent 04: Contratos (`contracts`)

**Descripción**: Agente que automatiza todo el ciclo de vida contractual — desde la generación del borrador hasta la firma electrónica, renovación y terminación.

**Triggers**:
- Aplicación aprobada (`approved`) → genera contrato
- Renovación aceptada → genera nuevo contrato
- Solicitud de terminación → genera carta de terminación
- Cambio de legislación → alerta sobre contratos que necesitan actualización

**Acciones**:

1. **Generación de contrato**:
   - Selecciona plantilla correcta según tipo (básico/amoblado/compartido/custom)
   - Rellena datos de ambas partes desde la base de datos
   - Incluye cláusulas obligatorias por jurisdicción:
     - Colombia: Ley 820/2003 (arts. 3, 4, 5, 22), prohibición de depósitos
     - México: Código Civil Federal
     - Brasil: Lei 8.245/1991
     - USA: State-specific landlord-tenant law
   - Calcula canon máximo si aplica (IPC en Colombia)
   - Genera número de contrato y certificateId
   - Calcula documentHash para integridad

2. **Flujo de firmas**:
   ```
   Genera borrador → Envía a propietario para revisión
   → Propietario firma (OTP) → Envía a inquilino
   → Inquilino firma (OTP) → Contrato ACTIVO
   → Registra audit trail completo
   ```

3. **Renovación automática**:
   - Calcula nuevo canon: `canon_actual * (1 + IPC_anual)`
   - Verifica que no exceda límite legal
   - Genera addendum o nuevo contrato según configuración
   - Orquesta aprobación de ambas partes

4. **Terminación**:
   - Genera carta de terminación con plazos legales correctos
   - Calcula indemnizaciones si aplica (terminación anticipada sin justa causa)
   - Programa acta de entrega/devolución
   - Genera paz y salvo

**Output**:
```typescript
interface ContractGeneration {
  contractId: string;
  type: 'BASICO' | 'AMOBLADO' | 'COMPARTIDO' | 'CUSTOM';
  status: 'draft' | 'pending_landlord' | 'pending_tenant' | 'active';
  documentUrl: string;        // PDF generado
  documentHash: string;       // SHA-256 para integridad
  certificateId: string;
  nonNegotiableClauses: string[];
  auditTrail: AuditEntry[];
  signatures: {
    landlord?: SignatureRecord;
    tenant?: SignatureRecord;
  };
}
```

**Autonomía**:
- Generación de borrador: Autónomo
- Envío para firma: Autónomo (el contrato fue pre-aprobado en la etapa de aplicación)
- Modificación de cláusulas: Requiere aprobación humana
- Terminación: Requiere aprobación humana

**Datos que consume**:
- Aplicación aprobada (datos del candidato)
- Propiedad (dirección, canon, tipo)
- Propietario (datos legales, representante)
- Plantillas de contrato (`DocumentTemplate`)
- IPC vigente (para renovaciones)
- Legislación aplicable según jurisdicción

**Servicios que invoca**:
- `contractsApi.create(data)`
- `contractsApi.sign(id, { otpVerified })`
- Documents Agent (generación PDF)
- Communication Agent (notificaciones de firma)
- E-signature service (OTP verification)

**Compliance**:
- Ley 527/1999 (Colombia): Firma electrónica
- E-SIGN Act (USA): Electronic signatures
- NOM-151-SCFI-2016 (México): Firma electrónica
- LGPD Arts. 7-11 (Brasil): Base legal del tratamiento

**Métricas**:
- Tiempo generación → firma completa (target: <48h)
- Tasa de contratos firmados vs. generados (target: >90%)
- Errores legales en contratos generados (target: 0)
- Satisfacción del usuario con el proceso

**Impacto**: Contrato generado en segundos vs. horas de redacción manual. Cero errores legales por omisión de cláusulas obligatorias.

---

### Agent 05: Dispersiones (`disbursements`)

**Descripción**: Agente que automatiza el pago mensual a propietarios, consolidando cobros, calculando comisiones, y ejecutando transferencias.

**Triggers**:
- Cron: Día X del mes (configurable por agencia, típicamente día 5-10)
- Evento: Todos los cobros del período procesados
- Manual: Agencia solicita dispersión anticipada

**Flujo autónomo**:

```
1. CONSOLIDACIÓN (automático)
   │ Por cada propietario:
   │ - Suma cobros recibidos del mes
   │ - Identifica pagos parciales o pendientes
   │ - Genera lista de propiedades con montos
   │
2. CÁLCULO (automático)
   │ Por cada propiedad:
   │ - Canon cobrado
   │ - (-) Comisión agencia (% según plan)
   │ - (-) Fee administración (si aplica)
   │ - (-) Retenciones tributarias (si aplica)
   │ - (-) Descuentos por mantenimiento (si propietario paga)
   │ - (=) Neto a dispersar
   │
3. PREVIEW (requiere aprobación si > umbral)
   │ Genera resumen:
   │ - Total a dispersar: $X.XXX.XXX
   │ - Total comisiones: $X.XXX.XXX
   │ - N propietarios
   │ - N propiedades
   │ Presenta al admin de la agencia para aprobación
   │
4. EJECUCIÓN (post-aprobación)
   │ - Procesa transferencias a cuentas bancarias/wallets
   │ - Registra referencia de transferencia
   │ - Actualiza status: pending → processing → completed/failed
   │ - Reintenta failed hasta 3 veces
   │
5. NOTIFICACIÓN (automático)
   │ - Genera extracto PDF por propietario (ExtractoPropietario)
   │ - Envía por email con resumen
   │ - "Su dispersión de [mes] por $[monto] fue procesada.
   │    Adjunto encontrará su extracto detallado."
```

**Output**:
```typescript
interface DispersionBatch {
  month: string;              // "2026-03"
  totalCollected: number;
  totalCommissions: number;
  totalDisbursed: number;
  itemCount: number;
  status: 'preview' | 'approved' | 'processing' | 'completed' | 'partial';
  items: DispersionItem[];
  failedItems: DispersionItem[];
  extractos: { propietarioId: string; pdfUrl: string }[];
}
```

**Autonomía**:
- Consolidación y cálculo: Totalmente autónomo
- Ejecución: Autónomo si monto < umbral configurado; requiere aprobación si > umbral
- Reintentos de fallos: Autónomo hasta 3 intentos
- Notificación: Totalmente autónomo

**Datos que consume**:
- `cobrosApi.getAll({ month, status: 'paid' })` — cobros pagados del mes
- `propietariosApi.getAll()` — datos bancarios de propietarios
- `consignacionesApi.getAll()` — comisiones por propiedad
- Configuración de la agencia (día de dispersión, umbral de aprobación)

**Servicios que invoca**:
- `dispersionesApi.create(data)` / `dispersionesApi.process(id)`
- `dispersionesApi.getExtracto(propietarioId, month)` — PDF
- Communication Agent (envío de extractos)
- Payment gateway (transferencias bancarias)

**Métricas**:
- Tasa de dispersión exitosa (target: >99%)
- Tiempo de procesamiento (target: <24h post-cierre de cobros)
- Errores de transferencia (target: <1%)
- Satisfacción del propietario (encuesta post-dispersión)

**Impacto**: Elimina 2-3 días de trabajo contable manual mensual. Propietarios reciben su dinero más rápido y con extracto detallado.

---

## CAPA 2 — Agentes Operativos

Automatizan procesos operativos que consumen tiempo. Reducen la carga operativa de agencias e intermediarios.

---

### Agent 06: Pipeline (`pipeline`)

**Evolución del**: Agent type `pipeline` en Beta Chat + `pipelineApi`

**Descripción**: Agente que gestiona el embudo de arrendamiento (lead → contrato firmado), moviendo candidatos entre etapas, detectando oportunidades perdidas, y optimizando la conversión.

**Triggers**:
- Nuevo lead registrado (candidato expresa interés)
- Visita completada
- Documentos subidos
- Inactividad detectada (candidato sin avance >X días)
- Cron: Análisis diario de pipeline

**Acciones**:

1. **Auto-avance de etapas**:
   ```
   lead → visit_scheduled     (cuando se agenda visita)
   visit_scheduled → visit_done  (cuando se confirma asistencia)
   visit_done → application    (cuando candidato sube documentos)
   application → evaluation    (cuando scoring se completa)
   evaluation → approved       (cuando score >= umbral del propietario)
   approved → contract         (cuando contrato es generado)
   contract → handover         (cuando contrato es firmado)
   handover → completed        (cuando acta de entrega es firmada)
   ```

2. **Detección de estancamiento**:
   - Si un lead lleva >3 días sin avance → notifica al agente asignado
   - Si lleva >7 días → sugiere acción: "Contactar candidato" o "Mover a lost"
   - Si lleva >14 días → auto-mueve a `lost` con razón `inactivity`

3. **Asignación inteligente de leads**:
   - Nuevo lead entra → analiza zona, tipo de propiedad, idioma del candidato
   - Asigna al agente con: mejor match de zona + menor carga actual + mejor tasa de conversión

4. **Predicción de cierre**:
   - Por cada candidato activo, calcula probabilidad de cierre basada en:
     - Etapa actual + velocidad de avance
     - Score del candidato
     - Historial de conversión en propiedad similar
   - Prioriza pipeline: "Estos 5 candidatos tienen >80% probabilidad de cerrar esta semana"

5. **Análisis de pérdidas**:
   - Cuando un candidato se pierde → solicita/infiere razón
   - Agrega datos al modelo: "40% de pérdidas en Chapinero son por precio → sugiere ajuste"

**Output**:
```typescript
interface PipelineInsight {
  totalLeads: number;
  inProgress: number;
  closedThisMonth: number;
  conversionRate: number;
  staleItems: PipelineItem[];       // >3 días sin avance
  highProbabilityClosings: {
    item: PipelineItem;
    probability: number;
    suggestedAction: string;
  }[];
  lossAnalysis: {
    reason: string;
    count: number;
    suggestion: string;
  }[];
}
```

**Autonomía**:
- Auto-avance de etapas: Autónomo (basado en eventos del sistema)
- Asignación de leads: Autónomo (configurable a `ask_first`)
- Mover a `lost`: Requiere confirmación del agente
- Sugerencias: Siempre informativo

**Métricas**:
- Tasa de conversión lead→contrato (target: >25%)
- Tiempo promedio por etapa
- Leads estancados / total
- Accuracy de predicción de cierre

**Impacto**: Aumenta tasa de conversión. Elimina leads olvidados. Agentes se enfocan en los candidatos con mayor probabilidad.

---

### Agent 07: Mantenimiento (`maintenance`)

**Evolución del**: Agent type `mantenimiento` en Beta Chat + `mantenimientoApi`

**Descripción**: Agente que gestiona solicitudes de mantenimiento end-to-end, desde la recepción hasta la resolución, coordinando inquilinos, propietarios y proveedores.

**Triggers**:
- Inquilino crea solicitud de mantenimiento
- Proveedor envía cotización
- Propietario aprueba/rechaza cotización
- Trabajo completado
- Cron: Seguimiento de solicitudes abiertas >48h

**Flujo autónomo**:

```
1. RECEPCIÓN Y CLASIFICACIÓN (automático)
   │ Inquilino reporta: "Se está filtrando agua del techo"
   │ → Clasifica: tipo=plomería, prioridad=alta
   │ → Si emergencia (gas, eléctrico, inundación):
   │   notifica INMEDIATAMENTE a propietario + agente
   │
2. ASIGNACIÓN DE PROVEEDOR (automático si hay base de proveedores)
   │ → Busca proveedores de plomería en la zona
   │ → Envía solicitud de cotización a 2-3 proveedores
   │ → "Necesitamos reparación de filtración en [dirección].
   │    Por favor envíe cotización."
   │
3. EVALUACIÓN DE COTIZACIONES (semi-autónomo)
   │ → Recibe cotizaciones
   │ → Compara: precio, tiempo estimado, rating del proveedor
   │ → Si monto < umbral configurado → aprueba automáticamente
   │ → Si monto > umbral → presenta comparativo al propietario
   │   con recomendación: "Recomendamos Proveedor A: $X,
   │   2 días, rating 4.8/5"
   │
4. COORDINACIÓN (automático)
   │ → Cotización aprobada → coordina fecha con inquilino y proveedor
   │ → Envía confirmación a ambos
   │ → Recordatorio el día anterior
   │
5. SEGUIMIENTO (automático)
   │ → Post-trabajo: encuesta al inquilino ("¿Se resolvió?")
   │ → Califica al proveedor
   │ → Cierra solicitud
   │ → Si no resuelto: re-abre y escala
```

**Output**:
```typescript
interface MaintenanceResolution {
  solicitudId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'reported' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  assignedProvider?: Provider;
  quotes: Quote[];
  approvedQuote?: Quote;
  scheduledDate?: Date;
  completedDate?: Date;
  tenantSatisfaction?: number;
  totalCost: number;
  paidBy: 'owner' | 'tenant' | 'split' | 'agency';
  timeToResolution: number;   // horas
}
```

**Autonomía**:
- Clasificación: Autónomo
- Asignación de proveedor: Autónomo
- Aprobación de cotización: Autónomo si < umbral; escala si > umbral
- Coordinación: Autónomo
- Cierre: Autónomo post-confirmación del inquilino

**Configuración**:
```typescript
interface MaintenanceConfig {
  autoApproveThreshold: number;  // COP, default: 500000
  preferredProviders: Provider[];
  quotesRequired: number;        // default: 2
  escalationHours: number;       // default: 48
  budgetLimitPerProperty: number;
}
```

**Métricas**:
- Tiempo promedio de resolución (target: <48h)
- Satisfacción del inquilino (target: >4.5/5)
- Costo promedio por solicitud
- Tasa de re-apertura (<5%)

**Impacto**: Resolución de 5-7 días → 1-2 días. Inquilino más satisfecho. Propietario con menos carga operativa.

---

### Agent 08: Renovaciones (`renewals`)

**Descripción**: Agente que gestiona proactivamente las renovaciones de contratos, negociando condiciones y evitando vacancia.

**Triggers**:
- Contrato a 90 días de vencimiento → inicia proceso
- Contrato a 60 días → fase de negociación
- Contrato a 30 días → urgencia
- Propietario solicita no renovar
- Inquilino solicita no renovar

**Flujo autónomo**:

```
D-90 │ ANÁLISIS
     │ → Evalúa historial del inquilino:
     │   - Pagos: ¿Todos puntuales? ¿Cuántas moras?
     │   - Mantenimiento: ¿Cuida la propiedad?
     │   - Relación: ¿Quejas del propietario?
     │ → Genera recomendación:
     │   - "Renovar" (buen inquilino)
     │   - "Renovar con condiciones" (algún issue)
     │   - "No renovar" (problemas recurrentes)
     │ → Envía recomendación al propietario/agencia
     │
D-60 │ PROPUESTA
     │ → Propietario aprueba renovación
     │ → Calcula nuevo canon:
     │   canon_nuevo = canon_actual × (1 + IPC)
     │   Verifica: no exceda 100% IPC (Ley 820 Art. 20)
     │ → Genera propuesta para el inquilino:
     │   "Tu contrato vence el [fecha]. Te ofrecemos
     │    renovar por 12 meses más a $[nuevo_canon]/mes
     │    (incremento de [X]% por IPC)."
     │
D-45 │ NEGOCIACIÓN
     │ → Inquilino acepta → Agente de Contratos genera nuevo contrato
     │ → Inquilino contraoferta → presenta al propietario
     │ → Inquilino rechaza → activa búsqueda de nuevo inquilino
     │   (notifica Agente de Pipeline)
     │
D-30 │ URGENCIA
     │ → Sin respuesta → escalación a agente humano
     │ → Con acuerdo → verificar que contrato esté firmado
     │
D-15 │ PREPARACIÓN
     │ → Si no renueva: programa acta de devolución
     │ → Si renueva: confirmar que nuevo contrato está activo
     │
D-0  │ TRANSICIÓN
     │ → Renovación activa → nada que hacer
     │ → No renovación → ejecutar devolución del inmueble
```

**Output**:
```typescript
interface RenewalRecommendation {
  leaseId: string;
  tenantScore: {
    paymentHistory: number;    // 0-100
    propertyCareTaking: number;
    communicationRating: number;
    overallScore: number;
  };
  recommendation: 'renew' | 'renew_with_conditions' | 'do_not_renew';
  conditions?: string[];
  proposedNewRent: number;
  ipcRate: number;
  rentIncrease: number;       // porcentaje
  marketComparison: {
    averageRent: number;
    proposedVsMarket: number; // porcentaje
  };
}
```

**Autonomía**:
- Análisis y recomendación: Autónomo
- Cálculo de nuevo canon: Autónomo
- Envío de propuesta al inquilino: Requiere aprobación del propietario
- Generación de contrato: Delega al Agente de Contratos
- Terminación: Requiere aprobación humana

**Servicios que invoca**:
- `renovacionesApi.getIPC()` — tasa IPC vigente
- `renovacionesApi.notify(id)` — notificar al inquilino
- Contracts Agent → genera nuevo contrato
- Pipeline Agent → activa búsqueda si no renueva
- Documents Agent → genera carta de incremento

**Métricas**:
- Tasa de renovación (target: >80%)
- Tiempo de negociación promedio
- Vacancia post-no-renovación (target: <30 días)
- Satisfacción del inquilino con proceso

**Impacto**: Reduce vacancia por renovaciones fallidas. Propietarios informados proactivamente. Proceso de 2-4 semanas de ida y vuelta → workflow automatizado.

---

### Agent 09: Documentos (`documents`)

**Evolución del**: Agent type `documentos` en Beta Chat + `documentosApi`

**Descripción**: Agente que genera, organiza y gestiona todos los documentos del ciclo de arrendamiento, desde contratos hasta paz y salvos.

**Triggers**:
- Evento del ciclo que requiere documento (aplicación, firma, pago, devolución)
- Solicitud del usuario: "Genera un certificado de arrendamiento"
- Detección de documento faltante en un proceso
- Cron: Limpieza de documentos expirados

**Acciones**:

1. **Generación automática de documentos**:
   | Evento | Documento generado |
   |--------|-------------------|
   | Aplicación aprobada | Contrato de arrendamiento |
   | Entrega de inmueble | Acta de entrega |
   | Devolución de inmueble | Acta de devolución |
   | Renovación con incremento | Carta de incremento IPC |
   | Pago de canon | Recibo de pago |
   | Fin de mes (agencia) | Extracto propietario |
   | Solicitud del inquilino | Certificado de arrendamiento |
   | Fin de contrato sin deudas | Paz y salvo |

2. **OCR y extracción de datos**:
   - Documentos subidos (cédula, extractos, certificaciones) → extrae datos estructurados
   - Detecta inconsistencias: "La cédula dice Juan Pérez pero la certificación dice Juan Perez García"

3. **Gestión documental**:
   - Organiza por propiedad/inquilino/fecha
   - Detecta documentos faltantes: "La aplicación de [candidato] no tiene certificación laboral"
   - Envía recordatorio al candidato para completar

4. **Validación de completitud**:
   - Verifica que un contrato tiene todos los campos requeridos
   - Verifica que un acta tiene todas las firmas
   - Bloquea avance del proceso si faltan documentos obligatorios

**Output**:
```typescript
interface DocumentGeneration {
  documentId: string;
  type: DocumentType;
  templateUsed: string;
  generatedUrl: string;       // PDF en Supabase Storage
  status: 'draft' | 'ready' | 'signed' | 'archived';
  extractedData?: Record<string, unknown>;
  missingFields?: string[];
  relatedEntity: {
    type: 'application' | 'contract' | 'lease' | 'dispersion';
    id: string;
  };
}
```

**Autonomía**: Totalmente autónomo en generación y organización. Requiere revisión humana para documentos legales antes de firma.

**Métricas**:
- Documentos generados automáticamente / mes
- Tasa de documentos completos al primer intento
- Tiempo de generación (target: <10s)
- Errores de datos en documentos generados (target: 0)

**Impacto**: Elimina generación manual de documentos. Cero documentos olvidados o incompletos.

---

### Agent 10: Comunicación (`communication`)

**Evolución del**: Agent type `comunicacion` en Beta Chat

**Descripción**: Agente multi-canal que gestiona todas las comunicaciones de la plataforma, redactando mensajes contextuales y seleccionando el canal óptimo.

**Triggers**:
- Cualquier agente necesita enviar una comunicación
- Usuario envía mensaje (requiere ruteo)
- Evento del sistema que requiere notificación

**Acciones**:

1. **Selección de canal**:
   | Tipo de mensaje | Canal preferido |
   |----------------|-----------------|
   | Urgente (emergencia mantenimiento) | WhatsApp + Push |
   | Transaccional (confirmación pago) | Email + Push |
   | Recordatorio (pago próximo) | Push + Email |
   | Formal (carta legal, extracto) | Email |
   | Conversacional (pregunta del candidato) | Chat in-app |
   | Marketing (nueva funcionalidad) | Email (con opt-out) |

2. **Redacción contextual**:
   - No usa templates genéricos — redacta mensajes adaptados al contexto
   - Considera: idioma del usuario (ES/EN), tono (formal/casual), historial de relación
   - Ejemplo formal: "Estimado Sr. García, le informamos que su dispersión de marzo..."
   - Ejemplo casual: "¡Hola María! Tu pago de marzo fue recibido exitosamente 🎉"

3. **Gestión de respuestas**:
   - Si inquilino responde por WhatsApp → rutea al agente correspondiente
   - Si requiere acción humana → crea ticket para el agente de la inmobiliaria
   - Si es pregunta frecuente → responde automáticamente

4. **Compliance de comunicaciones**:
   - Ley 2300/2023 (Colombia): horarios permitidos
   - CAN-SPAM (USA): opt-out obligatorio
   - LGPD (Brasil): consentimiento previo
   - Rate limiting: máximo N mensajes por usuario por día

**Output**:
```typescript
interface CommunicationEvent {
  id: string;
  type: 'transactional' | 'reminder' | 'marketing' | 'conversational' | 'formal';
  channel: 'email' | 'whatsapp' | 'push' | 'sms' | 'in_app';
  recipientId: string;
  recipientRole: 'tenant' | 'landlord' | 'agent';
  subject?: string;
  body: string;
  language: 'es' | 'en' | 'pt';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  sourceAgent: string;        // Qué agente solicitó el envío
  metadata?: Record<string, unknown>;
}
```

**Autonomía**: Totalmente autónomo. Respeta configuración de notificaciones del usuario.

**Integraciones necesarias**:
- SendGrid / AWS SES (email)
- WhatsApp Business API / Twilio
- Firebase Cloud Messaging (push)
- Twilio (SMS)

**Métricas**:
- Tasa de entrega por canal
- Tasa de apertura de emails
- Tasa de respuesta en WhatsApp
- Tiempo de respuesta promedio
- Opt-out rate (<2%)

**Impacto**: Comunicación oportuna, personalizada, multi-canal. Reduce tiempo de respuesta. Mejora satisfacción.

---

## CAPA 3 — Agentes de Inteligencia

Generan insights, predicciones y recomendaciones estratégicas. Transforman datos en decisiones.

---

### Agent 11: Analytics y Reportes (`analytics`)

**Evolución del**: Agent type `reportes` en Beta Chat + `analyticsApi` + `reportesApi`

**Descripción**: Agente que genera reportes automáticos, detecta anomalías, predice tendencias, y responde preguntas sobre el negocio en lenguaje natural.

**Triggers**:
- Cron: Reportes mensuales automáticos (día 1 de cada mes)
- Anomalía detectada (desviación >2σ de métricas normales)
- Solicitud del usuario: "¿Cuánto recaudamos en febrero?"
- Dashboard load (KPIs en tiempo real)

**Acciones**:

1. **Reportes automáticos**:
   - Cartera de edades (aging: 0-30, 31-60, 61-90, 90+ días)
   - Ocupación por zona
   - Comisiones por agente
   - Rendimiento de agentes
   - Vencimientos próximos
   - Flujo de caja (mensual/trimestral/anual)
   - Extractos por propietario

2. **Detección de anomalías**:
   - "La ocupación en Zona Norte cayó 15% este mes (promedio histórico: 3%)"
   - "El agente Carlos tiene 0 cierres en 30 días (promedio: 4)"
   - "Mora en Chapinero subió al 25% (promedio: 8%)"

3. **Forecasting**:
   - Proyección de ingresos próximos 3/6/12 meses
   - Predicción de vacancia por propiedad
   - Estimación de flujo de caja

4. **Q&A en lenguaje natural**:
   - "¿Cuál es nuestra tasa de cobro este mes?" → "92.3%, por encima del promedio de 89%"
   - "¿Qué agente tiene mejor conversión?" → "María López con 34% lead-to-contract"
   - "¿Cuántas propiedades vencen en los próximos 60 días?" → "12 propiedades, 8 con alta probabilidad de renovación"

**Output**:
```typescript
interface AnalyticsInsight {
  type: 'report' | 'anomaly' | 'forecast' | 'answer';
  title: string;
  summary: string;
  data: Record<string, unknown>;
  charts?: ChartData[];
  exportUrl?: string;         // PDF/Excel
  severity?: 'info' | 'warning' | 'critical';
  suggestedAction?: string;
}
```

**Autonomía**: Totalmente autónomo en generación. Alertas de anomalía enviadas automáticamente.

**Métricas**:
- Precisión de forecasts (MAE <10%)
- Anomalías detectadas que resultaron ser reales (precision >80%)
- Tiempo de generación de reportes
- Engagement con Q&A

**Impacto**: Decisiones basadas en datos sin necesidad de analista. Problemas detectados antes de que escalen.

---

### Agent 12: Pricing Dinámico (`pricing`)

**Descripción**: Agente que recomienda el canon óptimo para cada propiedad basándose en análisis de mercado, demanda y características del inmueble.

**Triggers**:
- Nueva propiedad publicada (sin precio o con precio estimado)
- Propiedad lleva >14 días sin aplicantes
- Renovación próxima (para calcular ajuste justo)
- Cambio significativo en mercado local
- Manual: Propietario pregunta "¿Cuánto debería cobrar?"

**Acciones**:

1. **Análisis de comparables**:
   - Busca propiedades similares en misma zona/estrato/tipología
   - Compara: área, habitaciones, amenities, antigüedad, piso
   - Pondera por proximidad geográfica y similitud

2. **Factores de ajuste**:
   - Ubicación exacta (cercanía a transporte, comercio, parques)
   - Amenities diferenciadores (gym, piscina, coworking)
   - Estado del inmueble (recién remodelado vs. sin mantenimiento)
   - Estacionalidad (demanda por época del año)
   - Demanda actual (búsquedas en la zona vs. oferta)

3. **Recomendación**:
   ```
   Canon mínimo:  $1.800.000 (precio piso — se arrienda rápido)
   Canon óptimo:  $2.100.000 (balance precio-tiempo)
   Canon máximo:  $2.400.000 (puede tardar más en arrendarse)
   ```
   - Explicación: "Propiedades similares en Chapinero se arriendan entre $1.9M y $2.3M. Tu propiedad tiene ventaja por el parqueadero (+$150K) pero desventaja por no tener ascensor (-$100K)."

4. **Monitoreo post-publicación**:
   - Si >14 días sin aplicantes → "Tu propiedad está 12% sobre el promedio de la zona. Sugerimos bajar a $1.950.000"
   - Si >5 aplicantes en 3 días → "Alta demanda. Podrías ajustar a $2.200.000"

5. **Cálculo de renovación**:
   - `IPC + ajuste mercado + factor inquilino`
   - Si mercado subió más que IPC → recomienda ajuste cercano al máximo legal
   - Si inquilino es A con pagos perfectos → recomienda ajuste moderado para retener

**Output**:
```typescript
interface PricingRecommendation {
  propertyId: string;
  recommendedRent: {
    minimum: number;
    optimal: number;
    maximum: number;
  };
  confidence: number;
  comparablesUsed: number;
  factors: {
    factor: string;
    impact: number;          // +/- COP
    explanation: string;
  }[];
  marketContext: {
    averageRentInZone: number;
    medianRentInZone: number;
    supplyDemandRatio: number;
    daysOnMarketAvg: number;
  };
  renewalSuggestion?: {
    currentRent: number;
    suggestedRent: number;
    increase: number;        // porcentaje
    justification: string;
  };
}
```

**Autonomía**: Solo informativo/sugerencia. Nunca cambia precios sin aprobación del propietario.

**Métricas**:
- Accuracy de predicción (precio sugerido vs. precio de cierre)
- Días en mercado de propiedades que siguieron la recomendación vs. las que no
- Tasa de adopción de sugerencias de precio

**Impacto**: Reduce vacancia por sobreprecios. Maximiza ingresos de propietarios. Propiedades se arriendan más rápido.

---

### Agent 13: Verificación de Inmuebles (`property-verification`)

**Descripción**: Agente que verifica la calidad y legitimidad de las publicaciones, combatiendo el fraude y mejorando la confianza del marketplace.

**Triggers**:
- Nueva propiedad publicada
- Reporte de usuario ("Esta publicación es falsa")
- Cron: Verificación periódica de listings activos (mensual)
- Propiedad con métricas sospechosas (muchas vistas, 0 aplicaciones)

**Acciones**:

1. **Análisis de fotos (Computer Vision)**:
   - Detecta fotos de stock / robadas de internet (reverse image search)
   - Detecta fotos de baja calidad / borrosas
   - Verifica consistencia: ¿exterior coincide con interior? ¿Cantidad de habitaciones coincide?
   - Detecta edición excesiva (HDR extremo, ángulos engañosos)

2. **Verificación de datos**:
   - Dirección existe y es residencial/comercial según tipo declarado
   - Estrato coincide con estrato real de la zona
   - Área declarada es plausible para el tipo/zona
   - Precio está dentro de rango razonable para la zona/estrato

3. **Detección de fraude**:
   - Mismo inmueble publicado por múltiples usuarios → alerta
   - Fotos de un inmueble usado en otro listing → alerta
   - Precio muy por debajo del mercado (>40% bajo) → posible scam
   - Usuario con múltiples publicaciones sospechosas

4. **Score de calidad del listing**:
   ```
   Completitud:  ✅ Título descriptivo
                 ✅ 10+ fotos
                 ✅ Descripción >100 caracteres
                 ❌ Sin plano / mapa
                 ❌ Sin video tour

   Calidad:      ⭐⭐⭐⭐☆ (4/5)

   Sugerencias:  "Agrega fotos del baño principal"
                 "Tu descripción no menciona los servicios incluidos"
                 "Agregar un video tour aumenta las aplicaciones en 40%"
   ```

5. **Badge de verificación**:
   - Propiedades que pasan todas las verificaciones → "Verificado por Leasefy" ✓
   - Badge visible en search results y detail page
   - Propiedades verificadas priorizadas en resultados de búsqueda

**Output**:
```typescript
interface PropertyVerification {
  propertyId: string;
  verificationStatus: 'verified' | 'needs_review' | 'suspicious' | 'rejected';
  qualityScore: number;       // 0-100
  photoAnalysis: {
    totalPhotos: number;
    qualityAvg: number;
    stockDetected: boolean;
    inconsistencies: string[];
  };
  dataVerification: {
    addressValid: boolean;
    stratumMatch: boolean;
    areaPlausible: boolean;
    pricePlausible: boolean;
  };
  fraudSignals: string[];
  suggestions: string[];
  badge: boolean;             // true si pasa todo
}
```

**Autonomía**:
- Análisis y scoring: Autónomo
- Badge de verificación: Autónomo si pasa todas las checks
- Reporte de fraude: Presenta evidencia a admin para decisión
- Bloqueo de publicación: Solo si señales de fraude son contundentes (>90% certeza)

**Métricas**:
- Tasa de fraude detectado
- Falsos positivos (<5%)
- Engagement con badge de verificación (CTR verificado vs. no)
- Completitud promedio de listings

**Impacto**: Confianza del marketplace. Reduce fraude. Mejora calidad de listings.

---

### Agent 14: Onboarding Inteligente (`onboarding`)

**Descripción**: Agente conversacional que guía a nuevos usuarios por el proceso de registro y configuración inicial, maximizando la conversión.

**Triggers**:
- Nuevo registro completado (post-auth)
- Abandono de onboarding (usuario cerró sin completar)
- Perfil incompleto después de 24h
- Usuario necesita ayuda durante onboarding

**Acciones**:

1. **Guía conversacional** (reemplaza wizard estático):
   ```
   Bot: "¡Bienvenido a Leasefy! ¿Estás buscando arrendar
        o tienes propiedades para arrendar?"

   → Inquilino:
   Bot: "Perfecto. Para encontrarte las mejores opciones,
        necesito conocerte un poco. ¿En qué ciudad buscas?"
   → "¿Cuál es tu presupuesto mensual?"
   → "¿Cuántas habitaciones necesitas?"
   → "¿Tienes mascotas?"
   → [Pre-llena formulario con respuestas]

   → Propietario:
   Bot: "¡Genial! Vamos a publicar tu primera propiedad.
        ¿Tienes fotos del inmueble listas?"
   → Guía paso a paso para crear listing

   → Agencia:
   Bot: "Bienvenida tu inmobiliaria. Configuremos tu
        cuenta. ¿Cuántas propiedades administras?"
   → Guía de configuración de agencia
   → Importación masiva (CSV/Excel)
   ```

2. **OCR de documentos**:
   - Para inquilinos: "Sube una foto de tu cédula y pre-llenamos tus datos"
   - Extrae: nombre, documento, fecha de nacimiento
   - Confirma con el usuario antes de guardar

3. **Recuperación de abandono**:
   - +2h sin completar: Push notification "Estás a un paso de encontrar tu hogar ideal"
   - +24h: Email con progreso "Completaste el 60% de tu perfil"
   - +72h: WhatsApp (si consintió) con incentivo "Completa tu perfil y recibe recomendaciones personalizadas"

4. **Checklist de completitud**:
   - Muestra barra de progreso
   - "Para recibir recomendaciones personalizadas, completa tu perfil (80%)"
   - "Para aplicar a propiedades, verifica tu identidad (95%)"
   - "¡Perfil completo! Ya puedes acceder a todas las funcionalidades"

**Output**:
```typescript
interface OnboardingProgress {
  userId: string;
  role: 'tenant' | 'landlord' | 'agency';
  completionPercentage: number;
  completedSteps: string[];
  pendingSteps: string[];
  abandonmentRisk: 'low' | 'medium' | 'high';
  lastActivityAt: Date;
  recoveryAttempts: number;
  convertedAt?: Date;
}
```

**Autonomía**: Totalmente autónomo en guía y recordatorios. Respeta opt-out.

**Métricas**:
- Tasa de completitud del onboarding (target: >80%)
- Tiempo promedio de onboarding (target: <5 min)
- Tasa de recuperación de abandono
- Drop-off por paso (identifica cuello de botella)

**Impacto**: Reduce abandono de onboarding del ~60% al ~20%. Primera experiencia memorable.

---

## CAPA 4 — Agentes Especializados

Diferenciadores competitivos. Funcionalidades que ningún competidor en LATAM ofrece.

---

### Agent 15: Asesor Legal (`legal-advisor`)

**Descripción**: Agente que proporciona orientación legal contextual sobre arrendamiento, genera documentos formales, y alerta sobre situaciones de riesgo legal.

**Triggers**:
- Usuario hace pregunta legal: "¿Puedo terminar el contrato antes de tiempo?"
- Evento que requiere orientación: mora >60 días, daños al inmueble, disputa
- Nuevo contrato en jurisdicción no familiar
- Cambio legislativo que afecta contratos vigentes

**Acciones**:

1. **Q&A Legal**:
   - "¿Cuánto preaviso debo dar para no renovar?" → "En Colombia, según la Ley 820 Art. 22, debe notificar con al menos 3 meses de antelación..."
   - "¿Puedo cobrar depósito?" → "En Colombia, los depósitos están prohibidos (Ley 820 Art. 16). Las garantías permitidas son póliza de arrendamiento o codeudor."
   - Adapta respuesta a la jurisdicción del usuario

2. **Alertas de riesgo legal**:
   - Mora >3 meses → "Considere iniciar proceso de restitución de inmueble"
   - Inquilino reporta daños graves → "Documente con fotos y notifique por escrito"
   - Contrato próximo a vencer sin acuerdo → "Tenga presente los plazos legales de preaviso"

3. **Generación de documentos legales**:
   - Carta de terminación anticipada
   - Requerimiento de pago extrajudicial
   - Carta de no renovación
   - Solicitud formal de reparaciones
   - Poder para representación (agencias)

4. **Base de conocimiento por jurisdicción**:
   | País | Ley principal | Temas cubiertos |
   |------|--------------|-----------------|
   | Colombia | Ley 820/2003 | Arrendamiento vivienda urbana |
   | Colombia | Ley 1480/2011 | Protección al consumidor |
   | México | Código Civil Federal | Arrendamiento |
   | Brasil | Lei 8.245/1991 | Lei do Inquilinato |
   | Chile | Ley 18.101 | Arrendamiento predios urbanos |
   | USA | State-specific | Landlord-tenant law |

**Output**:
```typescript
interface LegalGuidance {
  query: string;
  jurisdiction: string;
  response: string;
  legalBasis: {
    law: string;
    article: string;
    summary: string;
  }[];
  disclaimer: string;         // SIEMPRE presente
  suggestedAction?: string;
  generatedDocument?: {
    type: string;
    url: string;
  };
  riskLevel: 'info' | 'caution' | 'warning' | 'critical';
}
```

**Disclaimer obligatorio**: "Esta información es orientativa y no constituye asesoría legal profesional. Para situaciones complejas, consulte con un abogado especializado."

**Autonomía**: Informativo solamente. Nunca toma acciones legales autónomamente. Siempre recomienda abogado para casos complejos.

**Métricas**:
- Preguntas resueltas sin necesidad de abogado
- Satisfacción del usuario con la orientación
- Accuracy validada por abogados (auditoría periódica)

**Impacto**: Reduce consultas legales costosas. Empodera al usuario para tomar decisiones informadas. Reduce disputas por desconocimiento.

---

### Agent 16: Coordinación de Visitas (`visit-scheduler`)

**Descripción**: Agente que automatiza la coordinación de visitas a inmuebles, eliminando el ping-pong de mensajes entre candidatos, propietarios y agentes.

**Triggers**:
- Candidato solicita visita a una propiedad
- Múltiples solicitudes para la misma propiedad (→ open house)
- 24h antes de visita programada (→ recordatorio)
- Visita completada (→ follow-up)
- No-show detectado

**Acciones**:

1. **Propuesta de horarios**:
   - Lee disponibilidad del propietario/agente (AvailabilitySchedule de la propiedad)
   - Propone 3 opciones al candidato:
     "Tu visita al apartamento en Chapinero:
      ① Sábado 15 mar, 10:00 AM
      ② Domingo 16 mar, 2:00 PM
      ③ Lunes 17 mar, 6:00 PM"
   - Candidato selecciona → confirma a ambas partes

2. **Open house automático**:
   - Si >3 solicitudes para la misma propiedad en 48h
   - "Hay alto interés en esta propiedad. Organizaremos una jornada de puertas abiertas el sábado de 10AM a 12PM."
   - Notifica a todos los interesados

3. **Recordatorios**:
   - 24h antes: Push + email con dirección, instrucciones de llegada
   - 2h antes: Push "Tu visita es en 2 horas. ¿Confirmas asistencia?"
   - Si no confirma: notifica al propietario/agente para posible cancelación

4. **Post-visita**:
   - 2h después: "¿Qué te pareció el apartamento? ¿Te gustaría aplicar?"
   - Si interesado → link directo a aplicación
   - Si no → "¿Qué no te convenció? Tu feedback nos ayuda a mejorar las recomendaciones"
   - Registra feedback para mejorar matching

5. **Gestión de no-shows**:
   - Candidato no se presenta → registra no-show
   - Después de 2 no-shows → requiere confirmación adicional para próximas visitas
   - Notifica al propietario/agente que el slot quedó libre

**Output**:
```typescript
interface VisitCoordination {
  visitId: string;
  propertyId: string;
  candidateId: string;
  agentId?: string;
  proposedSlots: TimeSlot[];
  confirmedSlot?: TimeSlot;
  status: 'requested' | 'proposed' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
  isOpenHouse: boolean;
  attendeesCount?: number;
  postVisitFeedback?: {
    interested: boolean;
    rating: number;
    comments: string;
  };
  noShowCount: number;
}
```

**Autonomía**: Totalmente autónomo en coordinación y recordatorios.

**Integraciones necesarias**:
- Google Calendar API / iCal (para disponibilidad)
- Communication Agent (envío de confirmaciones)
- Maps API (instrucciones de llegada)

**Métricas**:
- Tasa de conversión visita → aplicación (target: >40%)
- Tasa de no-show (target: <10%)
- Tiempo de coordinación (target: <1h vs. actual 24-48h)
- NPS post-visita

**Impacto**: Elimina 3-5 mensajes de ida y vuelta para coordinar una visita → 0 mensajes. Mejor experiencia para todos.

---

### Agent 17: Fraude y Compliance (`fraud-compliance`)

**Descripción**: Agente que protege la plataforma contra fraude, suplantación, lavado de activos y otros riesgos, garantizando cumplimiento regulatorio.

**Triggers**:
- Nuevo registro (KYC)
- Documento subido (verificación)
- Transacción procesada (AML monitoring)
- Reporte de usuario
- Patrón sospechoso detectado

**Acciones**:

1. **KYC (Know Your Customer)**:
   - Verifica identidad contra documento de identidad
   - Verifica contra listas de sanciones (OFAC, ONU, UE)
   - Identifica PEPs (Personas Políticamente Expuestas)
   - Verifica que no esté en listados de fraude interno

2. **Detección de documentos falsificados**:
   - Análisis de metadata (fecha de creación, software de edición)
   - Consistencia visual (fuentes, alineación, resolución)
   - Cross-validation de datos entre documentos
   - "La cédula fue creada con Photoshop hace 2 horas" → ALERT

3. **Monitoreo de transacciones (AML)**:
   - Transacciones inusuales: monto muy por encima del patrón normal
   - Múltiples pagos pequeños (structuring)
   - Pagos desde jurisdicciones de alto riesgo
   - Cambios frecuentes de cuenta bancaria

4. **Detección de suplantación**:
   - Mismo documento con diferentes fotos
   - Múltiples cuentas desde misma IP/dispositivo
   - Cambios repentinos de datos personales
   - Patrones de login sospechosos

5. **Reportes regulatorios**:
   - Genera ROS (Reporte de Operación Sospechosa) para UIAF (Colombia)
   - FinCEN SAR (USA)
   - UIF (México)
   - COAF (Brasil)

**Output**:
```typescript
interface FraudAssessment {
  userId: string;
  riskScore: number;          // 0-100 (100 = máximo riesgo)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  signals: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string;
  }[];
  kycStatus: 'pending' | 'verified' | 'failed' | 'needs_review';
  sanctionsCheck: {
    ofac: boolean;
    un: boolean;
    eu: boolean;
    pep: boolean;
  };
  recommendedAction: 'allow' | 'monitor' | 'restrict' | 'block';
  regulatoryReport?: {
    type: 'ROS' | 'SAR';
    generatedAt: Date;
    submittedAt?: Date;
  };
}
```

**Autonomía**:
- KYC básico: Autónomo
- Bloqueo de cuenta: Autónomo si riesgo crítico (>90%)
- Reporte regulatorio: Genera borrador, requiere aprobación de compliance officer
- Restricción de transacciones: Autónomo si coincide con lista de sanciones

**Compliance**:
- SARLAFT (Colombia)
- Bank Secrecy Act / FinCEN (USA)
- LFPIORPI (México)
- Lei 9.613/1998 (Brasil)

**Métricas**:
- Fraudes detectados / prevenidos
- Falsos positivos (target: <10%)
- Tiempo de verificación KYC (target: <24h)
- Compliance con plazos de reporte regulatorio (100%)

**Impacto**: Protege la plataforma y a los usuarios. Cumplimiento regulatorio. Confianza del marketplace.

---

### Agent 18: Retención (`retention`)

**Descripción**: Agente que detecta señales tempranas de churn y ejecuta estrategias de retención personalizadas.

**Triggers**:
- Señal de churn detectada (modelo predictivo)
- NPS bajo o queja recurrente
- Contrato que no se renueva
- Propietario retira propiedades
- Agencia reduce actividad
- Inquilino busca activamente en otra plataforma (si detectable)

**Acciones**:

1. **Early warning detection**:
   | Señal | Riesgo | Acción |
   |-------|--------|--------|
   | Login frequency ↓50% en 30 días | Medium | Engagement email |
   | Propietario no responde hace 30 días | High | Llamada del account manager |
   | Inquilino con queja no resuelta >7 días | High | Priorizar resolución |
   | NPS <6 en última encuesta | High | Follow-up personalizado |
   | Agencia no genera cobros hace 2 meses | Critical | Reunión de retención |

2. **Acciones de retención personalizadas**:
   - Para inquilinos: "Sabemos que tu experiencia con [issue] no fue ideal. Hemos mejorado [X]. Como gesto, te ofrecemos [beneficio]."
   - Para propietarios: "Tu propiedad ha generado $X en 12 meses con Leasefy. Aquí tienes un resumen de valor que has recibido."
   - Para agencias: "Tu equipo ha cerrado N contratos y procesado $X este trimestre. Veamos cómo podemos optimizar tu operación."

3. **Encuestas de salida**:
   - Cuando usuario cancela suscripción o elimina cuenta → encuesta contextual
   - "¿Qué podríamos haber hecho mejor?"
   - Ofertas de retención de último momento (si aplica)

4. **Análisis de cohortes**:
   - Identifica patrones de churn por tipo de usuario, plan, región, antigüedad
   - "Usuarios que no completan onboarding en 48h tienen 3x más probabilidad de churn"
   - Informa a otros agentes: Onboarding Agent recibe insight para mejorar

**Output**:
```typescript
interface RetentionInsight {
  userId: string;
  churnProbability: number;   // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  signals: string[];
  suggestedAction: {
    type: 'email' | 'call' | 'offer' | 'prioritize_support';
    message: string;
    urgency: 'low' | 'medium' | 'high';
  };
  lifetimeValue: number;      // LTV del usuario
  cohortAnalysis: {
    segment: string;
    avgChurnRate: number;
    thisUserVsAvg: number;
  };
}
```

**Autonomía**:
- Detección: Autónomo
- Emails de engagement: Autónomo
- Ofertas con descuento: Requiere aprobación
- Llamadas: Crea ticket para humano

**Métricas**:
- Churn rate mensual (target: <5%)
- Tasa de recuperación de usuarios en riesgo
- Accuracy del modelo predictivo
- LTV promedio antes/después de implementar

**Impacto**: Reduce churn 20-30%. Aumenta LTV. Feedback loop para mejorar el producto.

---

## CAPA 5 — Agente Orquestador

El cerebro que coordina todos los agentes.

---

### Agent 19: Orquestador Central (`orchestrator`)

**Evolución del**: Beta AI Chat actual (SSE streaming + agent dispatch)

**Descripción**: Punto de entrada unificado para interacción con AI. Interpreta intención, despacha al agente correcto, mantiene contexto, y genera briefings diarios.

**Arquitectura**:
```
Usuario → Chat/Voz → Orchestrator
                        │
                        ├─ Intent Classification
                        │   "quiero arrendar en chapinero" → Matching Agent
                        │   "no me han pagado" → Collections Agent
                        │   "necesito reparar el baño" → Maintenance Agent
                        │
                        ├─ Agent Dispatch (SSE events)
                        │   agent_dispatch → agent_status → content_delta → message_complete
                        │
                        ├─ Decision Manager
                        │   Cuando un agente necesita aprobación humana:
                        │   → Presenta PendingDecision card al usuario
                        │   → Usuario selecciona opción
                        │   → Resultado enviado al agente
                        │
                        ├─ Context Manager
                        │   Mantiene historial conversacional
                        │   Cross-agent context sharing
                        │   Session persistence
                        │
                        └─ Briefing Generator
                            Daily digest personalizado por rol
```

**Briefings diarios**:

Para **Inquilino**:
```
Buenos días, María. Tu resumen de hoy:
📋 Tu pago de marzo vence en 3 días ($1.500.000)
🏠 3 nuevas propiedades que coinciden con tu búsqueda en Chapinero
📄 Tu evaluación de inquilino está lista — Score A (92/100)
```

Para **Propietario**:
```
Buenos días, Carlos. Tu resumen de hoy:
💰 El canon de marzo de tu apartamento en Rosales fue pagado ayer
👤 2 nuevas aplicaciones para tu estudio en Chapinero
📊 Tu tasa de ocupación: 100% (2/2 propiedades arrendadas)
```

Para **Agencia**:
```
Buenos días, equipo InmoGroup. Resumen del día:
💰 Cartera: $45.2M esperados, $38.1M cobrados (84.3%)
⚠️ 5 cobros en mora >15 días (ver detalle)
🔄 3 renovaciones próximas en los siguientes 30 días
👥 Pipeline: 12 leads activos, 4 con >80% probabilidad de cierre
🔧 2 solicitudes de mantenimiento pendientes (1 urgente: plomería en Cra 7)
📊 Agente del mes: María López — 6 cierres, $2.1M en comisiones
```

**Configuración por usuario**:
```typescript
interface OrchestratorConfig {
  // Nivel de autonomía por agente
  agentAutonomy: {
    [agentId: string]: 'auto' | 'ask_first' | 'manual';
  };
  // Preferencias de comunicación
  communicationTone: 'formal' | 'casual' | 'professional';
  language: 'es' | 'en' | 'pt';
  // Briefings
  briefingEnabled: boolean;
  briefingTime: string;       // "08:00"
  briefingChannel: 'push' | 'email' | 'whatsapp';
  // Umbrales
  thresholds: {
    moraTolerance: number;    // días de gracia
    maintenanceBudgetLimit: number;
    minCandidateScore: number;
    disbursementApprovalThreshold: number;
  };
}
```

**SSE Event Types** (ya definidos en Beta):
```typescript
type ChatStreamEvent =
  | { type: 'message_start'; messageId: string }
  | { type: 'content_delta'; delta: string }
  | { type: 'agent_dispatch'; agent: AgentType; task: string }
  | { type: 'agent_status'; agent: AgentType; status: string }
  | { type: 'decision'; decision: PendingDecision }
  | { type: 'message_complete' }
  | { type: 'error'; error: string }
```

**Métricas**:
- Tasa de resolución sin escalación humana (target: >70%)
- Tiempo de respuesta (target: <3s para primera respuesta)
- Satisfacción del usuario con AI (target: >4.5/5)
- Accuracy de intent classification (target: >95%)
- Engagement con briefings diarios

**Impacto**: La experiencia "la plataforma trabaja para mí". Un solo punto de entrada para todo. El diferenciador definitivo vs. competidores tradicionales.

---

## Priorización de Implementación

### Fase 1 — Fundación (ya tienen base, pasar de mock a real)

| # | Agente | Esfuerzo | Razón |
|---|--------|----------|-------|
| 19 | Orchestrator | Alto | Ya tienen SSE + Beta Chat. Es el frontend de todo. |
| 3 | Collections | Medio | Ya tienen cobrosApi + agent type. Mayor impacto en revenue. |
| 6 | Pipeline | Medio | Ya tienen pipelineApi + agent type. Impacto directo en conversión. |
| 1 | Scoring | Medio | Ya tienen Document Analysis + Risk Scoring. Solo orquestar. |

**Resultado**: Plataforma con AI funcional para el flujo core (buscar → aplicar → evaluar → cobrar).

### Fase 2 — Automatización operativa (alto ROI)

| # | Agente | Esfuerzo | Razón |
|---|--------|----------|-------|
| 4 | Contracts | Alto | Automatiza el paso que más fricción genera. |
| 5 | Disbursements | Medio | Ahorra días de trabajo contable mensual. |
| 8 | Renewals | Medio | Reduce vacancia y simplifica renovaciones. |
| 10 | Communication | Alto | Infraestructura multi-canal para todos los demás agentes. |

**Resultado**: Operación 80% automatizada. Agencias manejan 3x más propiedades con el mismo equipo.

### Fase 3 — Diferenciación (ventaja competitiva)

| # | Agente | Esfuerzo | Razón |
|---|--------|----------|-------|
| 12 | Pricing | Medio | Nadie en LATAM ofrece pricing dinámico para arriendos. |
| 16 | Visits | Bajo | Quick win. Elimina frustración de coordinación. |
| 14 | Onboarding | Medio | Mejora conversión de nuevos usuarios dramáticamente. |
| 9 | Documents | Medio | Cierra gaps en generación documental. |

**Resultado**: Features que ningún competidor tiene. Retención por valor único.

### Fase 4 — Escala y compliance (necesarios para expansión multi-país)

| # | Agente | Esfuerzo | Razón |
|---|--------|----------|-------|
| 15 | Legal | Alto | Necesario para operar en múltiples jurisdicciones. |
| 17 | Fraud/KYC | Alto | Obligatorio para compliance regulatorio. |
| 13 | Property Verification | Medio | Confianza del marketplace a escala. |
| 11 | Analytics | Medio | Decisiones basadas en datos para crecimiento. |

**Resultado**: Plataforma lista para operar en Colombia, México, Brasil, Chile, USA.

### Fase 5 — Optimización (cuando hay volumen)

| # | Agente | Esfuerzo | Razón |
|---|--------|----------|-------|
| 2 | Smart Matching | Medio | Necesita datos de conversiones para entrenar bien. |
| 7 | Maintenance | Medio | Necesita base de proveedores para funcionar. |
| 18 | Retention | Medio | Necesita volumen para modelos de churn. |

**Resultado**: Plataforma completamente autónoma. El equipo humano se enfoca en crecimiento, no en operación.

---

## Stack Tecnológico Recomendado

| Componente | Tecnología | Razón |
|------------|------------|-------|
| LLM Principal | Claude (Anthropic) | Mejor razonamiento, tool use nativo, streaming |
| LLM Rápido (clasificación) | Claude Haiku | Bajo costo para intent classification |
| Orquestación | LangGraph / Custom | Control fino sobre flujos multi-agente |
| Vector DB | Pinecone / Supabase pgvector | RAG para base de conocimiento legal |
| Event Bus | Redis Streams / BullMQ | Comunicación asíncrona entre agentes |
| Queue | BullMQ | Jobs diferidos (recordatorios, cron) |
| SSE/WebSocket | Ya implementado | Streaming de respuestas al frontend |
| OCR | Google Vision / AWS Textract | Extracción de documentos |
| WhatsApp | WhatsApp Business API | Canal de comunicación principal en LATAM |
| Email | SendGrid / AWS SES | Comunicaciones transaccionales |
| Push | Firebase (ya implementado) | Notificaciones móviles |
| Monitoring | LangSmith / LangFuse | Observabilidad de agentes |

---

## Resumen Ejecutivo

| Métrica | Actual | Con 19 Agentes |
|---------|--------|----------------|
| Tiempo de evaluación | 2-5 días | <5 minutos |
| Tiempo de generación de contrato | Horas | Segundos |
| Tasa de mora | 15-20% | <5% |
| Trabajo contable mensual | 2-3 días | 0 (automático) |
| Coordinación de visitas | 3-5 mensajes | 0 mensajes |
| Tiempo búsqueda → contrato | 30-60 días | 7-14 días |
| Propiedades por agente | 20-30 | 80-100 |
| Abandono de onboarding | ~60% | ~20% |
| Churn mensual | ~10% | <5% |

**19 agentes. 5 fases. 1 plataforma verdaderamente AI-first.**
