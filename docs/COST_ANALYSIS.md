# Leasefy — Análisis de Costos, Revenue y Factibilidad

> Modelo financiero basado en implementación real de agentes AI y research de mercado.
> Última actualización: Marzo 2026

---

## 1. Resumen Ejecutivo

Leasefy opera agentes AI con costo marginal de **$168 COP ($0.04 USD) por evaluación**. El mercado colombiano de inmobiliarias medianas genera 3-5 colocaciones/mes por agencia (validado por research). Con un modelo de 3 tiers — Starter (pago por consulta a $10 USD), Pro (suscripción flat + 50% descuento), Flex (1% del canon administrado + todo ilimitado) — y 50 agencias activas, Leasefy genera entre **$29M-58M COP/mes ($7K-14K USD)** con costos operativos de **~$5.3M COP ($1,260 USD)**. Break-even: **3 agencias**.

---

## 2. Datos de Mercado Validados

### Colocaciones reales por tamaño de inmobiliaria (Colombia)

Fuente: Research propio basado en datos de FEDELONJAS, DANE, Coninsa, Century 21 Colombia, Metrocuadrado.

Fórmula: **Portafolio × Rotación anual (25-35%) / 12 = arriendos nuevos/mes**

| Tamaño | Agentes | Portafolio | Rotación | **Colocaciones/mes** | **Evaluaciones/mes** |
|--------|---------|------------|----------|---------------------|---------------------|
| Pequeña | 1-5 | 10-50 | ~30% | **1-2** | **2-3** |
| **Mediana** | 5-20 | 50-200 | ~30% | **3-5** | **4-7** |
| Grande | 20-50 | 200-500 | ~30% | **5-12** | **7-15** |
| Enterprise | 50+ | 500-5,000+ | ~30% | **12-50+** | **15-60+** |

> **Ratio evaluaciones/colocaciones: ~1.3x** — no todos los candidatos evaluados terminan arrendando.

### Referencia: Precios de screening en USA

| Servicio | Precio por screening |
|----------|---------------------|
| TransUnion SmartMove | $25-40 USD |
| RentPrep | $21-38 USD |
| Buildium (incluido en plan) | $15-25 USD |
| TurboTenant | $55 USD (pagado por inquilino) |
| **Promedio USA** | **~$30 USD** |

> Leasefy cobra **$10 USD por evaluación en Starter** — competitivo para LATAM, con margen del 99.6%.

### Canon de arriendo promedio en Colombia

| Ciudad | Canon promedio (estrato 3-4) | Canon promedio (estrato 5-6) |
|--------|------------------------------|------------------------------|
| Bogotá | $1,500,000 - $2,500,000 COP | $3,000,000 - $6,000,000 COP |
| Medellín | $1,200,000 - $2,000,000 COP | $2,500,000 - $5,000,000 COP |
| Cali | $1,000,000 - $1,800,000 COP | $2,000,000 - $4,000,000 COP |
| Barranquilla | $900,000 - $1,500,000 COP | $1,800,000 - $3,500,000 COP |
| **Promedio nacional (estratos mixtos)** | **$2,000,000 COP (~$476 USD)** | |

### Honorarios de administración de inmobiliarias

| Tipo | % del canon | Sobre canon de $2M COP |
|------|-------------|----------------------|
| Solo administración | 8% | $160,000 COP/unidad/mes |
| Administración + cobranza | 10% | $200,000 COP/unidad/mes |
| Full service | 12% | $240,000 COP/unidad/mes |
| **Promedio** | **10%** | **$200,000 COP/unidad/mes** |

---

## 3. Costos de AI por Ejecución

### Tenant Scoring: $168 COP ($0.04 USD)

| Paso | Tipo | Costo |
|------|------|-------|
| Fetch datos (PostgreSQL) | Determinista | $0 |
| OCR documentos (Claude Vision × 2) | **LLM** | $126 COP |
| Validación cruzada | Determinista | $0 |
| Cálculo de score | Determinista | $0 |
| Explicación en lenguaje natural | **LLM** | $42 COP |
| Guardar resultado | Determinista | $0 |
| **Total** | | **$168 COP ($0.04 USD)** |

### Smart Matching: $0 COP

100% determinístico. Resultados mostrados en plataforma.

### 19 agentes futuros: ~$219 USD/mes a 50 agencias

11 deterministas ($0), 4 LLM ligero (~$42 COP), 4 LLM pesado (~$150 COP).

---

## 4. Estructura de Planes

### Los 3 Tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│  STARTER (Gratis)                                                   │
│  ├── $0 COP/mes de suscripción                                     │
│  ├── Evaluaciones: $42,000 COP ($10 USD) por consulta              │
│  ├── Agentes AI: Solo Scoring (pago por uso)                       │
│  ├── Sin matching, sin reportes, sin cobranza                      │
│  └── Objetivo: prueba → enganche → upgrade                        │
├─────────────────────────────────────────────────────────────────────┤
│  PRO ($149,000 COP/mes — ~$35 USD)                                 │
│  ├── Evaluaciones: 50% descuento → $21,000 COP ($5 USD) c/u       │
│  ├── Límite: 30 evaluaciones/mes                                   │
│  ├── Agentes: Scoring + Matching + Reportes                        │
│  ├── Dashboard completo                                            │
│  └── Objetivo: inmobiliarias pequeñas-medianas                     │
├─────────────────────────────────────────────────────────────────────┤
│  FLEX (1% del canon total administrado)                             │
│  ├── Evaluaciones: ILIMITADAS y GRATIS                             │
│  ├── TODOS los 19 agentes AI incluidos                             │
│  ├── Sin límites en nada                                           │
│  ├── Soporte prioritario                                           │
│  └── Objetivo: lock-in total, toda la operación en Leasefy        │
└─────────────────────────────────────────────────────────────────────┘
```

### Economía de cada tier para Leasefy

**Starter — Margen por consulta**

| Métrica | Valor |
|---------|-------|
| Precio por evaluación | $42,000 COP ($10 USD) |
| Costo AI | $168 COP ($0.04 USD) |
| **Margen por consulta** | **$41,832 COP (99.6%)** |

**Pro — Margen por suscripción**

| Métrica | Valor |
|---------|-------|
| Suscripción mensual | $149,000 COP ($35 USD) |
| Costo AI absorbido (agencia hace ~6 evals/mes) | $1,008 COP ($0.24 USD) |
| Ingreso por evals con 50% dcto (~6 × $21,000) | $126,000 COP ($30 USD) |
| **Ingreso total por agencia Pro** | **$275,000 COP ($65 USD)** |
| **Costo AI por agencia Pro** | **$1,008 COP ($0.24 USD)** |

**Flex — Margen por % del canon**

| Métrica | Agencia 100 unidades | Agencia 200 unidades |
|---------|---------------------|---------------------|
| Canon total administrado | $200M COP | $400M COP |
| Leasefy cobra (1% del canon) | **$2,000,000 COP ($476 USD)** | **$4,000,000 COP ($952 USD)** |
| Costo AI (15 evals/mes ilimitadas) | $2,520 COP ($0.60 USD) | $5,040 COP ($1.20 USD) |
| **Margen** | **99.87%** | **99.87%** |

> **¿Por qué 1% del canon y no 10% del fee?** Mismo dinero, diferente percepción. "1% del arriendo" suena razonable. "10% de mis honorarios" suena agresivo.

### Incentivo de conversión entre tiers

| Situación | Starter | Pro | Flex |
|-----------|---------|-----|------|
| Agencia con 50 unidades, 4 evals/mes | $168,000 COP ($40) | $233,000 COP ($55) | $1,000,000 COP ($238) |
| Agencia con 100 unidades, 7 evals/mes | $294,000 COP ($70) | $296,000 COP ($70) | $2,000,000 COP ($476) |
| Agencia con 200 unidades, 10 evals/mes | $420,000 COP ($100) | $359,000 COP ($85) | $4,000,000 COP ($952) |

**Punto de inflexión Starter → Pro**: ~7 evaluaciones/mes ($42K × 7 = $294K > $149K suscripción + descuento)

**¿Por qué alguien pagaría Flex?** No por las evaluaciones — por los **19 agentes AI**. Cobranza automática, contratos, renovaciones, mantenimiento, pipeline, matching. Todo ilimitado. Para una agencia de 200 unidades, pagar $4M COP/mes ($952 USD) por automatizar toda su operación es una fracción de lo que le costaría contratar 2-3 empleados adicionales ($6-9M COP/mes).

---

## 5. Escenarios de Revenue (50 agencias)

### Distribución estimada por tier

| Escenario | Starter | Pro | Flex | Total |
|-----------|---------|-----|------|-------|
| **Conservador** (producto nuevo) | 30 | 15 | 5 | 50 |
| **Moderado** (6 meses madurez) | 15 | 25 | 10 | 50 |
| **Agresivo** (19 agentes activos) | 5 | 20 | 25 | 50 |

### Perfil promedio por tier

| Tier | Portafolio promedio | Canon promedio | Evals/mes | Colocaciones/mes |
|------|--------------------|--------------:|----------:|-----------------:|
| Starter | 30 unidades | $2M COP | 3 | 2 |
| Pro | 80 unidades | $2M COP | 6 | 4 |
| Flex | 200 unidades | $2.5M COP | 12 | 8 |

---

### Escenario Conservador: 30 Starter + 15 Pro + 5 Flex

| Concepto | Cálculo | Mensual |
|----------|---------|---------|
| **INGRESOS** | | |
| Starter: evaluaciones | 30 agencias × 3 evals × $42,000 | $3,780,000 COP ($900 USD) |
| Pro: suscripciones | 15 × $149,000 | $2,235,000 COP ($532 USD) |
| Pro: evaluaciones (50% dcto) | 15 × 6 evals × $21,000 | $1,890,000 COP ($450 USD) |
| Flex: 1% del canon | 5 × 200 unidades × $2.5M × 1% | $25,000,000 COP ($5,952 USD) |
| Colocaciones (todas las agencias) | (30×2 + 15×4 + 5×8) × $42,000 | $7,560,000 COP ($1,800 USD) |
| **TOTAL INGRESOS** | | **$40,465,000 COP ($9,635 USD)** |
| | | |
| **COSTOS** | | |
| AI — Starter (90 evals × $168) | | -$15,120 COP ($3.60 USD) |
| AI — Pro (90 evals × $168) | | -$15,120 COP ($3.60 USD) |
| AI — Flex (60 evals × $168) | | -$10,080 COP ($2.40 USD) |
| AI — Matching (240 evals × $0) | | $0 |
| Infraestructura | | -$274,050 COP ($65 USD) |
| Operativo (soporte, legal, contabilidad) | | -$2,130,000 COP ($507 USD) |
| Marketing | | -$2,100,000 COP ($500 USD) |
| Procesamiento pagos (~3.5%) | | -$1,416,275 COP ($337 USD) |
| **TOTAL COSTOS** | | **-$5,960,645 COP ($1,419 USD)** |
| | | |
| **MARGEN BRUTO** | | **$34,504,355 COP ($8,215 USD)** |
| **Margen %** | | **85.3%** |

**Revenue anual conservador**: **$485M COP (~$115K USD)**

---

### Escenario Moderado: 15 Starter + 25 Pro + 10 Flex

| Concepto | Cálculo | Mensual |
|----------|---------|---------|
| **INGRESOS** | | |
| Starter: evaluaciones | 15 × 3 × $42,000 | $1,890,000 COP ($450 USD) |
| Pro: suscripciones | 25 × $149,000 | $3,725,000 COP ($887 USD) |
| Pro: evaluaciones (50% dcto) | 25 × 6 × $21,000 | $3,150,000 COP ($750 USD) |
| Flex: 1% del canon | 10 × 200 × $2.5M × 1% | $50,000,000 COP ($11,905 USD) |
| Colocaciones | (15×2 + 25×4 + 10×8) × $42,000 | $9,660,000 COP ($2,300 USD) |
| **TOTAL INGRESOS** | | **$68,425,000 COP ($16,292 USD)** |
| | | |
| **COSTOS** | | |
| AI total (285 evals × $168) | | -$47,880 COP ($11.40 USD) |
| Infraestructura | | -$274,050 COP ($65 USD) |
| Operativo | | -$2,630,000 COP ($626 USD) |
| Marketing | | -$2,100,000 COP ($500 USD) |
| Procesamiento pagos (~3.5%) | | -$2,394,875 COP ($570 USD) |
| **TOTAL COSTOS** | | **-$7,446,805 COP ($1,773 USD)** |
| | | |
| **MARGEN BRUTO** | | **$60,978,195 COP ($14,519 USD)** |
| **Margen %** | | **89.1%** |

**Revenue anual moderado**: **$821M COP (~$195K USD)**

---

### Escenario Agresivo: 5 Starter + 20 Pro + 25 Flex

| Concepto | Cálculo | Mensual |
|----------|---------|---------|
| **INGRESOS** | | |
| Starter: evaluaciones | 5 × 3 × $42,000 | $630,000 COP ($150 USD) |
| Pro: suscripciones | 20 × $149,000 | $2,980,000 COP ($710 USD) |
| Pro: evaluaciones (50% dcto) | 20 × 6 × $21,000 | $2,520,000 COP ($600 USD) |
| Flex: 1% del canon | 25 × 200 × $2.5M × 1% | $125,000,000 COP ($29,762 USD) |
| Colocaciones | (5×2 + 20×4 + 25×8) × $42,000 | $12,600,000 COP ($3,000 USD) |
| **TOTAL INGRESOS** | | **$143,730,000 COP ($34,221 USD)** |
| | | |
| **COSTOS** | | |
| AI total (435 evals × $168) | | -$73,080 COP ($17.40 USD) |
| Infraestructura | | -$374,050 COP ($89 USD) |
| Operativo | | -$4,230,000 COP ($1,007 USD) |
| Marketing | | -$2,100,000 COP ($500 USD) |
| Procesamiento pagos (~3.5%) | | -$5,030,550 COP ($1,198 USD) |
| **TOTAL COSTOS** | | **-$11,807,680 COP ($2,811 USD)** |
| | | |
| **MARGEN BRUTO** | | **$131,922,320 COP ($31,410 USD)** |
| **Margen %** | | **91.8%** |

**Revenue anual agresivo**: **$1,725M COP (~$411K USD)**

---

## 6. Dónde Está el Dinero Real

### Composición del revenue por fuente (Escenario Moderado)

| Fuente | Mensual | % del total |
|--------|---------|-------------|
| **Flex (1% del canon)** | $50,000,000 COP ($11,905 USD) | **73.1%** |
| Colocaciones (todos los planes) | $9,660,000 COP ($2,300 USD) | 14.1% |
| Pro suscripciones | $3,725,000 COP ($887 USD) | 5.4% |
| Pro evaluaciones | $3,150,000 COP ($750 USD) | 4.6% |
| Starter evaluaciones | $1,890,000 COP ($450 USD) | 2.8% |
| **Total** | **$68,425,000 COP ($16,292 USD)** | **100%** |

> **El 73% del revenue viene de Flex**. El modelo de 1% del canon es el motor principal del negocio. Starter y Pro son la puerta de entrada; Flex es donde se genera el valor real.

### Costo AI como % del revenue

| Escenario | Revenue mensual | Costo AI mensual | **AI como % del revenue** |
|-----------|----------------|-----------------|--------------------------|
| Conservador | $40.5M COP | $40,320 COP | **0.10%** |
| Moderado | $68.4M COP | $47,880 COP | **0.07%** |
| Agresivo | $143.7M COP | $73,080 COP | **0.05%** |

> **El costo de AI es irrelevante** — nunca supera el 0.1% del revenue. La decisión de absorber las evaluaciones en Flex no tiene impacto financiero significativo.

---

## 7. Punto de Equilibrio

### Costos fijos mínimos (lanzamiento, sin empleados)

| Concepto | Mensual |
|----------|---------|
| Infraestructura (Neon + Inngest + Vercel) | $274,050 COP ($65 USD) |
| Legal + contabilidad (amortizado) | $630,000 COP ($150 USD) |
| Marketing básico | $1,050,000 COP ($250 USD) |
| **Total costos fijos** | **$1,954,050 COP (~$465 USD)** |

### Break-even por tipo de agencia

| Tipo de agencia | Revenue por agencia/mes | Break-even |
|-----------------|------------------------|------------|
| 1 agencia Flex (200 unidades) | $5,336,000 COP ($1,270 USD) | **1 agencia Flex** |
| Solo agencias Pro | $275,000 COP ($65 USD) | **8 agencias Pro** |
| Solo agencias Starter | $126,000 COP ($30 USD) | **16 agencias Starter** |
| Mix: 1 Flex + 2 Pro + 5 Starter | $6,516,000 COP ($1,551 USD) | **Día 1** |

> **Con 1 sola agencia Flex (200 unidades), Leasefy ya cubre todos sus costos fijos.**

---

## 8. Escalabilidad: 19 Agentes

### ¿Por qué Flex necesita 19 agentes para justificar el 1%?

Una agencia de 200 unidades paga $4M COP/mes ($952 USD) en Flex. ¿Qué recibe?

| Agente | Valor para la agencia | Ahorro estimado |
|--------|----------------------|-----------------|
| Tenant Scoring | Evaluaciones en 3 min vs 2-3 días | 1 empleado parcial |
| Smart Matching | Reduce vacancia, más colocaciones | +2-3 arriendos/mes |
| Collections (Cobranza) | Recordatorios automáticos, reduce mora | -30% en mora |
| Contracts | Contratos digitales, firma electrónica | 1 empleado parcial |
| Renewals | Renovaciones proactivas, retención | -20% rotación |
| Maintenance | Coordinación de reparaciones | Tiempo del equipo |
| Pipeline | Seguimiento automático de leads | +10% conversión |
| Documents | Generación automática de docs | Tiempo del equipo |
| Analytics | Reportes en tiempo real | Visibilidad |
| **Total ahorro estimado** | | **$6-10M COP/mes** |

> La agencia paga $4M COP y ahorra $6-10M COP. **ROI de 1.5-2.5x**. Eso justifica el 1% del canon.

### Costo incremental de 19 agentes

| Métrica | 2 agentes (hoy) | 19 agentes (futuro) | Diferencia |
|---------|-----------------|--------------------:|------------|
| Costo AI (50 agencias) | $48K COP ($11 USD) | $918K COP ($219 USD) | +$208 USD |
| Como % del revenue moderado | 0.07% | 1.34% | Negligible |

---

## 9. Optimizaciones de Costo

| Optimización | Ahorro mensual | Prioridad |
|-------------|----------------|-----------|
| Cache OCR (30% evals repetidas) | ~$14,400 COP ($3.40 USD) | Alta |
| Claude Haiku para explicaciones | ~$11,200 COP ($2.67 USD) | Alta |
| Modelo híbrido Sonnet+Haiku | Reduce eval de $168 a $131 COP | Alta |
| PostgreSQL self-hosted (200+ agencias) | ~$29,400 COP ($7 USD) | Baja |

> Las optimizaciones son útiles pero no urgentes — el costo de AI ya es < 0.1% del revenue.

---

## 10. Proyección a 12 Meses

| Mes | Agencias | Mix (S/P/F) | Revenue/mes | Costos/mes | **Utilidad/mes** |
|-----|----------|-------------|-------------|------------|-----------------|
| 1-2 | 8 | 5/2/1 | $5,558,000 COP ($1,323) | $2,148,050 COP ($511) | **$3,409,950 COP ($812)** |
| 3-4 | 20 | 10/7/3 | $19,887,000 COP ($4,735) | $3,650,050 COP ($869) | **$16,236,950 COP ($3,866)** |
| 5-6 | 35 | 15/13/7 | $44,023,000 COP ($10,482) | $5,260,050 COP ($1,252) | **$38,762,950 COP ($9,229)** |
| 7-9 | 50 | 15/25/10 | $68,425,000 COP ($16,292) | $7,446,805 COP ($1,773) | **$60,978,195 COP ($14,519)** |
| 10-12 | 70 | 15/30/25 | $157,145,000 COP ($37,415) | $12,250,000 COP ($2,917) | **$144,895,000 COP ($34,499)** |

### Acumulado Año 1

| Métrica | Valor |
|---------|-------|
| Revenue total | **~$780M COP (~$186K USD)** |
| Costos totales | **~$78M COP (~$18.6K USD)** |
| **Utilidad neta** | **~$702M COP (~$167K USD)** |
| **Margen neto** | **~90%** |
| Costo AI total del año | **~$500K COP (~$119 USD)** |

---

## 11. Escenarios de Expansión Internacional

### Contexto por mercado

| Mercado | Canon promedio/mes | Moneda | En USD | Fee inmobiliaria | Leasefy Flex (1%) |
|---------|-------------------|--------|--------|-----------------|-------------------|
| **Colombia** | $2,000,000 COP | COP | $476 USD | 8-12% | $20,000 COP ($4.76 USD)/unidad |
| **México** | $15,000 MXN | MXN | $750 USD | 8-10% | $150 MXN ($7.50 USD)/unidad |
| **Chile** | $450,000 CLP | CLP | $450 USD | 5-8% | $4,500 CLP ($4.50 USD)/unidad |
| **Argentina** | $350,000 ARS | ARS | $350 USD | 5-8% | $3,500 ARS ($3.50 USD)/unidad |
| **Brasil** | R$2,500 | BRL | $500 USD | 8-10% | R$25 ($5.00 USD)/unidad |
| **USA** | $1,800 USD | USD | $1,800 USD | 8-10% | **$18 USD/unidad** |

> **USA es 3-4x más valioso por unidad** que LATAM. Una agencia de 200 unidades en USA genera $3,600 USD/mes para Leasefy vs $952 USD en Colombia.

### Pricing adaptado por mercado

| Tier | Colombia | Resto LATAM | USA |
|------|----------|-------------|-----|
| **Starter** (por eval) | $42,000 COP ($10 USD) | $10-12 USD equiv. | **$25 USD** |
| **Pro** (suscripción) | $149,000 COP ($35 USD) | $35-45 USD equiv. | **$99 USD/mes** |
| **Flex** (% del canon) | 1% del canon | 1% del canon | **1% del canon** |

> El Flex a 1% funciona igual en todos los mercados — se ajusta automáticamente al nivel de precios local.

### Evaluaciones: pricing por mercado

| Mercado | Starter (por eval) | Pro (50% dcto) | Competidores |
|---------|-------------------|----------------|--------------|
| Colombia | $10 USD | $5 USD | No hay comparable |
| México | $12 USD | $6 USD | Inmuebles24: no ofrece |
| Chile | $10 USD | $5 USD | Houm: incluido en servicio |
| USA | **$25 USD** | **$12.50 USD** | TransUnion $30, RentPrep $21 |

> En USA, $25/eval es **competitivo** contra $30-55 de los incumbentes, y nuestro costo es el mismo: $0.04 USD.

---

### Escenario Internacional: 100 Colombia + 100 LATAM + 20 USA = 220 agencias

#### Distribución por tier y mercado

| Mercado | Agencias | Starter | Pro | Flex | Portafolio prom. Flex |
|---------|----------|---------|-----|------|----------------------|
| Colombia | 100 | 25 | 45 | 30 | 180 unidades |
| Resto LATAM | 100 | 30 | 45 | 25 | 150 unidades |
| USA | 20 | 3 | 7 | 10 | 250 unidades |
| **Total** | **220** | **58** | **97** | **65** | |

#### Revenue Colombia (100 agencias)

| Fuente | Cálculo | Mensual USD |
|--------|---------|-------------|
| Starter evals | 25 × 3 evals × $10 | $750 |
| Pro suscripciones | 45 × $35 | $1,575 |
| Pro evals (50% dcto) | 45 × 6 × $5 | $1,350 |
| Flex (1% canon) | 30 × 180 unidades × $476 canon × 1% | **$25,704** |
| Colocaciones | (25×2 + 45×4 + 30×8) × $10 | $4,700 |
| **Total Colombia** | | **$34,079 USD/mes** |

#### Revenue Resto LATAM (100 agencias)

| Fuente | Cálculo | Mensual USD |
|--------|---------|-------------|
| Starter evals | 30 × 3 × $11 (promedio) | $990 |
| Pro suscripciones | 45 × $40 (promedio) | $1,800 |
| Pro evals (50% dcto) | 45 × 6 × $5.50 | $1,485 |
| Flex (1% canon) | 25 × 150 unidades × $550 canon prom × 1% | **$20,625** |
| Colocaciones | (30×2 + 45×4 + 25×8) × $10 | $4,400 |
| **Total LATAM** | | **$29,300 USD/mes** |

#### Revenue USA (20 agencias)

| Fuente | Cálculo | Mensual USD |
|--------|---------|-------------|
| Starter evals | 3 × 5 evals × $25 | $375 |
| Pro suscripciones | 7 × $99 | $693 |
| Pro evals (50% dcto) | 7 × 8 × $12.50 | $700 |
| Flex (1% canon) | 10 × 250 unidades × $1,800 canon × 1% | **$45,000** |
| Colocaciones | (3×3 + 7×6 + 10×12) × $15 | $2,565 |
| **Total USA** | | **$49,333 USD/mes** |

> **20 agencias en USA generan más que 100 en Colombia.** El canon 3-4x mayor hace que Flex a 1% sea extremadamente rentable.

#### Revenue Total Consolidado (220 agencias)

| Mercado | Agencias | Revenue/mes | % del total |
|---------|----------|-------------|-------------|
| Colombia | 100 | $34,079 USD | 30.2% |
| Resto LATAM | 100 | $29,300 USD | 26.0% |
| USA | 20 | $49,333 USD | **43.8%** |
| **TOTAL** | **220** | **$112,712 USD/mes** | **100%** |

**Revenue anual: $1,352,544 USD (~$1.35M USD)**

#### Costos a escala internacional

| Concepto | Mensual USD | % del revenue |
|----------|-------------|---------------|
| AI (Claude API) — 220 agencias, ~1,300 evals/mes | $52 USD | 0.05% |
| Infraestructura (DB, hosting, Inngest — escalada) | $350 USD | 0.31% |
| Equipo (4-6 personas: dev, soporte, ops) | $12,000 USD | 10.6% |
| Marketing (3 mercados) | $5,000 USD | 4.4% |
| Legal (3 jurisdicciones) | $2,000 USD | 1.8% |
| Procesamiento pagos (~3.5%) | $3,945 USD | 3.5% |
| Compliance (GDPR equiv, habeas data Colombia) | $500 USD | 0.4% |
| **TOTAL COSTOS** | **$23,847 USD** | **21.2%** |

| Métrica | Valor |
|---------|-------|
| **Revenue mensual** | **$112,712 USD** |
| **Costos mensuales** | **$23,847 USD** |
| **Utilidad mensual** | **$88,865 USD** |
| **Margen neto** | **78.8%** |
| **Revenue anual** | **$1,352,544 USD** |
| **Utilidad anual** | **$1,066,380 USD** |

---

### Escenario Hipercrecimiento: 200 COL + 200 LATAM + 100 USA = 500 agencias

| Mercado | Agencias | Mix (S/P/F) | Revenue/mes |
|---------|----------|-------------|-------------|
| Colombia | 200 | 40/80/80 | $80,000 USD |
| Resto LATAM | 200 | 50/90/60 | $65,000 USD |
| USA | 100 | 10/30/60 | **$285,000 USD** |
| **TOTAL** | **500** | | **$430,000 USD/mes** |

| Métrica | Valor |
|---------|-------|
| **Revenue anual** | **$5,160,000 USD** |
| Costos anuales (equipo 12-15 personas + infra + legal) | ~$960,000 USD |
| **Utilidad anual** | **~$4,200,000 USD** |
| **Margen** | **~81%** |
| Costo AI del año | **~$2,500 USD** (sí, dos mil quinientos) |

> **A 500 agencias, el negocio genera $5.2M USD/año con $4.2M de utilidad.** El costo de AI para el año entero ($2,500 USD) es lo que cuesta un vuelo Bogotá-Miami.

---

### Comparación: Valor por agencia Flex por mercado

| Mercado | Portafolio típico Flex | Canon promedio | Leasefy cobra/mes | Costo AI/mes | **Margen por agencia** |
|---------|----------------------|----------------|-------------------|-------------|----------------------|
| Colombia | 180 unidades | $476 USD | $857 USD | $0.60 USD | **99.93%** |
| México | 150 unidades | $750 USD | $1,125 USD | $0.50 USD | **99.96%** |
| Chile | 150 unidades | $450 USD | $675 USD | $0.50 USD | **99.93%** |
| USA | 250 unidades | $1,800 USD | **$4,500 USD** | $1.00 USD | **99.98%** |

> **Una sola agencia Flex en USA genera $4,500 USD/mes** con $1 USD de costo AI. El modelo escala de forma obscena.

---

---

### OBJETIVO A 12 MESES: 0.5% del mercado = 1,525 agencias

#### TAM (Total Addressable Market)

| Mercado | Agencias que administran renta | Fuente |
|---------|-------------------------------|--------|
| USA | 245,000 - 335,000 | IBISWorld, NARPM |
| Brasil | 25,000 - 35,000 | COFECI |
| Argentina | 12,000 - 15,000 | SRT, Cámara Inmobiliaria |
| Colombia | 10,000 - 12,000 | CCB, FEDELONJAS |
| México | 8,000 - 15,000 | DENUE, AMPI |
| Chile | 3,000 - 5,000 | Estimación |
| Perú + Ecuador | 1,300 - 2,500 | Estimación |
| **Total** | **~305,000 - 420,000** | |

> **85% no usa software especializado.** Mercado altamente fragmentado — ningún top 10 controla más del 5-8%.

**0.5% = ~1,525 agencias**

#### Distribución objetivo (Mes 12)

| Mercado | Agencias | Mix (S/P/F) | % del mercado local |
|---------|----------|-------------|-------------------|
| Colombia | 150 | 30/60/60 | 1.3% de ~12,000 |
| Resto LATAM | 150 | 35/60/55 | 0.3% de ~50,000 |
| USA | 1,225 | 184/490/551 | 0.4% de ~290,000 |
| **Total** | **1,525** | **249/610/666** | **0.5% del total** |

#### Revenue mensual por mercado (Mes 12)

**Colombia (150 agencias)**

| Fuente | Cálculo | Mensual |
|--------|---------|---------|
| Starter evals | 30 × 4 evals × $10 | $1,200 USD |
| Pro suscripciones | 60 × $35 | $2,100 USD |
| Pro evals (50% dcto) | 60 × 6 × $5 | $1,800 USD |
| Flex (1% canon) | 60 × 180 uds × $476 × 1% | $51,408 USD |
| Colocaciones | (30×2 + 60×4 + 60×8) × $10 | $7,800 USD |
| **Subtotal Colombia** | | **$64,308 USD** |

**Resto LATAM (150 agencias)**

| Fuente | Cálculo | Mensual |
|--------|---------|---------|
| Starter evals | 35 × 4 × $11 | $1,540 USD |
| Pro suscripciones | 60 × $40 | $2,400 USD |
| Pro evals (50% dcto) | 60 × 6 × $5.50 | $1,980 USD |
| Flex (1% canon) | 55 × 160 uds × $530 × 1% | $46,640 USD |
| Colocaciones | (35×2 + 60×4 + 55×8) × $10 | $7,500 USD |
| **Subtotal LATAM** | | **$60,060 USD** |

**USA (1,225 agencias)**

| Fuente | Cálculo | Mensual |
|--------|---------|---------|
| Starter evals | 184 × 6 × $25 | $27,600 USD |
| Pro suscripciones | 490 × $99 | $48,510 USD |
| Pro evals (50% dcto) | 490 × 8 × $12.50 | $49,000 USD |
| Flex (1% canon) | 551 × 250 uds × $1,800 × 1% | $2,479,500 USD |
| Colocaciones | (184×3 + 490×6 + 551×12) × $15 | $143,700 USD |
| **Subtotal USA** | | **$2,748,310 USD** |

#### Revenue Consolidado (Mes 12 — 1,525 agencias)

| Mercado | Agencias | Revenue/mes | % del total |
|---------|----------|-------------|-------------|
| Colombia | 150 | $64,308 USD | 2.2% |
| Resto LATAM | 150 | $60,060 USD | 2.1% |
| USA | 1,225 | $2,748,310 USD | **95.7%** |
| **TOTAL** | **1,525** | **$2,872,678 USD/mes** | **100%** |

**Revenue anual: $34,472,136 USD (~$34.5M USD)**

> **USA es el 95.7% del revenue.** 551 agencias Flex en USA a 1% del canon generan $2.48M USD/mes. El canon promedio de $1,800 USD/mes hace que cada unidad administrada valga $18 USD/mes para Leasefy.

#### Costos a escala 1,525 agencias

| Concepto | Mensual | Anual | % del revenue |
|----------|---------|-------|---------------|
| **Equipo** (30-40 personas: engineering, sales, ops, soporte) | $150,000 USD | $1,800,000 USD | 5.2% |
| **Marketing** (3 mercados, growth team) | $50,000 USD | $600,000 USD | 1.7% |
| **AI (Claude API)** — ~15,000 evals/mes | $600 USD | **$7,200 USD** | **0.02%** |
| **Infraestructura** (DB, hosting, CDN) | $5,000 USD | $60,000 USD | 0.2% |
| **Legal/compliance** (5+ jurisdicciones) | $15,000 USD | $180,000 USD | 0.5% |
| **Procesamiento pagos** (~3.5%) | $100,544 USD | $1,206,525 USD | 3.5% |
| **Oficinas** (Bogotá + remoto) | $5,000 USD | $60,000 USD | 0.2% |
| **TOTAL COSTOS** | **$326,144 USD** | **$3,913,725 USD** | **11.3%** |

#### P&L Año 1 objetivo (0.5% del mercado)

| Métrica | Valor |
|---------|-------|
| **Revenue anual** | **$34,472,136 USD** |
| **Costos anuales** | **$3,913,725 USD** |
| **EBITDA** | **$30,558,411 USD** |
| **Margen EBITDA** | **88.6%** |
| Costo AI del año | $7,200 USD |
| AI como % del revenue | 0.02% |

#### Composición del revenue anual

| Fuente | Anual | % |
|--------|-------|---|
| **Flex (1% del canon)** | $30,930,576 USD | **89.7%** |
| Pro (suscripciones + evals) | $1,269,480 USD | 3.7% |
| Colocaciones | $1,908,000 USD | 5.5% |
| Starter (evals) | $364,080 USD | 1.1% |
| **Total** | **$34,472,136 USD** | **100%** |

> **El 89.7% del revenue viene de Flex.** El negocio de Leasefy ES el Flex. Starter y Pro son el funnel de adquisición; las colocaciones son un bonus. El verdadero producto es: "Dame el 1% de lo que administras y te automatizo toda la operación con 19 agentes AI."

#### Roadmap trimestral hacia 0.5%

| Trimestre | Mercado | Acción | Agencias acum. | Revenue/mes |
|-----------|---------|--------|----------------|-------------|
| **Q1** | Colombia | MVP: Starter + Pro. Primeros 50 clientes | 50 | $16K USD |
| **Q2** | Colombia | Activar Flex. Escalar a 100. Lanzar 6 agentes | 150 | $64K USD |
| **Q3** | +LATAM | Entry en México y Chile. Adaptar plataforma | 300 | $124K USD |
| **Q4** | +USA | Entry agresivo en USA. Equipo de sales dedicado | 1,525 | **$2,873K USD** |

> **Q4 es donde explota**: USA entry con Flex a 1% del canon de $1,800 USD/mes. Cada agencia Flex en USA vale $4,500 USD/mes para Leasefy. El Q4 requiere inversión agresiva en sales para USA ($50-100K en hiring + marketing).

#### ¿Es realista 1,225 agencias en USA en un trimestre?

No si empezamos de cero. El roadmap realista para USA:

| Mes | Agencias USA | Cómo |
|-----|-------------|------|
| Mes 9 | 5 | Beta privada con 5 PM companies |
| Mes 10 | 20 | Referrals + content marketing |
| Mes 11 | 80 | Inside sales team (3-5 reps) |
| Mes 12 | 200 | Partnerships con software PM existente |
| Mes 15 | 500 | Channel partners + integrations |
| Mes 18 | 1,225 | Full scale |

**Realista ajustado**: el 0.5% del mercado total se alcanza entre **mes 15-18**, no mes 12. El primer año termina con ~500-700 agencias y ~$800K-1.2M USD/mes de revenue.

#### Primer año realista ajustado

| Métrica | Mes 12 realista | Mes 18 (0.5%) |
|---------|----------------|---------------|
| Agencias totales | ~500-700 | ~1,525 |
| Revenue/mes | $800K-1.2M USD | $2.87M USD |
| Revenue anual (run rate) | $9.6M-14.4M USD | $34.5M USD |
| EBITDA/mes | $600K-900K USD | $2.55M USD |

> **Mes 12 realista: ~$10-14M USD ARR.** Mes 18 con 0.5%: **~$34.5M USD ARR.** Ambos números son fundables — un seed de $1-2M USD para financiar los primeros 12 meses tiene sentido con estos unit economics.

---

## 12. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Agencias subreportan canon en Flex | Media | Alto | Integrar con software de administración, verificar contra consignaciones |
| Baja adopción de Flex | Media | Alto | Lanzar con Starter+Pro primero, Flex cuando haya 6+ agentes |
| Competidor con pricing más bajo | Baja | Medio | Los 19 agentes integrados son un moat difícil de replicar |
| Aumento de precios de Claude API | Baja | Bajo | AI es < 0.1% del revenue, absorber aumentos de 10x sin impacto |
| Churn alto en Starter | Alta | Bajo | Starter es funnel, no revenue driver |

---

## 12. Conclusión

### El modelo funciona por 3 razones

**1. El costo de AI es irrelevante**
$168 COP por evaluación. $48,000 COP/mes por 50 agencias. Menos de $12 USD. No mueve la aguja en ningún escenario.

**2. Flex a 1% del canon es el motor**
73% del revenue viene de Flex. Una agencia de 200 unidades paga $4M COP/mes y recibe valor de $6-10M COP/mes. El ROI se vende solo — cuando los 19 agentes estén listos.

**3. Los tiers crean un flywheel natural**
```
Starter (gratis, $10/eval)
  → Prueba el scoring, ve el valor
  → Hace >7 evals/mes, le sale más barato Pro
    ↓
Pro ($35/mes, evals a mitad de precio)
  → Usa Scoring + Matching + Reportes
  → Quiere cobranza, contratos, renovaciones
    ↓
Flex (1% del canon, todo ilimitado)
  → Toda la operación en Leasefy
  → Imposible salir = retención 95%+
```

### El número que importa

> **0.5% del mercado = 1,525 agencias = $34.5M USD/año con 89% de margen.** El costo de AI para operar 19 agentes para 1,525 agencias durante un año entero es **$7,200 USD** — lo que cuesta un MacBook. El negocio no es de AI. El negocio es de plataforma. La AI es el diferenciador que cuesta casi nada.

### Para inversores

> Leasefy ataca un mercado de 305,000+ agencias con un modelo de revenue recurrente (1% del canon administrado) que genera **$18 USD/mes por cada unidad administrada en USA**. Con 0.5% del mercado, el ARR es de **$34.5M USD** con márgenes EBITDA de **89%**. El costo de la tecnología AI que diferencia el producto es **$7,200 USD/año** — 0.02% del revenue. El moat son 19 agentes AI integrados que automatizan toda la operación de la inmobiliaria, creando lock-in del 95%+. Break-even con 3 agencias.

---

*Modelo basado en: implementación real de agentes (Mastra + Claude API), research de mercado validado (FEDELONJAS, DANE, Century 21, Coninsa), pricing de competidores USA (TransUnion, RentPrep), y estructura de honorarios de inmobiliarias colombianas. Marzo 2026.*
