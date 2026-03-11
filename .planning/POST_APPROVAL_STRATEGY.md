# Estrategia Post-Aprobación y Pricing

## Resumen Ejecutivo

Este documento define el flujo completo desde que un propietario aprueba a un candidato hasta que el arrendatario paga su primera renta, incluyendo la estrategia de pricing y sistema de membresías.

---

## 1. Flujo Post-Aprobación Completo

### Timeline Visual

```
Propietario aprueba candidato
         ↓
    [PASO 1: CONTRATO]
    Generación de contrato digital
         ↓
    [PASO 2: FIRMAS]
    Propietario firma → Arrendatario firma
         ↓
    [PASO 3: PÓLIZA] (Opcional Premium)
    Arrendatario adquiere póliza de arrendamiento
         ↓
    [PASO 4: DEPÓSITO]
    Arrendatario paga depósito de seguridad
         ↓
    [PASO 5: ACTIVACIÓN]
    Contrato activo → Entrega de llaves
         ↓
    [PASO 6: PAGOS RECURRENTES]
    Arrendatario paga renta mensual
```

---

## 2. Detalle de Cada Paso

### PASO 1: Generación de Contrato

**Trigger**: Propietario hace clic en "Aprobar Candidato"

**Acciones del Sistema**:
1. Generar contrato usando plantilla estándar colombiana
2. Auto-llenar datos:
   - Datos del propietario (de su perfil)
   - Datos del arrendatario (de su aplicación)
   - Datos de la propiedad (dirección, características)
   - Términos: valor renta, depósito, duración, fecha inicio
3. Incluir cláusulas legales colombianas obligatorias
4. Adjuntar anexos (inventario, reglamento copropiedad si aplica)

**Tecnología**:
- Templates en PDF con campos dinámicos
- Similar a Deel: preview HTML → PDF final firmado

**UI Propietario**:
```
+------------------------------------------+
|  ✓ Candidato Aprobado                    |
|                                          |
|  El siguiente paso es firmar el          |
|  contrato de arrendamiento.              |
|                                          |
|  [Revisar y Firmar Contrato]             |
+------------------------------------------+
```

---

### PASO 2: Firma Digital (Estilo Deel)

**Flujo de Firmas** (Secuencial):

```
1. PROPIETARIO
   ┌─────────────────────────────────┐
   │ Revisar Contrato                │
   │ ─────────────────               │
   │ [Previsualización del contrato] │
   │                                 │
   │ Confirma tu firma:              │
   │ ┌─────────────────────────────┐ │
   │ │ Juan Carlos Pérez           │ │
   │ └─────────────────────────────┘ │
   │                                 │
   │ [Aceptar y Firmar]              │
   └─────────────────────────────────┘

2. SISTEMA envía email al arrendatario:
   "Tu contrato está listo para firmar"
   [Revisar y Firmar] (botón en email)

3. ARRENDATARIO
   ┌─────────────────────────────────┐
   │ Contrato de Arrendamiento       │
   │ Propiedad: Apto 301, Chapinero  │
   │ ─────────────────               │
   │ [Vista previa del contrato]     │
   │                                 │
   │ Confirma tu firma:              │
   │ ┌─────────────────────────────┐ │
   │ │ María García López          │ │
   │ └─────────────────────────────┘ │
   │                                 │
   │ ☑ He leído y acepto los        │
   │   términos del contrato        │
   │                                 │
   │ [Aceptar y Firmar]              │
   └─────────────────────────────────┘
```

**Validez Legal en Colombia**:
- Ley 527 de 1999 (Comercio Electrónico)
- Firma electrónica tiene misma validez que firma manuscrita
- Audit trail: IP, timestamp, email verificado

**Después de ambas firmas**:
- PDF final generado con ambas firmas
- Enviado a ambas partes por email
- Almacenado en la plataforma

---

### PASO 3: Póliza de Arrendamiento (Opcional/Premium)

**¿Qué es?**
Póliza que protege al propietario contra:
- Impago de canon
- Daños a la propiedad
- Servicios públicos impagos
- Gastos legales de desahucio

**Modelo de Negocio**:
| Opción | Costo | Quién Paga | Cobertura |
|--------|-------|------------|-----------|
| Sin póliza | $0 | - | Solo depósito |
| Póliza Básica | ~3-5% renta anual | Arrendatario | 6 meses impago |
| Póliza Premium | ~8-12% renta anual | Arrendatario | 12 meses + daños |

**Integración**:
- Partner con aseguradora (Sura, Seguros Bolívar, Liberty)
- O crear producto propio con respaldo financiero

**Flujo UI**:
```
+------------------------------------------+
|  Protege tu arrendamiento                |
|                                          |
|  ○ Sin póliza (solo depósito)            |
|    Depósito: $7,500,000 (3 meses)        |
|                                          |
|  ● Póliza Arrienda Seguro               |
|    Cobertura: 12 meses de renta          |
|    + Daños hasta $5,000,000              |
|    Costo: $180,000/mes                   |
|    (Se suma al canon mensual)            |
|                                          |
|  [Continuar]                             |
+------------------------------------------+
```

**Valor Diferenciador**:
- Elimina necesidad de codeudor/fiador
- El 40% de arrendatarios en Colombia NO tienen fiador
- Esto abre mercado enorme (millennials, migrantes, freelancers)

---

### PASO 4: Pago de Depósito

**Estándar Colombia**: 1-3 meses de depósito

**Métodos de Pago Aceptados**:

| Método | Fee | Tiempo | Quién Paga Fee |
|--------|-----|--------|----------------|
| PSE (Transferencia) | $0 | Inmediato | Nadie |
| Tarjeta Débito | 1.5% | Inmediato | Arrendatario |
| Tarjeta Crédito | 3.5% | Inmediato | Arrendatario |
| Nequi/Daviplata | $0 | Inmediato | Nadie |
| Efectivo (Efecty/Baloto) | $3,000 fijo | 24-48h | Arrendatario |

**UI Arrendatario**:
```
+------------------------------------------+
|  Pago de Depósito de Seguridad           |
|                                          |
|  Monto: $5,000,000 (2 meses)             |
|                                          |
|  Selecciona método de pago:              |
|                                          |
|  ┌────────────────────────────────────┐  |
|  │ 🏦 PSE - Transferencia bancaria   │  |
|  │    Sin costo adicional             │  |
|  └────────────────────────────────────┘  |
|                                          |
|  ┌────────────────────────────────────┐  |
|  │ 💳 Tarjeta de crédito/débito      │  |
|  │    + 3.5% ($175,000)               │  |
|  └────────────────────────────────────┘  |
|                                          |
|  ┌────────────────────────────────────┐  |
|  │ 📱 Nequi / Daviplata              │  |
|  │    Sin costo adicional             │  |
|  └────────────────────────────────────┘  |
|                                          |
+------------------------------------------+
```

**Manejo del Depósito**:
- Fondos en cuenta de la plataforma (escrow)
- O transferencia directa al propietario
- Devolución automática al finalizar contrato (menos deducciones)

---

### PASO 5: Activación del Contrato

**Condiciones para Activar**:
- ✓ Contrato firmado por ambas partes
- ✓ Depósito recibido
- ✓ Póliza activada (si aplica)
- ✓ Primera renta prorrateada pagada (si aplica)

**UI Propietario** (Dashboard actualizado):
```
+------------------------------------------+
|  🎉 ¡Contrato Activo!                    |
|                                          |
|  Propiedad: Apartamento 301, Chapinero   |
|  Arrendatario: María García              |
|  Inicio: 1 de Febrero, 2025              |
|  Canon: $2,500,000/mes                   |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │ Depósito recibido    $5,000,000 │    |
|  │ Próximo pago         1 Mar 2025 │    |
|  └──────────────────────────────────┘    |
|                                          |
|  [Descargar Contrato PDF]                |
|  [Coordinar Entrega de Llaves]           |
+------------------------------------------+
```

**UI Arrendatario** (Dashboard):
```
+------------------------------------------+
|  🏠 Mi Arrendamiento                     |
|                                          |
|  Apartamento 301, Chapinero Alto         |
|  Propietario: Juan Carlos Pérez          |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │ Estado         Activo ✓          │    |
|  │ Canon mensual  $2,500,000        │    |
|  │ Próximo pago   1 Mar 2025        │    |
|  │ Método         PSE automático    │    |
|  └──────────────────────────────────┘    |
|                                          |
|  [Pagar Ahora]  [Configurar Autopago]    |
|  [Ver Contrato] [Reportar Problema]      |
+------------------------------------------+
```

---

### PASO 6: Pagos Recurrentes de Renta

**Opciones de Pago**:

1. **Pago Manual**: Arrendatario paga cada mes manualmente
2. **Autopago**: Débito automático en fecha acordada
3. **Recordatorios**: Notificaciones 5, 3 y 1 día antes

**Flujo de Pago**:
```
Arrendatario paga
       ↓
Plataforma recibe fondos
       ↓
Fee de plataforma deducido (si aplica)
       ↓
Transferencia a propietario
       ↓
Recibo generado automáticamente
       ↓
Notificación a ambas partes
```

**Tiempos de Desembolso al Propietario**:
| Plan | Tiempo |
|------|--------|
| Free | 5-7 días hábiles |
| Pro | 2-3 días hábiles |
| Premium | 24 horas (siguiente día hábil) |

**Gestión de Mora**:
- Día 1-5: Recordatorios amigables
- Día 6-15: Alerta al propietario, cargo por mora (si está en contrato)
- Día 16+: Proceso formal, notificación de incumplimiento

---

## 3. Vistas por Usuario

### Vista Propietario - Dashboard Post-Contrato

```
+----------------------------------------------------------+
|  🏠 Mis Propiedades                                       |
|                                                          |
|  ┌────────────────────────────────────────────────────┐  |
|  │ Apartamento 301, Chapinero                         │  |
|  │ ────────────────────────────────────               │  |
|  │ Estado: Arrendado ✓                                │  |
|  │ Arrendatario: María García                         │  |
|  │ Canon: $2,500,000/mes                              │  |
|  │                                                    │  |
|  │ Próximo Pago                                       │  |
|  │ ┌────────────────────────────────────────────┐    │  |
|  │ │ 📅 1 de Marzo, 2025                        │    │  |
|  │ │ 💰 $2,500,000                              │    │  |
|  │ │ Estado: Pendiente                          │    │  |
|  │ └────────────────────────────────────────────┘    │  |
|  │                                                    │  |
|  │ Historial de Pagos                                │  |
|  │ ┌────────────────────────────────────────────┐    │  |
|  │ │ ✓ Feb 2025  $2,500,000  Pagado 01/02       │    │  |
|  │ │ ✓ Depósito  $5,000,000  Pagado 28/01       │    │  |
|  │ └────────────────────────────────────────────┘    │  |
|  │                                                    │  |
|  │ [Ver Contrato] [Historial Completo] [Contactar]   │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+
```

### Vista Arrendatario - Dashboard Post-Contrato

```
+----------------------------------------------------------+
|  🏠 Mi Hogar                                              |
|                                                          |
|  Apartamento 301, Calle 85 #15-30                        |
|  Chapinero Alto, Bogotá                                  |
|                                                          |
|  ┌────────────────────────────────────────────────────┐  |
|  │ Próximo Pago                                       │  |
|  │ ────────────────────────────────────               │  |
|  │                                                    │  |
|  │      $2,500,000                                    │  |
|  │      Vence: 1 de Marzo, 2025                       │  |
|  │      Quedan 12 días                                │  |
|  │                                                    │  |
|  │      [Pagar Ahora]                                 │  |
|  │                                                    │  |
|  │ ○ Autopago activo (PSE - Bancolombia ****4521)    │  |
|  │   Se debitará automáticamente el 1 de marzo       │  |
|  │   [Cambiar método]                                 │  |
|  └────────────────────────────────────────────────────┘  |
|                                                          |
|  ┌────────────────────────────────────────────────────┐  |
|  │ Acciones Rápidas                                   │  |
|  │                                                    │  |
|  │ 📄 Ver mi contrato                                │  |
|  │ 🔧 Reportar un problema                           │  |
|  │ 💬 Contactar propietario                          │  |
|  │ 📊 Historial de pagos                             │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+
```

---

## 4. Estrategia de Pricing

### Modelo Recomendado: Freemium + Transaccional

Basado en la investigación de TurboTenant, Zillow y Aptuno:

### Para Propietarios

| Plan | Precio | Características |
|------|--------|-----------------|
| **Free** | $0/mes | 1 propiedad, scoring IA básico, cobro de renta (PSE gratis), contrato estándar |
| **Pro** | $49,900/mes | Hasta 3 propiedades, scoring IA completo, contratos personalizables, desembolso 2 días |
| **Business** | $149,900/mes | Propiedades ilimitadas, múltiples usuarios, API, desembolso 24h, soporte prioritario |

**Descuento Anual**: 20% (2 meses gratis)
- Pro Anual: $479,000/año (vs $598,800 mensual)
- Business Anual: $1,439,000/año (vs $1,798,800 mensual)

### Ingresos Transaccionales

| Servicio | Costo | Quién Paga |
|----------|-------|------------|
| Verificación de antecedentes | $35,000 | Arrendatario |
| Tarjeta crédito/débito | 3.5% | Arrendatario |
| Póliza de arrendamiento | 5-10% renta anual | Arrendatario |
| Contrato notariado (opcional) | $150,000 | Cualquiera |

### Para Arrendatarios

| Servicio | Costo |
|----------|-------|
| Aplicar a propiedades | **Gratis** |
| Verificación de antecedentes | $35,000 (una vez, válido 30 días) |
| Pago con PSE/Nequi | **Gratis** |
| Pago con tarjeta | 3.5% |
| Póliza de arrendamiento | Variable |

---

## 5. Sistema de Membresías y Cupones

### Tipos de Cupones

```typescript
type CouponType =
  | 'PERCENTAGE'    // 50% de descuento
  | 'FIXED_AMOUNT'  // $50,000 de descuento
  | 'FREE_MONTHS'   // 3 meses gratis
  | 'FULL_ACCESS';  // 100% gratis (trial extendido)

interface Coupon {
  code: string;           // "BIENVENIDO100"
  type: CouponType;
  value: number;          // 100 para 100%, 50000 para $50,000
  maxRedemptions?: number;
  expiresAt?: Date;
  restrictions: {
    newUsersOnly: boolean;
    minPlan?: 'pro' | 'business';
    maxMonths?: number;   // Máximo meses que aplica
  };
}
```

### Cupones Predefinidos

| Código | Tipo | Valor | Uso |
|--------|------|-------|-----|
| `BIENVENIDO100` | FULL_ACCESS | 100% | 1 mes gratis para nuevos usuarios |
| `ANUAL20` | PERCENTAGE | 20% | Descuento plan anual |
| `REFERIDO50` | FIXED_AMOUNT | $50,000 | Referido por usuario existente |
| `BETA2025` | FREE_MONTHS | 3 meses | Early adopters beta |
| `INVERSOR100` | FULL_ACCESS | 100% | 6 meses gratis para inversionistas/partners |

### Flujo de Canje

```
+------------------------------------------+
|  Selecciona tu plan                      |
|                                          |
|  ● Pro - $49,900/mes                     |
|  ○ Business - $149,900/mes               |
|                                          |
|  ¿Tienes un código de descuento?         |
|  ┌─────────────────────────────────────┐ |
|  │ BETA2025                            │ |
|  └─────────────────────────────────────┘ |
|  [Aplicar]                               |
|                                          |
|  ┌─────────────────────────────────────┐ |
|  │ ✓ ¡Código aplicado!                 │ |
|  │   3 meses gratis de Pro             │ |
|  │   Después: $49,900/mes              │ |
|  └─────────────────────────────────────┘ |
|                                          |
|  [Continuar - $0 hoy]                    |
+------------------------------------------+
```

### Lógica de Negocio para Cupones 100%

```typescript
// Cuando un usuario aplica cupón 100%
async function applyFullAccessCoupon(userId: string, couponCode: string) {
  const coupon = await validateCoupon(couponCode);

  if (coupon.type === 'FULL_ACCESS') {
    // Crear suscripción sin cobro
    await createSubscription({
      userId,
      plan: 'pro', // o el plan que especifique el cupón
      status: 'trial',
      trialEndsAt: addMonths(new Date(), coupon.restrictions.maxMonths || 1),
      paymentMethodRequired: false, // No pedir tarjeta
      couponApplied: couponCode,
    });

    // Marcar cupón como usado
    await redeemCoupon(couponCode, userId);

    // Enviar email de bienvenida
    await sendWelcomeEmail(userId, {
      planName: 'Pro',
      freeMonths: coupon.restrictions.maxMonths,
      renewalDate: addMonths(new Date(), coupon.restrictions.maxMonths),
    });
  }
}
```

### Notificaciones de Expiración

```
Día -7:  "Tu prueba gratuita termina en 7 días"
Día -3:  "Tu prueba gratuita termina en 3 días - Agrega método de pago"
Día -1:  "Último día de tu prueba gratuita"
Día 0:   "Tu prueba terminó - Suscríbete para continuar"
Día +3:  "Te extrañamos - 50% descuento primer mes"
```

---

## 6. Integración con Pasarela de Pagos

### Recomendación: Wompi (PayU Colombia)

**Por qué Wompi:**
- Enfocado en Colombia
- PSE, tarjetas, Nequi, Daviplata, Efecty
- APIs modernas
- Comisiones competitivas

**Alternativas:**
- Stripe (si se expande a LATAM)
- MercadoPago
- PayU directo

### Estructura de Datos para Pagos

```typescript
interface RentPayment {
  id: string;
  leaseId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;

  amount: number;              // Monto base de renta
  platformFee: number;         // Fee de Arrienda Seguro
  processingFee: number;       // Fee de pasarela (si tarjeta)
  totalCharged: number;        // Total cobrado al arrendatario
  landlordPayout: number;      // Monto a transferir al propietario

  dueDate: Date;
  paidAt?: Date;

  paymentMethod: 'pse' | 'card' | 'nequi' | 'daviplata' | 'cash';
  paymentReference: string;    // ID de transacción en pasarela

  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  receiptUrl?: string;         // URL del recibo PDF
}
```

---

## 7. Roadmap de Implementación

### Fase 1: MVP Contratos (2-3 semanas)
- [ ] Template de contrato colombiano
- [ ] Flujo de firma digital (propietario → arrendatario)
- [ ] Generación de PDF firmado
- [ ] Estado de contrato en dashboard

### Fase 2: Pagos Básicos (2-3 semanas)
- [ ] Integración Wompi/PSE
- [ ] Pago de depósito
- [ ] Pago de renta mensual
- [ ] Recibos automáticos

### Fase 3: Suscripciones Propietarios (1-2 semanas)
- [ ] Planes Free/Pro/Business
- [ ] Billing mensual/anual
- [ ] Sistema de cupones
- [ ] Dashboard de suscripción

### Fase 4: Póliza de Arrendamiento (3-4 semanas)
- [ ] Integración con aseguradora partner
- [ ] Cotizador de póliza
- [ ] Flujo de adquisición
- [ ] Gestión de siniestros

### Fase 5: Automatización (2 semanas)
- [ ] Autopago configurable
- [ ] Recordatorios automáticos
- [ ] Desembolso automático a propietarios
- [ ] Reportes de mora

---

## 8. Métricas Clave a Trackear

| Métrica | Objetivo |
|---------|----------|
| Conversion rate (aprobado → contrato firmado) | >80% |
| Time to signature | <48 horas |
| Adopción de póliza | >30% |
| % pagos a tiempo | >95% |
| Churn rate propietarios | <5% mensual |
| NPS | >50 |
| Revenue per property | >$50,000/mes |

---

## Resumen Ejecutivo para Inversionistas

**Modelo de Monetización:**
1. **SaaS**: Suscripciones propietarios ($50K-$150K/mes)
2. **Transaccional**: Verificaciones ($35K), Processing fees (3.5%)
3. **Seguros**: Comisión por pólizas (15-20% de prima)
4. **Financiero**: Float de depósitos (intereses)

**Ventaja Competitiva:**
- Scoring IA que elimina necesidad de codeudor
- Póliza que protege sin fiador
- UX moderna vs portales legacy (Metrocuadrado, Fincaraiz)
- Automatización completa del ciclo de arrendamiento

**TAM Colombia:**
- 5.5M hogares en arriendo
- Canon promedio: $1.5M/mes
- Oportunidad: $99B COP/año en rentas
